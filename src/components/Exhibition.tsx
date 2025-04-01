'use client'

import "../styles/global.css";
import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs, doc, getDoc, getFirestore} from 'firebase/firestore'
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Card, CardContent} from "../components/ui/Card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/DropdownMenu"
import { Pencil, MoreHorizontal, FileDown, ArrowLeft, Filter, SortDesc, Download } from 'lucide-react'
import { Switch } from "../components/ui/Switch"
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import type { UserOptions } from 'jspdf-autotable'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/AlertDialog'
import { toast } from '../components/ui/UseToast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { InvoiceSkeleton } from '../components/skeletons/InvoiceSkeleton'
import FloatingScrollButton from '../components/ui/FloatingScrollButton'
import { withPermission } from "../components/WithPermission"
import { initializeApp, type FirebaseApp } from 'firebase/app'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
  }
}

interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  }  

interface Product {
  id: string
  brand: string
  reference: string
  color: string
  gender: 'Dama' | 'Hombre'
  imageUrl: string
  baseprice: number
  saleprice: number
  warehouseId: string
  barcode: string
  sizes: { [key: string]: { quantity: number, barcodes: string[] } }
  total: number
  exhibition?: {
    [storeId: string]: {
      size: string
      barcode: string
    }
  }
}

interface Template {
  id: string
  name: string
  content: string
} 

interface InventoryExbPageProps {
    firebaseConfig: FirebaseConfig;
    companyId?: string;
    storeId?: string;
    hasPermission?: (action: string) => boolean;
}

