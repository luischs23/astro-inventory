'use client'

import "../styles/global.css";
import { useState, useEffect } from 'react'
import { doc, getDoc, getDocs, updateDoc, collection, Timestamp, arrayUnion, increment, getFirestore} from 'firebase/firestore'
import type { DocumentData } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Label } from "../components/ui/Label"
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { toast } from '../components/ui/UseToast'
import { ArrowLeft, ChevronDown, ChevronUp, FileDown, Menu } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/DropdownMenu'
import InvoiceDetailSkeleton from '../components/skeletons/InvoiceDetailSkeleton'
import { Skeleton } from '../components/ui/Skeleton'
import { withPermission } from "../components/WithPermission"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/AlertDialog'
import { getApp, getApps, initializeApp } from 'firebase/app'

interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  }  

interface InvoiceItem {
  id: string
  productId: string
  brand: string
  reference: string
  color: string
  size: string
  barcode: string
  salePrice: number
  baseprice: number
  sold: boolean
  addedAt: Timestamp | Date
  exhibitionStore: string | null
  warehouseId: string | null
  isBox: boolean
  imageUrl: string 
  quantity: number
  returned?: boolean
  assignedUser?: string | null
  assignedUserName?: string | null
}

interface Invoice {
  id: string
  storeId: string
  userId: string
  customerName: string
  customerPhone: string
  totalSold: number
  totalEarn: number
  createdAt: Timestamp | Date
  items: InvoiceItem[]
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
}

interface SizeData {
  barcodes: string[];
  quantity: number;
}

interface ProductData extends DocumentData {
  brand: string;
  reference: string;
  color: string;
  sizes: { [size: string]: SizeData };
  saleprice: number;
  baseprice: number;
  imageUrl: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mb-2">
      <Button variant="ghost" className="w-full justify-between" onClick={() => setIsOpen(!isOpen)}>
        {title}
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      {isOpen && <div className="mt-2">{children}</div>}
    </div>
  )
}

interface InvoicePageProps {
  firebaseConfig: FirebaseConfig;
  companyId?: string;
  storeId?: string;
  invoiceId?: string 
  hasPermission?: (action: string) => boolean;
}

