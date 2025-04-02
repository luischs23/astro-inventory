'use client'

import "../../styles/global.css";
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { collection, getDocs, doc, deleteDoc, Timestamp, FieldValue, getDoc, query, setDoc, serverTimestamp, getFirestore} from 'firebase/firestore'
import { ref, deleteObject, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage'
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/Select"
import { Card, CardContent } from "../../components/ui/Card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/DropdownMenu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../../components/ui/AlertDialog"
import { Pencil, MoreHorizontal, FileDown, Trash2, PlusIcon, ArrowLeft, Filter, SortDesc, Menu, Loader2, Download} from 'lucide-react'
import { toast } from "../../components/ui/UseToast"
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import 'jspdf-autotable';
import { Switch } from "../../components/ui/Switch"
import { Skeleton } from '../ui/Skeleton'
import { InvoiceSkeleton } from '../skeletons/InvoiceSkeleton'
import FloatingScrollButton from '../ui/FloatingScrollButton'
import { withPermission } from "../../components/WithPermission";
import { getApp, getApps, initializeApp } from "firebase/app";

interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  }  

interface SizeInput {
  quantity: number
  barcodes: string[]
}

interface Product {
  id: string
  brand: string
  reference: string
  color: string
  gender: 'Dama' | 'Hombre' | 'Niño'
  sizes: { [key: string]: SizeInput }
  imageUrl: string
  total: number
  total2: number
  baseprice: number
  saleprice: number
  createdAt: number | Timestamp | FieldValue
  comments: string
  exhibition: { [store: string]: string }
  warehouseId: string
  isBox: boolean
  barcode: string
}

interface Template {
  id: string
  name: string
  content: string
}

interface ParesInventoryProps {
  companyId?: string
  warehouseId?: string
}

// Props completas que incluye hasPermission (para el componente interno)
interface ParesInventoryComponentProps extends ParesInventoryProps {
  firebaseConfig: FirebaseConfig;
  hasPermission?: (action: string) => boolean;
}