function InventoryExbPage({ firebaseConfig, companyId, storeId, hasPermission }: InventoryExbPageProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [storeName, setStoreName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")
  const [gender, setGender] = useState<"all" | "Dama" | "Hombre">("all")
  const [sortOrder, setSortOrder] = useState<"entry" | "alphabetical">("entry")
  const [showUnassigned, setShowUnassigned] = useState(false)
  const [, setIsHeaderVisible] = useState(true)
  const [lastScrollTop, setLastScrollTop] = useState(0)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [isTemplateSelectOpen, setIsTemplateSelectOpen] = useState(false)
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number | null>(null)
  const [productToShare, setProductToShare] = useState<Product | null>(null)

  const app: FirebaseApp = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  useEffect(() => {
    const controlHeader = () => {
      if (typeof window !== "undefined") {
        const currentScrollTop = window.scrollY

        if (currentScrollTop < lastScrollTop) {
          // Scrolling up
          setIsHeaderVisible(true)
        } else if (currentScrollTop > 100 && currentScrollTop > lastScrollTop) {
          // Scrolling down and past the 100px mark
          setIsHeaderVisible(false)
        }

        setLastScrollTop(currentScrollTop)
      }
    }

    window.addEventListener("scroll", controlHeader)

    return () => {
      window.removeEventListener("scroll", controlHeader)
    }
  }, [lastScrollTop])

  useEffect(() => {
    const fetchStoreProductsAndTemplates = async () => {
      if (!companyId || !storeId) {
        console.error('companyId or storeId is undefined');
        setLoading(false);
        return;
      }
  
      setLoading(true);
      try {
        const storeDoc = await getDoc(doc(db, `companies/${companyId}/stores`, storeId))
        if (storeDoc.exists()) {
          setStoreName(storeDoc.data().name)
        }

        const warehousesSnapshot = await getDocs(collection(db, `companies/${companyId}/warehouses`))
        const allProducts: Product[] = []
        const uniqueTemplates: { [id: string]: Template } = {}

        for (const warehouseDoc of warehousesSnapshot.docs) {
          const warehouseId = warehouseDoc.id
          const productsSnapshot = await getDocs(
            collection(db, `companies/${companyId}/warehouses/${warehouseId}/products`),
          )

          productsSnapshot.forEach((doc) => {
            const data = doc.data() as Omit<Product, "id" | "warehouseId">
            allProducts.push({
              ...data,
              id: doc.id,
              warehouseId,
            })
          })

          // Fetch templates for company
          const templatesRef = collection(db, `companies/${companyId}/templates`)
          const templatesSnapshot = await getDocs(templatesRef)
          templatesSnapshot.docs.forEach((doc) => {
          const template = { id: doc.id, ...doc.data() } as Template
          uniqueTemplates[template.id] = template
        })
      }

        setProducts(allProducts)
        setTemplates(Object.values(uniqueTemplates))
      } catch (error) {
        console.error("Error fetching store, products, and templates:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchStoreProductsAndTemplates()
  }, [companyId, storeId])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (!companyId || !storeId) {
        console.error('companyId or storeId is undefined');
        setLoading(false);
        return;
      }
      const matchesFilter =
        product.brand.toLowerCase().includes(filter.toLowerCase()) ||
        product.reference.toLowerCase().includes(filter.toLowerCase()) ||
        product.color.toLowerCase().includes(filter.toLowerCase()) ||
        product.barcode.toLowerCase().includes(filter.toLowerCase()) ||
        (product.exhibition &&
          Object.values(product.exhibition).some((storeExhibition) =>
            storeExhibition.barcode.toLowerCase().includes(filter.toLowerCase()),
          ))
      const matchesGender = gender === "all" || product.gender === gender
      const matchesAssignment = showUnassigned
        ? (!product.exhibition || !product.exhibition[storeId]) &&
          product.total > 0 &&
          Object.values(product.sizes).some((size) => size.quantity > 0)
        : product.exhibition && product.exhibition[storeId]
      return matchesFilter && matchesGender && matchesAssignment
    })
  }, [products, filter, gender, showUnassigned, storeId])

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortOrder === "alphabetical") {
        return a.brand.localeCompare(b.brand)
      }
      // Sort by entry order (assuming id is used for ordering)
      return a.id.localeCompare(b.id)
    })
  }, [filteredProducts, sortOrder])

  const summaryInfo = useMemo(() => {
    const totalItems = filteredProducts.length
    const totalPares = filteredProducts.reduce((sum, product) => {
      if (showUnassigned) {
        return sum + Object.values(product.sizes).reduce((sizeSum, size) => sizeSum + size.quantity, 0)
      }
      return sum + 1 // For assigned products, each product represents one pair
    }, 0)
    const totalBase = filteredProducts.reduce((sum, product) => sum + Number(product.baseprice), 0)
    const totalSale = filteredProducts.reduce((sum, product) => sum + Number(product.saleprice), 0)
    return { totalItems, totalPares, totalBase, totalSale }
  }, [filteredProducts, showUnassigned])

  const formatNumber = (value: number) => {
    return value.toLocaleString("es-ES")
  }

  const formatSize = (size: string) => {
    const match = size.match(/^T-?(\d+)$/)
    return match ? `${match[1]}` : size
  }

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new()

    const worksheetData = sortedProducts.map((product) => {
      if (!companyId || !storeId) {
        console.error('companyId or storeId is undefined');
        setLoading(false);
        return;
      }
      const baseData = {
        Brand: product.brand,
        Reference: product.reference,
        Color: product.color,
        Gender: product.gender,
        Size: showUnassigned
          ? Object.entries(product.sizes)
              .filter(([, sizeData]) => sizeData.quantity > 0)
              .sort(([a], [b]) => {
                const numA = Number.parseInt(a.replace(/\D/g, ""))
                const numB = Number.parseInt(b.replace(/\D/g, ""))
                return numA - numB
              })
              .map(([size, sizeData]) => `${sizeData.quantity}-${size.replace("T-", "")}`)
              .join(", ")
          : product.exhibition?.[storeId]?.size,
        Barcode: showUnassigned ? product.barcode || "" : product.exhibition?.[storeId]?.barcode || "",
      }

      if (hasPermission && hasPermission("update")) {
        return {
          ...baseData,
          "Base Price": product.baseprice,
          "Sale Price": product.saleprice,
        }
      }

      return baseData
    })

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)

    worksheet["!cols"] = [
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 10 },
      { width: 15 },
      { width: 20 },
      ...(hasPermission  && hasPermission("update") ? [{ width: 15 }, { width: 15 }] : []),
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, showUnassigned ? "Unassigned Products" : "Exhibition Inventory")

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

    saveAs(data, `${storeName}_${showUnassigned ? "unassigned" : "exhibition"}_inventory.xlsx`)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text(showUnassigned ? "Unassigned Products Report" : "Exhibition Inventory Report", 14, 22)

    let startY = 30
    if (hasPermission && hasPermission("update")) {
      doc.setFontSize(12)
      doc.text(`Total Items: ${formatNumber(summaryInfo.totalItems)}`, 14, 32)
      doc.text(`Total Pares: ${formatNumber(summaryInfo.totalPares)}`, 14, 40)
      doc.text(`Total Base: $${formatNumber(summaryInfo.totalBase)}`, 14, 48)
      doc.text(`Total Sale: $${formatNumber(summaryInfo.totalSale)}`, 14, 56)
      startY = 65
    }

    const tableColumn = ["No.", "Brand", "Reference", "Color", "Gender", "Size", "Barcode"]
    if (hasPermission && hasPermission("update")) {
      tableColumn.push("Base Price", "Sale Price")
    }

    const tableRows = sortedProducts.map((product, index) => {
      const baseRow = [
        (index + 1).toString(),
        product.brand || "",
        product.reference || "",
        product.color || "",
        product.gender || "",
        showUnassigned
          ? Object.entries(product.sizes)
              .filter(([, sizeData]) => sizeData.quantity > 0)
              .sort(([a], [b]) => Number.parseInt(a.replace(/\D/g, "")) - Number.parseInt(b.replace(/\D/g, "")))
              .map(([size, sizeData]) => `${sizeData.quantity}-${size.replace("T-", "")}`)
              .join(", ")
          : (storeId && product.exhibition?.[storeId]?.size) || "",
        showUnassigned ? product.barcode || "" : (storeId && product.exhibition?.[storeId]?.barcode) || "",
      ];
  
      if (hasPermission && hasPermission("update")) {
        baseRow.push(formatNumber(product.baseprice) || "0", formatNumber(product.saleprice) || "0");
      }
  
      return baseRow as string[];
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: startY,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [224, 224, 224] },
    })

    doc.save(`${storeName}_${showUnassigned ? "unassigned" : "exhibition"}_inventory.pdf`)
  }

  const handleDownloadImage = async (imageUrl: string, productName: string) => {
    try {
      const response = await fetch(imageUrl)
      if (!response.ok) throw new Error("Image download failed")
      const blob = await response.blob()
      const fileName = `${productName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.jpg`
      const url = window.URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Image downloaded successfully.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error downloading image:", error)
      toast({
        title: "Error",
        description: "Failed to download the image. Please try again...",
        variant: "destructive",
      })
    }
  }

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
      // If there are no templates, share with a default message
      const defaultMessage = `Check out this product:
      Brand: ${product.brand}
      Reference: ${product.reference}
      Color: ${product.color}
      Gender: ${product.gender}
      Price: $${product.saleprice}
      ${product.imageUrl}`

      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(defaultMessage)}`
      window.open(whatsappUrl, "_blank")
    } else {
      setProductToShare(product)
      setIsTemplateSelectOpen(true)
    }
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

  return (
    <div className="min-h-screen bg-blue-100 pb-16 dark:bg-gray-800">
      <header className="bg-teal-600 text-white p-3 flex items-center">
        <Button variant="ghost" onClick={() => window.history.back()} className="text-white p-0 mr-2">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">
          {showUnassigned ? "Sin Exb" : "Exb"} {storeName}
        </h1>
        <AlertDialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-white">
              <Filter className="h-6 w-6" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Filters</AlertDialogTitle>
              <AlertDialogDescription>Adjust your inventory filters here.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              {hasPermission && hasPermission("read") && (
                <div className="flex items-center space-x-2">
                  <Switch checked={showUnassigned} onCheckedChange={setShowUnassigned} />
                  <span>{showUnassigned ? "Unassigned" : "Assigned"}</span>
                </div>
              )}
              <Select value={gender} onValueChange={(value: "all" | "Dama" | "Hombre") => setGender(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Gender">
                    <div className="flex items-center">
                      <Filter className="mr-2 h-4 w-4" />
                      <span>{gender === "all" ? "All" : gender}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Dama">Dama</SelectItem>
                  <SelectItem value="Hombre">Hombre</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(value: "entry" | "alphabetical") => setSortOrder(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Sort Order">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-white">
              <FileDown className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportToPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToExcel}>
              <FileDown className="h-4 w-4 mr-2" />
              Export Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main className="container mx-auto relative z-0">
        <div className="m-2 mr-4 ml-4 mt-4 text-black lg:w-1/2">
          <Input
            type="text"
            placeholder="Search by brand, reference, color, or barcode"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full text-black dark:text-gray-200"
          />
        </div>
        {hasPermission && hasPermission("create") && (
          <div className="bg-white rounded-lg p-4 m-4 shadow text-slate-900 dark:bg-gray-700 dark:text-gray-200 lg:w-1/2">
            <div className="grid grid-cols-2 gap-3">
              <div>Items: {formatNumber(summaryInfo.totalItems)}</div>
              <div>Total pares: {formatNumber(summaryInfo.totalPares)}</div>
              <div>Total base: ${formatNumber(summaryInfo.totalBase)}</div>
              <div>Total sale: ${formatNumber(summaryInfo.totalSale)}</div>
            </div>
          </div>
        )}
        <div>
          <div className="space-y-4 m-4 lg:grid lg:grid-cols-2 lg:gap-3">
            {sortedProducts.map((product, index) => (
              <div key={product.id} className="flex items-start lg:mt-4">
                <div className="text-sm font-semibold mr-1 mt-2 text-black dark:text-gray-200">{index + 1}</div>
                <Card className="flex-grow relative">
                  <CardContent className="p-4">
                    <div className="absolute top-2 right-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {hasPermission && hasPermission("create") && (
                            <DropdownMenuItem
                              onClick={() =>
                                window.location.href =`/companies/${companyId}/warehouses/${product.warehouseId}/update-product/${product.id}`}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Update</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => shareViaWhatsApp(product)}>
                            <span className="mr-2">WhatsApp Share</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                          <img
                            src={product.imageUrl || "/placeholder.svg"}
                            alt={product.reference}
                            className="w-full h-full object-cover rounded-md cursor-pointer"
                            onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg";
                            }}
                            />
                          </AlertDialogTrigger>
                          <AlertDialogContent className="sm:max-w-[425px] bg-slate-400/20">
                            <div className="relative w-full h-[300px]">
                              <div className="relative w-[425px] h-[425px] max-w-full">
                                <img
                                    src={product.imageUrl || "/placeholder.svg"}
                                    alt={product.reference}
                                    className="absolute inset-0 w-full h-full object-contain"
                                />
                                </div>
                              </div>
                            <Button
                              onClick={() => handleDownloadImage(product.imageUrl, product.brand)}
                              className="mt-4"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download Image
                            </Button>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-semibold">{product.brand}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-200">{product.reference}</p>
                        <p className="text-sm">
                          {product.color} - {product.gender}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex text-sm justify-between">
                      <div className="flex space-x-3">
                        <div className="font-medium">{showUnassigned ? "Sizes:\u00A0" : "Size:\u00A0"}</div>
                        {showUnassigned
                          ? Object.entries(product.sizes)
                              .filter(([, sizeData]) => sizeData.quantity > 0)
                              .sort(([a], [b]) => {
                                const numA = Number.parseInt(a.replace(/\D/g, ""))
                                const numB = Number.parseInt(b.replace(/\D/g, ""))
                                return numA - numB
                              })
                              .map(([size, sizeData]) => `${sizeData.quantity}-${formatSize(size)}`)
                              .join(", ")
                              : storeId && product.exhibition?.[storeId]
                              ? formatSize(product.exhibition[storeId].size)
                              : "N/A"}
                      </div>
                      {hasPermission && hasPermission("ska") && (
                        <div className="flex items-center">
                          <span className="font-medium ml-2">Sale:</span>
                          <span>${formatNumber(product.saleprice)}</span>
                        </div>
                      )}
                    </div>
                    {!showUnassigned && (
                      <div className="font-normal">
                        <span className="font-normal text-sm">
                        Barcode: {storeId && product.exhibition?.[storeId]?.barcode ? product.exhibition[storeId].barcode : "N/A"}{" "}
                        </span>
                      </div>
                    )}
                    {showUnassigned && (
                      <div className="flex flex-col">
                        <span className="font-normal text-sm">Total: {product.total}</span>
                        <span className="font-normal text-sm text-gray-500">Barcode: {product.barcode}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
            <FloatingScrollButton />
          </div>
        </div>
      </main>
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
                <p className="text-sm text-gray-500">{template.content}</p>
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

export default withPermission(InventoryExbPage, ["read","customer"]);