function InvoicePage({firebaseConfig, companyId, storeId, invoiceId, hasPermission}: InvoicePageProps) {    
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [storeName, setStoreName] = useState<string>("")
  const [warehouses, setWarehouses] = useState<{ [id: string]: string }>({})
  const [stores, setStores] = useState<{ [id: string]: string }>({})
  const [returnBarcode, setReturnBarcode] = useState("")
  const [addBarcode, setAddBarcode] = useState("")
  const [newSalePrice, setNewSalePrice] = useState("")
  const [searchResult, setSearchResult] = useState<InvoiceItem | null>(null)
  const [imageError, setImageError] = useState("")
  const [, setLoading] = useState(true)

    if (!getApps().length) {
            initializeApp(firebaseConfig);
        }
        const app = getApp();
        const db = getFirestore(app);

  useEffect(() => {
    fetchInvoice()
    fetchWarehouses()
    fetchStores()
  }, [])

  const fetchInvoice = async () => {
    if (!companyId || !storeId || !invoiceId) {
        console.error('companyId or storeId is undefined');
        setLoading(false);
        return;
      }    
    setLoading(true)
    try {
      const storeRef = doc(db, `companies/${companyId}/stores`, storeId)
      const storeDoc = await getDoc(storeRef)
      if (storeDoc.exists()) {
        setStoreName(storeDoc.data().name)

        const invoiceRef = doc(storeRef, "invoices", invoiceId)
        const invoiceDoc = await getDoc(invoiceRef)
        if (invoiceDoc.exists()) {
          const data = invoiceDoc.data() as Invoice
          setInvoice({
            ...data,
            id: invoiceDoc.id,
            totalEarn: data.totalEarn,
          })
        }
      }
    } catch (err) {
      console.error("Error fetching store and invoices:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null) {
      return "0"
    }
    return price.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const fetchWarehouses = async () => {
    const warehousesSnapshot = await getDocs(collection(db, `companies/${companyId}/warehouses`))
    const warehousesData = warehousesSnapshot.docs.reduce(
      (acc, doc) => {
        acc[doc.id] = doc.data().name
        return acc
      },
      {} as { [id: string]: string },
    )
    setWarehouses(warehousesData)
  }

  const fetchStores = async () => {
    const storesSnapshot = await getDocs(collection(db, `companies/${companyId}/stores`))
    const storesData = storesSnapshot.docs.reduce(
      (acc, doc) => {
        acc[doc.id] = doc.data().name
        return acc
      },
      {} as { [id: string]: string },
    )
    setStores(storesData)
  }

  const handleReturn = async () => {
    if (!invoice) return
  
    const itemToReturn = invoice.items.find((item) => item.barcode === returnBarcode)
    if (!itemToReturn) {
      toast({
        title: "Error",
        description: "Item not found in the invoice",
        variant: "destructive",
      })
      return
    }
  
    if (!itemToReturn.productId || !itemToReturn.warehouseId) {
      toast({
        title: "Error",
        description: "Product ID or Warehouse ID not found for this item",
        variant: "destructive",
      })
      return
    }
  
    if (!companyId || !storeId || !invoiceId) {
      console.error('companyId or storeId is undefined')
      setLoading(false)
      return
    }
  
    try {
      // Check if the item is a shirt
      const shirtRef = doc(db, `companies/${companyId}/warehouses/${itemToReturn.warehouseId}/shirts`, itemToReturn.productId)
      const shirtDoc = await getDoc(shirtRef)
      const isShirt = shirtDoc.exists()
  
      // Update the invoice
      const updatedItems = invoice.items.map((item) =>
        item.barcode === returnBarcode ? { ...item, returned: true } : item,
      )
      const updatedTotalSold = invoice.totalSold - itemToReturn.salePrice
      const updatedTotalEarn = invoice.totalEarn - (itemToReturn.salePrice - itemToReturn.baseprice)
  
      const invoiceRef = doc(db, `companies/${companyId}/stores/${storeId}/invoices`, invoiceId)
      await updateDoc(invoiceRef, {
        items: updatedItems,
        totalSold: updatedTotalSold,
        totalEarn: updatedTotalEarn,
      })
  
      // Return the item to the appropriate inventory
      const collectionPath = isShirt
        ? `companies/${companyId}/warehouses/${itemToReturn.warehouseId}/shirts`
        : `companies/${companyId}/warehouses/${itemToReturn.warehouseId}/products`
      const productRef = doc(db, collectionPath, itemToReturn.productId)
      const productDoc = await getDoc(productRef)
  
      if (productDoc.exists()) {
        const productData = productDoc.data()
        const updatedSizes = { ...productData.sizes }
        if (!updatedSizes[itemToReturn.size]) {
          updatedSizes[itemToReturn.size] = { barcodes: [], quantity: 0 }
        }
        updatedSizes[itemToReturn.size].barcodes.push(itemToReturn.barcode)
        updatedSizes[itemToReturn.size].quantity = (updatedSizes[itemToReturn.size].quantity || 0) + 1
  
        await updateDoc(productRef, {
          sizes: updatedSizes,
          total: increment(1),
        })
  
        // If the item was from an exhibition store (only for products)
        if (!isShirt && itemToReturn.exhibitionStore) {
          const exhibitionUpdate = {
            [`exhibition.${itemToReturn.exhibitionStore}`]: arrayUnion(itemToReturn.barcode),
          }
          await updateDoc(productRef, exhibitionUpdate)
        }
  
        toast({
          title: "Success",
          description: "Item returned successfully",
          duration: 1000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",
          },
        })
      } else {
        // If the product doesn't exist, create it
        const newProductData: Partial<ProductData> = {
          brand: itemToReturn.brand,
          reference: itemToReturn.reference,
          color: itemToReturn.color,
          sizes: {
            [itemToReturn.size]: {
              barcodes: [itemToReturn.barcode],
              quantity: 1,
            },
          },
          saleprice: itemToReturn.salePrice,
          baseprice: itemToReturn.baseprice,
          imageUrl: itemToReturn.imageUrl,
          total: 1,
        }
        await updateDoc(productRef, newProductData)
        toast({
          title: "Success",
          description: "Item returned and new product created",
          duration: 1000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",
          },
        })
      }
  
      await fetchInvoice()
      setReturnBarcode("")
    } catch (error) {
      console.error("Error returning item:", error)
      toast({
        title: "Error",
        description: "Failed to return item. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSearch = async () => {
    if (!addBarcode) {
      toast({
        title: "Error",
        description: "Please enter a barcode to search",
        variant: "destructive",
      })
      return
    }
  
    try {
      let foundProduct: InvoiceItem | null = null
  
      // Search in all warehouses
      for (const warehouseId of Object.keys(warehouses)) {
        // Search in products collection
        const productsRef = collection(db, `companies/${companyId}/warehouses/${warehouseId}/products`)
        const productsSnapshot = await getDocs(productsRef)
  
        for (const doc of productsSnapshot.docs) {
          const productData = doc.data() as ProductData
          for (const [size, sizeData] of Object.entries(productData.sizes)) {
            if (Array.isArray(sizeData.barcodes) && sizeData.barcodes.includes(addBarcode)) {
              foundProduct = {
                id: doc.id,
                productId: doc.id,
                brand: productData.brand,
                reference: productData.reference,
                color: productData.color,
                size: size,
                barcode: addBarcode,
                salePrice: productData.saleprice,
                baseprice: productData.baseprice,
                sold: false,
                addedAt: new Date(),
                exhibitionStore: null,
                warehouseId: warehouseId,
                isBox: false,
                imageUrl: productData.imageUrl,
                quantity: 1,
              }
              break
            }
          }
          if (foundProduct) break
        }
  
        // If not found in products, search in shirts collection
        if (!foundProduct) {
          const shirtsRef = collection(db, `companies/${companyId}/warehouses/${warehouseId}/shirts`)
          const shirtsSnapshot = await getDocs(shirtsRef)
  
          for (const doc of shirtsSnapshot.docs) {
            const shirtData = doc.data() as ProductData
            for (const [size, sizeData] of Object.entries(shirtData.sizes)) {
              if (Array.isArray(sizeData.barcodes) && sizeData.barcodes.includes(addBarcode)) {
                foundProduct = {
                  id: doc.id,
                  productId: doc.id,
                  brand: shirtData.brand,
                  reference: shirtData.reference,
                  color: shirtData.color,
                  size: size,
                  barcode: addBarcode,
                  salePrice: shirtData.saleprice,
                  baseprice: shirtData.baseprice,
                  sold: false,
                  addedAt: new Date(),
                  exhibitionStore: null,
                  warehouseId: warehouseId,
                  isBox: false,
                  imageUrl: shirtData.imageUrl,
                  quantity: 1,
                  // Optional: add isShirt flag if you want to track it
                  // isShirt: true
                }
                break
              }
            }
            if (foundProduct) break
          }
        }
  
        if (foundProduct) break
      }
  
      if (foundProduct) {
        setSearchResult(foundProduct)
      } else {
        setSearchResult(null)
        toast({
          title: "Error",
          description: "Product not found",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error searching for product:", error)
      toast({
        title: "Error",
        description: "An error occurred while searching for the product",
        variant: "destructive",
      })
    }
  }

  const handleAddToInvoice = async () => {
    if (!invoice || !searchResult) return
  
    const newItem: InvoiceItem = {
      ...searchResult,
      salePrice: Number(newSalePrice),
      sold: true,
      addedAt: new Date(),
      productId: searchResult.productId,
      assignedUser: "userId", // Placeholder - needs actual user ID
      assignedUserName: "userName", // Placeholder - needs actual user name
    }
  
    if (!newItem.salePrice) {
      setImageError("Please enter the price")
      return
    }
  
    if (!companyId || !storeId || !invoiceId) {
      console.error('companyId or storeId is undefined')
      setLoading(false)
      return
    }
  
    try {
      // Check if the item is a shirt
      const shirtRef = doc(db, `companies/${companyId}/warehouses/${searchResult.warehouseId}/shirts`, searchResult.productId)
      const shirtDoc = await getDoc(shirtRef)
      const isShirt = shirtDoc.exists()
  
      const updatedItems = [...invoice.items, newItem]
      const updatedTotalSold = invoice.totalSold + Number(newSalePrice)
      const updatedTotalEarn = invoice.totalEarn + (Number(newSalePrice) - searchResult.baseprice)
  
      const invoiceRef = doc(db, `companies/${companyId}/stores/${storeId}/invoices`, invoiceId)
      await updateDoc(invoiceRef, {
        items: updatedItems,
        totalSold: updatedTotalSold,
        totalEarn: updatedTotalEarn,
      })
  
      // Remove the barcode from the appropriate inventory
      if (searchResult.warehouseId) {
        const collectionPath = isShirt
          ? `companies/${companyId}/warehouses/${searchResult.warehouseId}/shirts`
          : `companies/${companyId}/warehouses/${searchResult.warehouseId}/products`
        const productRef = doc(db, collectionPath, searchResult.productId)
        const productDoc = await getDoc(productRef)
  
        if (productDoc.exists()) {
          const productData = productDoc.data()
          const updatedSizes = { ...productData.sizes }
          if (updatedSizes[searchResult.size]) {
            const barcodeIndex = updatedSizes[searchResult.size].barcodes.indexOf(searchResult.barcode)
            if (barcodeIndex > -1) {
              updatedSizes[searchResult.size].barcodes.splice(barcodeIndex, 1)
              updatedSizes[searchResult.size].quantity = (updatedSizes[searchResult.size].quantity || 0) - 1
              if (updatedSizes[searchResult.size].quantity === 0) {
                delete updatedSizes[searchResult.size]
              }
            }
            await updateDoc(productRef, {
              sizes: updatedSizes,
              total: increment(-1),
            })
          } else {
            console.error(`Size ${searchResult.size} not found in product ${searchResult.productId}`)
          }
        } else {
          console.error(`Product ${searchResult.productId} not found`)
        }
      }
  
      await fetchInvoice()
      setAddBarcode("")
      setNewSalePrice("")
      setSearchResult(null)
  
      toast({
        title: "Success",
        description: "Item added to invoice successfully",
        duration: 1000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (error) {
      console.error("Error adding item to invoice:", error)
      toast({
        title: "Error",
        description: "Failed to add item to invoice. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatDate = (date: Timestamp | Date) => {
    if (date instanceof Timestamp) {
      date = date.toDate()
    }
    return new Date(date).toLocaleString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  const exportToPDF = () => {
    if (!invoice) return
    const { jsPDF } = (window as any).jspdf;
    const pdf = new jsPDF()
    let yOffset = 20

    // Add invoice header
    pdf.setFontSize(20)
    pdf.text(`Invoice for ${invoice.customerName}`, 20, yOffset)
    yOffset += 10

    pdf.setFontSize(12)
    pdf.text(`Date: ${formatDate(invoice.createdAt)}`, 20, yOffset)
    yOffset += 10
    pdf.text(`Phone: ${invoice.customerPhone}`, 20, yOffset)
    yOffset += 10
    pdf.text(`Total: $${formatPrice(invoice.totalSold)}`, 20, yOffset)
    yOffset += 10
    pdf.text(`Total Earn: $${formatPrice(invoice.totalEarn)}`, 20, yOffset)
    yOffset += 20

    // Add item table
    const columns = ["Brand", "Reference", "Color", "Size", "Price", "Earn", "Location", "Added At", "Assigned User"]
    const data = invoice.items.map((item) => [
      item.brand,
      item.reference,
      item.color,
      item.size,
      `$${formatPrice(item.salePrice)}`,
      `$${formatPrice(item.salePrice - item.baseprice)}`,
      item.exhibitionStore
        ? `Exhibition: ${stores[item.exhibitionStore]}`
        : `Warehouse: ${warehouses[item.warehouseId || ""]}`,
      formatDate(item.addedAt),
      item.assignedUserName || "Not assigned",
    ])

    pdf.autoTable({
      head: [columns],
      body: data,
      startY: yOffset,
      theme: "grid",
    })

    // Save the PDF
    pdf.save(`Invoice_${invoice.customerName}_${formatDate(invoice.createdAt)}.pdf`)
  }

  const handleClear = () => {
    setSearchResult(null); // O setSearchResult({})
  };
  

  if (!invoice) {
    return InvoiceDetailSkeleton()
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800">
      <header className="bg-teal-600 text-white p-3 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => window.history.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Invoice {storeName}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-white">
              <Menu className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportToPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main className="m-4 mb-20">
        <Card className="mb-2 lg:w-1/2">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Invoice for {invoice?.customerName}</CardTitle>
            <div className="text-sm text-gray-500 dark:text-gray-200">Date: {invoice && formatDate(invoice.createdAt)}</div>
          </CardHeader>
          <CardContent> 
            <div className="mb-2">Store: {storeName || <Skeleton className="h-4 w-20" />}</div>
            <div className="mb-2">Customer Phone: {invoice?.customerPhone || <Skeleton className="h-4 w-20" />}</div>
            {hasPermission && hasPermission("ska") && (<>
            <div className="mb-2 text-lg font-semibold">
              Total Sold: ${invoice ? formatPrice(invoice.totalSold) : <Skeleton className="h-4 w-20" />}
            </div>
            </>)}
            {hasPermission && hasPermission("create") && (
            <div className="mb-2 text-lg font-semibold">
              Total Earn: ${invoice ? formatPrice(invoice.totalEarn) : <Skeleton className="h-4 w-20" />}
            </div>
            )}
          </CardContent>
        </Card>
        <div className="grid gap-4 lg:w-1/2">
          {hasPermission && hasPermission("create") && (
            <CollapsibleSection title="Cambios">
              <div>
                <Label htmlFor="returnBarcode">Return</Label>
                <div className="flex">
                  <Input
                    id="returnBarcode"
                    value={returnBarcode}
                    onChange={(e) => setReturnBarcode(e.target.value)}
                    placeholder="Enter barcode to return"
                    className="mr-2"
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button>Return</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will Return
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReturn} className="bg-red-600 dark:text-gray-200">
                          Return
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="mb-2">
                <Label htmlFor="addBarcode">Add to Invoice</Label>
                <div className="flex">
                  <Input
                    id="addBarcode"
                    value={addBarcode}
                    onChange={(e) => setAddBarcode(e.target.value)}
                    placeholder="Enter barcode to add"
                    className="mr-2"
                  />
                  <Button onClick={handleSearch}>Search</Button>
                  <Button onClick={handleClear} className="ml-2 bg-gray-300 text-black hover:bg-gray-400">
                    Clean
                  </Button>
                </div>
              </div>
            </CollapsibleSection>
          )}
        </div>
        {searchResult && (
          <Card className="mb-4">
            <CardContent className="p-4">
            <div className="flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {searchResult.brand} - {searchResult.reference}
                  </h3>
                  <p>Color: {searchResult.color}</p>
                  <p>Size: {searchResult.size}</p>
                  <p>Barcode: {searchResult.barcode}</p> 
                </div>
                <div className="w-24 h-24 relative shrink-0 overflow-hidden rounded-md">
                  <img
                    src={searchResult.imageUrl || "/placeholder.svg"}
                    alt={`${searchResult.brand} - ${searchResult.reference}`}
                    className="absolute object-cover rounded-md w-full h-full"
                  />
                </div>
              </div>
              <div className="flex mt-2">
                <Input
                  value={newSalePrice}
                  onChange={(e) => setNewSalePrice(e.target.value)}
                  placeholder="Enter sale price"
                  className="mr-2"
                />
                <Button onClick={handleAddToInvoice}>Add to Invoice</Button>
              </div>
              {imageError && <p className="text-red-500 text-sm mt-1">{imageError}</p>}
            </CardContent>
          </Card>
        )}
        <Card className='lg:w-1/2'>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Invoice Items</CardTitle>
            <span className="text-sm text-gray-500 dark:text-gray-200">({invoice.items.length} items)</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoice.items.map((item, index) => (
                <div key={index} className="flex items-start">
                  <span className="text-sm font-semibold text-gray-500 mr-2 mt-1 dark:text-gray-200">
                    {index + 1}
                  </span>
                  <Card className={`w-full ${item.returned ? "opacity-50 bg-gray-100" : ""}`}>
                    <CardContent className="p-2 flex flex-col">
                      {/* Contenedor para los textos principales e imagen */}
                      <div className="flex w-full">
                        {/* Contenedor de texto con flex-1 para empujar la imagen */}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">
                            {item.brand} - {item.reference}
                          </h3>
                          <p>Color: {item.color}</p>
                          {item.isBox ? <p>Box: {item.quantity}</p> : <p>Size: {item.size}</p>}
                          <p>Barcode: {item.barcode}</p>
                        </div>

                        {/* Imagen alineada a la derecha */}
                        <div className="w-24 h-24 relative shrink-0 overflow-hidden rounded-md">                          <img
                            src={item.imageUrl || "/placeholder.svg"}
                            alt={`${item.brand} - ${item.reference}`}
                            //fill
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Contenedor para información adicional debajo */}
                      <div className="mt-2">
                        {hasPermission && hasPermission("ska") && (
                          <p>Sale Price: ${formatPrice(item.salePrice)}</p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-300">
                          Added At: {formatDate(item.addedAt)}
                        </p>
                        <div className="flex space-x-2 text-sm text-gray-500 dark:text-gray-300">
                          {item.exhibitionStore ? (
                            <p>Exb: {stores[item.exhibitionStore]}</p>
                          ) : (
                            <p>WH: {warehouses[item.warehouseId || ""]}</p>
                          )}
                          {hasPermission && hasPermission("create") && (
                            <p>| Earn unit: ${formatPrice(Number(item.salePrice) - Number(item.baseprice))}</p>
                          )}
                          <p>
                            | Assigned to:{" "}
                            {item.assignedUserName
                              ? `${item.assignedUserName.split(" ")[0]} ${item.assignedUserName.split(" ")[1]?.charAt(0) || ""}`
                              : "Not assigned"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default withPermission(InvoicePage, ["ska"]);