// Componente base
const ParesInventoryBase: React.FC<ParesInventoryComponentProps> = ({ firebaseConfig, companyId, warehouseId, hasPermission }) => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [genderFilter, setGenderFilter] = useState<"all" | "Dama" | "Hombre" | "Niño">("all")
  const [sortOrder, setSortOrder] = useState<"entry" | "alphabetical">("entry")
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [warehouseName, setWarehouseName] = useState<string>("")
  const [showBox, setshowBox] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([])
  const [, setIsHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [transferConfirmation, setTransferConfirmation] = useState<{
    product: Product
    targetWarehouseId: string
  } | null>(null)
  const [isTransferring, setIsTransferring] = useState(false)
  const [, setSelectedImage] = useState<string | null>(null)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [isTemplateSelectOpen, setIsTemplateSelectOpen] = useState(false)
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number | null>(null)
  const [productToShare, setProductToShare] = useState<Product | null>(null)

  if (!getApps().length) {
        initializeApp(firebaseConfig);
      }
      const app = getApp();
      const db = getFirestore(app);
      const storage = getStorage(app);
  
  useEffect(() => {
    const controlHeader = () => {
      if (typeof window !== "undefined") {
        const currentScrollY = window.scrollY
        if (currentScrollY < lastScrollY) {
          // Scrolling up
          setIsHeaderVisible(true)
        } else if (currentScrollY > 100 && currentScrollY > lastScrollY) {
          // Scrolling down and past the 100px mark
          setIsHeaderVisible(false)
        }
        setLastScrollY(currentScrollY)
      }
    }

    window.addEventListener("scroll", controlHeader)

    return () => {
      window.removeEventListener("scroll", controlHeader)
    }
  }, [lastScrollY])

  useEffect(() => {
    fetchProducts();
  }, []);  

  const sortSizes = (sizes: { [key: string]: SizeInput }): [string, SizeInput][] => {
    return Object.entries(sizes).sort((a, b) => {
      const sizeA = a[0].toLowerCase().replace("t-", "")
      const sizeB = b[0].toLowerCase().replace("t-", "")

      if (!isNaN(Number(sizeA)) && !isNaN(Number(sizeB))) {
        return Number(sizeA) - Number(sizeB)
      }

      return sizeA.localeCompare(sizeB)
    })
  }

  const fetchWarehouses = useCallback(async () => {
    try {
      const warehousesSnapshot = await getDocs(collection(db, `companies/${companyId}/warehouses`))
      const warehousesList = warehousesSnapshot.docs
        .map((doc) => ({ id: doc.id, name: doc.data().name }))
        .filter((warehouse) => warehouse.id !== warehouseId)
      setWarehouses(warehousesList)
    } catch (error) {
      console.error("Error fetching warehouses:", error)
    }
  }, [companyId, warehouseId])

  useEffect(() => {
    fetchWarehouses()
  }, [fetchWarehouses])

  const fetchWarehouseDetails = useCallback(async () => {
    if (!companyId || !warehouseId) {
        console.error('companyId or storeId is undefined');
        setLoading(false);
        return;
      }
    try {
      const warehouseDocRef = doc(db, `companies/${companyId}/warehouses`, warehouseId)
      const warehouseDocSnap = await getDoc(warehouseDocRef)
      if (warehouseDocSnap.exists()) {
        const warehouseData = warehouseDocSnap.data()
        setWarehouseName(warehouseData?.name || "Unnamed Warehouse")
      } else {
        console.error("Warehouse document does not exist")
        setWarehouseName("Unknown Warehouse")
      }
    } catch (error) {
      console.error("Error fetching warehouse details:", error)
      setWarehouseName("Error Loading Warehouse Name")
    }
  }, [companyId, warehouseId])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const productsQuery = query(collection(db, `companies/${companyId}/warehouses/${warehouseId}/products`))
      const productsSnapshot = await getDocs(productsQuery)
      const productsList = productsSnapshot.docs.map((doc) => {
        const data = doc.data()
        let createdAtValue: number | Timestamp | FieldValue = data.createdAt

        if (createdAtValue instanceof Timestamp) {
          createdAtValue = createdAtValue.toMillis()
        } else if (typeof createdAtValue === "number") {
          createdAtValue = createdAtValue
        } else {
          createdAtValue = Timestamp.now().toMillis()
        }
        return {
          id: doc.id,
          ...data,
          createdAt: createdAtValue,
          comments: data.comments || "",
          exhibition: data.exhibition || {},
          warehouseId,
        } as Product
      })
      setProducts(productsList)
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: "Failed to fetch products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [companyId, warehouseId])

  useEffect(() => {
    fetchWarehouseDetails()
    fetchProducts()
  }, [fetchWarehouseDetails, fetchProducts])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const isInactive = product.isBox ? product.total2 === 0 : product.total === 0

      const matchesSearch =
        product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Object.values(product.sizes).some((size) =>
          size.barcodes.some((barcode) => barcode.toLowerCase().includes(searchTerm.toLowerCase())),
        )

      const matchesGender = genderFilter === "all" || product.gender === genderFilter
      const matchesBoxFilter = showBox === product.isBox
      const matchesInactiveFilter = showInactive ? isInactive : !isInactive

      return matchesSearch && matchesGender && matchesBoxFilter && matchesInactiveFilter
    })
  }, [products, searchTerm, genderFilter, showBox, showInactive])

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortOrder === "alphabetical") {
        return a.brand.localeCompare(b.brand)
      }
      const aCreatedAt =
        a.createdAt instanceof Timestamp
          ? a.createdAt.toMillis()
          : typeof a.createdAt === "number"
            ? a.createdAt
            : Date.now()
      const bCreatedAt =
        b.createdAt instanceof Timestamp
          ? b.createdAt.toMillis()
          : typeof b.createdAt === "number"
            ? b.createdAt
            : Date.now()
      return (bCreatedAt as number) - (aCreatedAt as number)
    })
  }, [filteredProducts, sortOrder])

  const handleDelete = async () => {
    if (!productToDelete) return

    if (!hasPermission && ("delete")) {
      toast({
        title: "Permission Denied",
        description: "You do not have permission to delete products.",
        variant: "destructive",
      })
      setProductToDelete(null)
      return
    }
    try {
      // Get the product document
      const productDoc = await getDoc(
        doc(db, `companies/${companyId}/warehouses/${warehouseId}/products`, productToDelete.id),
      )
      const productData = productDoc.data()

      // Check if the product is a copy from a box
      const isBoxCopy = productData && "originalBoxId" in productData

      // Delete the product document
      await deleteDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/products`, productToDelete.id))

      // Only delete the image if it's not a copy from a box
      if (!isBoxCopy && productToDelete.imageUrl) {
        const imageRef = ref(storage, productToDelete.imageUrl)
        await deleteObject(imageRef)
      }

      setProducts(products.filter((p) => p.id !== productToDelete.id))
      toast({
        title: "Success",
        description: `Product ${productToDelete.brand} ${productToDelete.reference} has been deleted successfully.`,
        style: { background: "#4CAF50", color: "white", fontWeight: "bold" },
      })
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Error",
        description: `Failed to delete the product ${productToDelete.brand} ${productToDelete.reference}.`,
        variant: "destructive",
      })
    } finally {
      setProductToDelete(null)
    }
  }

  const handleTransfer = async (product: Product, targetWarehouseId: string) => {
    if (!companyId || !warehouseId) {
        console.error('companyId or storeId is undefined');
        setLoading(false);
        return;
      }
    setIsTransferring(true)
    try {
      // Get the original image name from the URL
      const decodedUrl = decodeURIComponent(product.imageUrl)
      const imagePath = decodedUrl.split("/o/")[1].split("?")[0]

      // Create references for the old and new locations
      const oldImageRef = ref(storage, imagePath)
      const newImagePath = imagePath.replace(warehouseId, targetWarehouseId)
      const newImageRef = ref(storage, newImagePath)

      // Get the image data
      const response = await fetch(product.imageUrl)
      const blob = await response.blob()

      // Upload to new location first
      await uploadBytes(newImageRef, blob)
      const newImageUrl = await getDownloadURL(newImageRef)

      // Create a new document reference in the target warehouse
      const targetProductRef = doc(collection(db, `companies/${companyId}/warehouses/${targetWarehouseId}/products`))

      // Prepare the product data for the new warehouse
      const productData = {
        ...product,
        id: targetProductRef.id,
        warehouseId: targetWarehouseId,
        imageUrl: newImageUrl,
        createdAt: serverTimestamp(),
      }

      // Add the product to the target warehouse
      await setDoc(targetProductRef, productData)

      // Delete the old image
      await deleteObject(oldImageRef)

      // Remove the product from the current warehouse
      await deleteDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/products`, product.id))

      // Update local state
      setProducts(products.filter((p) => p.id !== product.id))

      toast({
        title: "Success",
        description: `Product ${product.brand} ${product.reference} has been transferred successfully.`,
        style: { background: "#4CAF50", color: "white", fontWeight: "bold" },
      })
    } catch (error) {
      console.error("Error transferring product:", error)
      toast({
        title: "Error",
        description: `Failed to transfer the product ${product.brand} ${product.reference}.`,
        variant: "destructive",
      })
    } finally {
      setIsTransferring(false)
      setTransferConfirmation(null)
    }
  }

  const handleUpdate = (product: Product) => {
    window.location.href = `/companies/${companyId}/warehouses/${warehouseId}/update-product/${product.id}`
  }

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new()

    // Define the size range we want to display
    const sizeRange = Array.from({ length: 11 }, (_, i) => (35 + i).toString())

    const worksheetData = filteredProducts.map((product, index) => {
      const baseData = {
        "No.": index + 1,
        Brand: product.brand,
        Reference: product.reference,
        Color: product.color,
        Gender: product.gender,
      }

      let sizeData = {}
      let barcodeData = {}

      if (!product.isBox) {
        // Create an object with quantities for each size
        sizeData = sizeRange.reduce(
          (acc, size) => {
            const sizeKey = `T-${size}`
            acc[`${size}`] = product.sizes[sizeKey]?.quantity || ""
            return acc
          },
          {} as { [key: string]: number | string },
        )

        // Create an object with barcodes for each size
        barcodeData = sizeRange.reduce(
          (acc, size) => {
            const sizeKey = `T-${size}`
            acc[`Barcodes ${size}`] = product.sizes[sizeKey]?.barcodes.join(",") || ""
            return acc
          },
          {} as { [key: string]: string },
        )
      }

      const endData = {
        "Total Quantity": product.isBox ? product.total2 : product.total,
        "Base Price": product.baseprice,
        "Sale Price": product.saleprice,
        Barcode:
          product.barcode ||
          (product.isBox
            ? ""
            : Object.values(product.sizes)
                .flatMap((size) => size.barcodes)
                .join(", ")),
        "Created At":
          product.createdAt instanceof Timestamp
            ? product.createdAt.toDate().toISOString()
            : typeof product.createdAt === "number"
              ? new Date(product.createdAt).toISOString()
              : new Date().toISOString(),
        Comments: product.comments || "",
      }

      return { ...baseData, ...sizeData, ...endData, ...barcodeData }
    })

    // Determine if any product is a box
    const hasBoxItems = filteredProducts.some((product) => product.isBox)
    const columns = [
      "No.",
      "Brand",
      "Reference",
      "Color",
      "Gender",
      ...(hasBoxItems ? [] : sizeRange.map((size) => `${size}`)),
      "Total Quantity",
      "Base Price",
      "Sale Price",
      "Barcode",
      "Created At",
      ...(hasBoxItems ? [] : sizeRange.map((size) => `Barcodes ${size}`)),
      "Comments",
    ]

    // Create the worksheet with the specified column order
    const worksheet = XLSX.utils.json_to_sheet(worksheetData, { header: columns })

    // Add formula for Total Quantity only for non-box items
    if (!hasBoxItems) {
      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1")
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const totalQuantityCell = XLSX.utils.encode_cell({ r: R, c: columns.indexOf("Total Quantity") })
        const formulaStart = XLSX.utils.encode_cell({ r: R, c: columns.indexOf("35") })
        const formulaEnd = XLSX.utils.encode_cell({ r: R, c: columns.indexOf("45") })
        worksheet[totalQuantityCell] = { f: `SUM(${formulaStart}:${formulaEnd})` }
      }
    }

    // Set column widths
    const baseColumns = [
      { width: 5 }, // No.
      { width: 15 }, // Brand
      { width: 15 }, // Reference
      { width: 15 }, // Color
      { width: 8 }, // Gender
    ]

    const sizeColumns = hasBoxItems ? [] : sizeRange.map(() => ({ width: 5 })) // Size columns

    const endColumns = [
      { width: 12 }, // Total Quantity
      { width: 10 }, // Base Price
      { width: 10 }, // Sale Price
      { width: 15 }, // Barcode
      { width: 20 }, // Created At
    ]

    const barcodeColumns = hasBoxItems ? [] : sizeRange.map(() => ({ width: 15 })) // Barcode columns

    const commentsColumn = [{ width: 30 }] // Comments column

    worksheet["!cols"] = [...baseColumns, ...sizeColumns, ...endColumns, ...barcodeColumns, ...commentsColumn]

    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory")

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

    // Determine the filename based on whether we're exporting box items or regular items
    const inventoryType = hasBoxItems ? "cajas" : "pares"
    const filename = `${warehouseName.replace(/\s+/g, "_")}_${inventoryType}_inventory.xlsx`

    saveAs(data, filename)
  }

  const exportToPDF = () => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF()
    // Determine if any product is a box
    const hasBoxItems = sortedProducts.some((product) => product.isBox)

    doc.setFontSize(18)
    doc.text(`Inventory (${warehouseName})`, 14, 22)
    doc.setFontSize(12)
    doc.text(`Total Products: ${formatNumber(summaryInfo.totalItems)}`, 14, 32)
    doc.text(`Total ${hasBoxItems ? "Boxes" : "Pares"}: ${formatNumber(summaryInfo.totalPares)}`, 14, 40)
    doc.text(`Total Base: $${formatNumber(summaryInfo.totalBase)}`, 14, 48)
    doc.text(`Total Sale: $${formatNumber(summaryInfo.totalSale)}`, 14, 56)

    const tableColumn = ["No.", "Brand", "Reference", "Color", "Gender", "Total", "Base Price", "Sale Price"]
    const tableRows = sortedProducts.map((product, index) => [
      index + 1,
      product.brand,
      product.reference,
      product.color,
      product.gender,
      product.isBox ? product.total2 : product.total,
      formatNumber(product.baseprice),
      formatNumber(product.saleprice),
    ])

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 65,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [224, 224, 224] },
    })

    const inventoryType = hasBoxItems ? "cajas" : "pares"
    const filename = `${warehouseName.replace(/\s+/g, "_")}_${inventoryType}_inventory.pdf`

    doc.save(filename)
  }

  const summaryInfo = useMemo(() => {
    const totalItems = filteredProducts.length
    const totalPares = filteredProducts.reduce(
      (sum, product) => sum + (product.isBox ? product.total2 : product.total),
      0,
    )
    const totalBase = filteredProducts.reduce(
      (sum, product) => sum + product.baseprice * (product.isBox ? product.total2 : product.total),
      0,
    )
    const totalSale = filteredProducts.reduce(
      (sum, product) => sum + product.saleprice * (product.isBox ? product.total2 : product.total),
      0,
    )
    return { totalItems, totalPares, totalBase, totalSale }
  }, [filteredProducts])

  const formatNumber = (num: number) => {
    return num.toLocaleString("es-ES")
  }

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl)
  }

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templatesRef = collection(db, `companies/${companyId}/templates`)
        const snapshot = await getDocs(templatesRef)
        const templatesList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Template)
        setTemplates(templatesList)
      } catch (error) {
        console.error("Error fetching templates:", error)
      }
    }

    fetchTemplates()
  }, [companyId, warehouseId])

  const replaceTemplatePlaceholders = (template: string, product: Product) => {
    return template
      .replace(/{brand}/g, product.brand)
      .replace(/{reference}/g, product.reference)
      .replace(/{color}/g, product.color)
      .replace(/{gender}/g, product.gender)
      .replace(/{price}/g, product.saleprice.toString())
  }

  const shareViaWhatsApp = (product: Product) => {
    if (templates.length === 0) {
      toast({
        title: "No templates available",
        description: "Please create a template first.",
        variant: "destructive",
      })
      return
    }

    setProductToShare(product)
    setIsTemplateSelectOpen(true)
  }

  const handleDownloadImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `product-image-${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error downloading image:", error)
      toast({
        title: "Error",
        description: "Failed to download the image. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCardClick = (productId: string) => {
    setSelectedCard(selectedCard === productId ? null : productId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-100 dark:bg-gray-600">
        <header className="bg-teal-600 text-white p-4 flex items-center">
          <Skeleton className="h-6 w-6 mr-2" />
          <Skeleton className="h-8 w-48 mr-2 flex-grow" />
          <Skeleton className="h-10 w-32" />
        </header>
        <main className="container mx-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, index) => (
              <InvoiceSkeleton key={index} />
            ))}
          </div>
        </main>
      </div>
    )
  }
  //Inv-{showBox ? 'Cajas' : 'Pares'}
  return (
    <div className="min-h-screen bg-blue-100 pb-16 flex flex-col dark:bg-gray-800">
      <header className="bg-teal-600 text-white p-3 flex items-center">
        <Button
          variant="ghost"
          className="text-white p-0 mr-2"
          onClick={() => window.location.href = `/companies/${companyId}/warehouses`}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">
          {warehouseName} - {showBox ? "Cajas" : "Pares"}
        </h1>
        <Button onClick={() => setIsFilterDialogOpen(true)} variant="ghost">
          <Filter className="h-4 w-4" />
        </Button>
        {hasPermission && hasPermission("ska") && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-white">
              <Menu className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
          {hasPermission && hasPermission("create") && (
            <DropdownMenuItem
              onClick={() => window.location.href = `/companies/${companyId}/warehouses/${warehouseId}/form-product`}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Product
            </DropdownMenuItem>
          )}        
            <DropdownMenuItem onClick={exportToPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </DropdownMenuItem>
          {hasPermission && hasPermission("create") && (
            <DropdownMenuItem onClick={exportToExcel}>
              <FileDown className="h-4 w-4 mr-2" />
              Export Excel
            </DropdownMenuItem>
          )}
          </DropdownMenuContent>
        </DropdownMenu>
        )}
        <AlertDialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Filters</AlertDialogTitle>
              <AlertDialogDescription>Adjust your inventory filters here.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div>
                  <Switch id="show-box" checked={showBox} onCheckedChange={setshowBox} />
                  <label htmlFor="show-box" className="text-sm font-medium text-black ml-2 dark:text-gray-200">
                    {showBox ? "Cajas" : "Pares"}
                  </label>
                </div>
                <div>
                  <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
                  <label htmlFor="show-inactive" className="text-sm font-medium text-black ml-2 dark:text-gray-200">
                    {showInactive ? "Inactive" : "Active"}
                  </label>
                </div>
              </div>
              <Select value={genderFilter} onValueChange={(value: "all" | "Dama" | "Hombre" | "Niño") => setGenderFilter(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Gender">
                    <div className="flex items-center">
                      <Filter className="mr-2 h-4 w-4" />
                      <span>{genderFilter === "all" ? "All" : genderFilter}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Dama">Dama</SelectItem>
                  <SelectItem value="Hombre">Hombre</SelectItem>
                  <SelectItem value="Niño">Niño</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(value: "entry" | "alphabetical") => setSortOrder(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort by">
                    <div className="flex items-center">
                      <SortDesc className="mr-2 h-4 w-4" />
                      <span>{sortOrder === "entry" ? "Entry" : "A-Z"}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry</SelectItem>
                  <SelectItem value="alphabetical">A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </header>
      <div className="flex items-center space-x-2 mr-4 ml-4 mt-4 lg:w-1/2">
        <Input
          placeholder="Search by brand, reference, color or barcode"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow text-black dark:text-white"
        />
      </div>
      <main className="container mx-auto p-4 flex-grow">
        {hasPermission && hasPermission("update") && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>Total Products: {formatNumber(summaryInfo.totalItems)}</div>
                <div>Total Pares: {formatNumber(summaryInfo.totalPares)}</div>
                <div>Total Base: ${formatNumber(summaryInfo.totalBase)}</div>
                <div>Total Sale: ${formatNumber(summaryInfo.totalSale)}</div>
              </div>
            </CardContent>
          </Card>
        )}
        <div className="lg:grid lg:grid-cols-3 lg:gap-4">
          {sortedProducts.map((product, index) => (
            <div key={product.id} className="flex items-start">
              <span className="text-sm font-semibold text-gray-500 mr-2 mt-4 dark:text-gray-200">
                {index + 1}
              </span>
              <Card
                className="flex-grow relative cursor-pointer mt-4 lg:min-h-[215px]"
                onClick={() => handleCardClick(product.id)}
              >
                <CardContent className="p-4">
                  <div className="flex space-x-4 items-center justify-center">
                    <div className="relative w-16 h-16 flex-shrink-0 ">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <img
                            src={product.imageUrl || "/placeholder.svg"}
                            alt={product.reference}
                            //fill
                            className="absolute object-cover rounded-md w-full h-full"
                            onClick={() => handleImageClick(product.imageUrl)}
                          />
                        </AlertDialogTrigger>
                        <AlertDialogContent className="sm:max-w-[425px] bg-slate-400/20">
                          <div className="relative w-full h-[300px]">
                            <img
                              src={product.imageUrl || "/placeholder.svg"}
                              alt={product.reference}
                              //fill
                              sizes="(max-width: 425px) 100vw, 425px"
                              className="object-contain"
                            />
                          </div>
                          <Button onClick={() => handleDownloadImage(product.imageUrl)} className="mt-4">
                            <Download className="mr-2 h-4 w-4" />
                            Download Image
                          </Button>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{product.brand}</h3>
                      <span className="text-sm text-gray-500 dark:text-gray-200">{product.reference}</span>
                      <p className="text-sm">
                        {product.color} - {product.gender}
                      </p>
                      {hasPermission && hasPermission("ska") && (
                      <p className="text-sm">Sale: ${formatNumber(product.saleprice)}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="font-medium text-sm">
                      {product.isBox ? "BoxTotal:" : "Sizes Total:"} {product.isBox ? product.total2 : product.total}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-200">{product.barcode}</span>
                  </div>
                  <div className="">
                    <div className="grid grid-cols-5 gap-1 mt-1">
                      {Object.keys(product.sizes).length > 0 ? (
                        sortSizes(product.sizes).map(([size, { quantity }]) => (
                          <div key={size} className="text-sm bg-gray-100 p-1 rounded dark:bg-gray-700">
                            <span className="font-normal">{size.replace("T-", "")}</span>
                            <span className="font-semibold">: {quantity}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-red-500"></div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <div className="absolute top-2 right-2 flex items-center">
                  {selectedCard === product.id && 
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                      {hasPermission && hasPermission("create") && (
                        <DropdownMenuItem onClick={() => handleUpdate(product)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Updated</span>
                        </DropdownMenuItem>
                        )}{hasPermission && hasPermission("delete") && (
                          <DropdownMenuItem onClick={() => setProductToDelete(product)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        )}{hasPermission && hasPermission("cus") && (
                        <DropdownMenuItem onClick={() => shareViaWhatsApp(product)}>
                          <span className="mr-2">Share via WhatsApp</span>
                        </DropdownMenuItem>
                        )}{hasPermission && hasPermission("create") && (<>
                        {warehouses.map((warehouse) => (
                          <DropdownMenuItem
                            key={warehouse.id}
                            onClick={() =>
                              setTransferConfirmation({
                                product,
                                targetWarehouseId: warehouse.id,
                              })
                            }
                          >
                            Transfer to {warehouse.name}
                          </DropdownMenuItem>
                        ))}</>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  } 
                </div>
                {(product.isBox ? product.total2 : product.total) === 0 && (
                  <div className="mt-2 text-sm text-red-500 md:absolute md:bottom-2 md:left-2">
                    This {product.isBox ? "box" : "product"} is out of stock.
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      </main>

      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product
              <span className="font-semibold">
                {" "}
                {productToDelete?.brand} {productToDelete?.reference}{" "}
              </span>
              and remove the associated image from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 dark:text-gray-200">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!transferConfirmation}
        onOpenChange={(open) => !open && !isTransferring && setTransferConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Transfer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to transfer the product
              <span className="font-semibold">
                {" "}
                {transferConfirmation?.product.brand} {transferConfirmation?.product.reference}{" "}
              </span>
              to the selected warehouse? This action will move the product and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransferring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (transferConfirmation) {
                  handleTransfer(transferConfirmation.product, transferConfirmation.targetWarehouseId)
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isTransferring}
            >
              {isTransferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                "Transfer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <FloatingScrollButton />
      <AlertDialog open={isTemplateSelectOpen} onOpenChange={setIsTemplateSelectOpen}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Select a Template</AlertDialogTitle>
            <AlertDialogDescription>Choose a template to share your product via WhatsApp.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            {templates.map((template, index) => (
              <div
                key={template.id}
                className={`p-2 rounded cursor-pointer ${
                  selectedTemplateIndex === index ? "bg-blue-100 dark:bg-gray-700" : "hover:bg-gray-100"
                }`}
                onClick={() => setSelectedTemplateIndex(index)}
              >
                <h3 className="font-semibold">{template.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-300">{template.content}</p>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setSelectedTemplateIndex(null)
                setProductToShare(null)
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedTemplateIndex !== null && productToShare) {
                  const template = templates[selectedTemplateIndex]
                  const filledTemplate = replaceTemplatePlaceholders(template.content, productToShare)
                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(filledTemplate)}`
                  window.open(whatsappUrl, "_blank")
                  setIsTemplateSelectOpen(false)
                  setSelectedTemplateIndex(null)
                  setProductToShare(null)
                }
              }}
            >
              Share
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Exportar el componente envuelto con withPermission
export const ParesInventoryComponent = withPermission(ParesInventoryBase, ['read']);

// Exportar como default
export default ParesInventoryComponent;