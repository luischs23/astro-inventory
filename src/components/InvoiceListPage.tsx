'use client'

import "../styles/global.css";
import { useState, useEffect, useMemo} from 'react'
import { collection, getDocs, doc, getDoc, Timestamp, deleteDoc, addDoc, updateDoc, serverTimestamp, query, orderBy, getFirestore } from 'firebase/firestore'
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/DropdownMenu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/AlertDialog"
import { Input } from "../components/ui/Input"
import { Label } from "../components/ui/Label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/Select"
import { Skeleton } from "../components/ui/Skeleton"
import { ArrowLeft, Calendar, MoreVertical, Menu, PlusIcon } from 'lucide-react'
import { toast } from "../components/ui/UseToast"
import { InvoiceSkeleton } from '../components/skeletons/InvoiceSkeleton'
import { withPermission } from "../components/WithPermission"
import { getApp, getApps, initializeApp } from "firebase/app";

interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  }  

interface Invoice {
  id: string
  customerName: string
  createdAt: Timestamp
  totalSold: number
  customerPhone: string
  status: "open" | "closed"
  invoiceId: string
  items?: { barcode: string; quantity: number; price: number }[]
}

interface Store {
  name: string
}

interface InvoiceListPageProps {
  firebaseConfig: FirebaseConfig;
  companyId?: string;
  storeId?: string;
  hasPermission?: (action: string) => boolean;
}

function InvoiceListPage({firebaseConfig, companyId, storeId, hasPermission}: InvoiceListPageProps) {  
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [storeName, setStoreName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)
  const [isNewInvoiceDialogOpen, setIsNewInvoiceDialogOpen] = useState(false)
  const [isEditInvoiceDialogOpen, setIsEditInvoiceDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [newCustomerName, setNewCustomerName] = useState("")
  const [newCustomerPhone, setNewCustomerPhone] = useState("")
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined)
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined)
  const [selectedDay, setSelectedDay] = useState<number | undefined>(undefined)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [availableMonths, setAvailableMonths] = useState<number[]>([])
  const [availableDays, setAvailableDays] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")

    if (!getApps().length) {
        initializeApp(firebaseConfig);
      }
      const app = getApp();
      const db = getFirestore(app);

  useEffect(() => {
    fetchStoreAndInvoices()
  }, [companyId, storeId])

  useEffect(() => {
    if (invoices.length > 0) {
      const years = Array.from(new Set(invoices.map((invoice) => invoice.createdAt.toDate().getFullYear())))
      setAvailableYears(years.sort((a, b) => b - a))
    }
  }, [invoices])

  useEffect(() => {
    if (selectedYear) {
      const months = Array.from(
        new Set(
          invoices
            .filter((invoice) => invoice.createdAt.toDate().getFullYear() === selectedYear)
            .map((invoice) => invoice.createdAt.toDate().getMonth()),
        ),
      )
      setAvailableMonths(months.sort((a, b) => a - b))
      setSelectedMonth(undefined)
      setSelectedDay(undefined)
    } else {
      setAvailableMonths([])
      setSelectedMonth(undefined)
      setSelectedDay(undefined)
    }
  }, [selectedYear, invoices])

  useEffect(() => {
    if (selectedYear && selectedMonth !== undefined) {
      const days = Array.from(
        new Set(
          invoices
            .filter((invoice) => {
              const date = invoice.createdAt.toDate()
              return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth
            })
            .map((invoice) => invoice.createdAt.toDate().getDate()),
        ),
      )
      setAvailableDays(days.sort((a, b) => a - b))
      setSelectedDay(undefined)
    } else {
      setAvailableDays([])
      setSelectedDay(undefined)
    }
  }, [selectedYear, selectedMonth, invoices])

  useEffect(() => {
    filterInvoices()
  }, [selectedYear, selectedMonth, selectedDay, invoices, searchTerm])

  const fetchStoreAndInvoices = async () => {
    if (!companyId || !storeId) {
        console.error('companyId or storeId is undefined');
        setLoading(false);
        return;
      }    
    setLoading(true)
    setError(null)

    try {
      const storeRef = doc(db, `companies/${companyId}/stores`, storeId)
      const storeDoc = await getDoc(storeRef)
      if (storeDoc.exists()) {
        const storeData = storeDoc.data() as Store
        setStoreName(storeData.name)
      }

      const invoicesRef = collection(db, `companies/${companyId}/stores/${storeId}/invoices`)
      const q = query(invoicesRef, orderBy("createdAt", "desc"))
      const querySnapshot = await getDocs(q)
      const invoiceList = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt as Timestamp,
          }) as Invoice,
      )
      setInvoices(invoiceList)
      setFilteredInvoices(invoiceList)
    } catch (err) {
      console.error("Error fetching store and invoices:", err)
      setError("Failed to fetch store and invoices. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const filterInvoices = () => {
    let filtered = invoices
    if (selectedYear) {
      filtered = filtered.filter((invoice) => invoice.createdAt.toDate().getFullYear() === selectedYear)
    }
    if (selectedMonth !== undefined) {
      filtered = filtered.filter((invoice) => invoice.createdAt.toDate().getMonth() === selectedMonth)
    }
    if (selectedDay) {
      filtered = filtered.filter((invoice) => invoice.createdAt.toDate().getDate() === selectedDay)
    }
    if (searchTerm) {
      filtered = filtered.filter(
        (invoice) =>
          invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (invoice.invoiceId && invoice.invoiceId.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (invoice.items &&
            invoice.items.some((item) => item.barcode.toLowerCase().includes(searchTerm.toLowerCase()))),
      )
    }
    setFilteredInvoices(filtered)
  }

  const sortedInvoices = useMemo(() => {
    return filteredInvoices
  }, [filteredInvoices])

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    return date.toLocaleDateString()
  }

  const formatPrice = (price: number): string => {
    return price.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const handleDelete = async () => {
    if (invoiceToDelete) {
      try {
        await deleteDoc(doc(db, `companies/${companyId}/stores/${storeId}/invoices`, invoiceToDelete.id))
        setInvoices(invoices.filter((invoice) => invoice.id !== invoiceToDelete.id))
        setFilteredInvoices(filteredInvoices.filter((invoice) => invoice.id !== invoiceToDelete.id))
        toast({
          title: "Success",
          description: `Invoice for ${invoiceToDelete.customerName} has been deleted successfully.`,
          variant: "default",
          duration: 500,
          style: { background: "#4CAF50", color: "white", fontWeight: "bold" },
        })
      } catch (error) {
        console.error("Error deleting invoice:", error)
        toast({
          title: "Error",
          description: `Failed to delete the invoice for ${invoiceToDelete.customerName}.`,
          variant: "destructive",
        })
      } finally {
        setInvoiceToDelete(null)
      }
    }
  }

  const handleCreateNewInvoice = async () => {
    if (isCreatingInvoice) return // Prevent multiple submissions

    setIsCreatingInvoice(true)
    try {
      const newInvoiceRef = await addDoc(
        collection(db, `companies/${companyId}/stores/${storeId}/invoices`),
        {
          customerName: newCustomerName,
          customerPhone: newCustomerPhone,
          createdAt: serverTimestamp(),
          totalSold: 0,
          status: "open",
        },
      )

      const newInvoice: Invoice = {
        id: newInvoiceRef.id,
        customerName: newCustomerName,
        customerPhone: newCustomerPhone,
        createdAt: Timestamp.now(),
        totalSold: 0,
        status: "open",
        invoiceId: "",
      }

      setInvoices([newInvoice, ...invoices])
      setFilteredInvoices([newInvoice, ...filteredInvoices])
      setIsNewInvoiceDialogOpen(false)
      setNewCustomerName("")
      setNewCustomerPhone("")

      toast({
        title: "Success",
        description: "New invoice created successfully.",
        variant: "default",
        duration: 700,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (error) {
      console.error("Error creating new invoice:", error)
      toast({
        title: "Error",
        description: "Failed to create new invoice. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingInvoice(false)
    }
  }

  const handleEditInvoice = async () => {
    if (editingInvoice) {
      try {
        await updateDoc(doc(db, `companies/${companyId}/stores/${storeId}/invoices`, editingInvoice.id), {
          customerName: newCustomerName,
          customerPhone: newCustomerPhone,
        })

        const updatedInvoice = { ...editingInvoice, customerName: newCustomerName, customerPhone: newCustomerPhone }
        setInvoices(invoices.map((invoice) => (invoice.id === editingInvoice.id ? updatedInvoice : invoice)))
        setFilteredInvoices(
          filteredInvoices.map((invoice) => (invoice.id === editingInvoice.id ? updatedInvoice : invoice)),
        )
        setIsEditInvoiceDialogOpen(false)
        setEditingInvoice(null)
        setNewCustomerName("")
        setNewCustomerPhone("")

        toast({
          title: "Success",
          description: "Invoice updated successfully.",
          variant: "default",
        })
      } catch (error) {
        console.error("Error updating invoice:", error)
        toast({
          title: "Error",
          description: "Failed to update invoice. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleClearFilters = () => {
    setSelectedYear(undefined)
    setSelectedMonth(undefined)
    setSelectedDay(undefined)
    setSearchTerm("")
    setFilteredInvoices(invoices)
    setIsFilterDialogOpen(false)
  }

  const openEditDialog = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setNewCustomerName(invoice.customerName)
    setNewCustomerPhone(invoice.customerPhone)
    setIsEditInvoiceDialogOpen(true)
  }

  const handleCardClick = (invoiceId: string) => {
    setActiveCardId(activeCardId === invoiceId ? null : invoiceId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-100">
        <header className="bg-teal-600 text-white p-4 flex items-center">
          <Skeleton className="h-6 w-6 mr-2" />
          <Skeleton className="h-8 w-48 mr-2 flex-grow" />
          <Skeleton className="h-10 w-32" />
        </header>
        <main className="container mx-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(1)].map((_, index) => (
              <InvoiceSkeleton key={index} />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return <div className="min-h-screen bg-blue-100 flex items-center justify-center text-red-500">{error}</div>
  }

  return (
    <div className="min-h-screen bg-blue-100 dark:bg-gray-800">
      <header className="bg-teal-600 text-white p-3 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => window.history.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Invoices {storeName}</h1>
        <AlertDialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-white p-2 mr-2">
              <Calendar className="h-6 w-6" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Filter Invoices</AlertDialogTitle>
              <AlertDialogDescription>Select a date range to filter invoices.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <Select
                value={selectedYear?.toString()}
                onValueChange={(value) => setSelectedYear(value ? Number.parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedMonth?.toString()}
                onValueChange={(value) => setSelectedMonth(value ? Number.parseInt(value) : undefined)}
                disabled={!selectedYear}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2000, month).toLocaleString("default", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedDay?.toString()}
                onValueChange={(value) => setSelectedDay(value ? Number.parseInt(value) : undefined)}
                disabled={!selectedYear || selectedMonth === undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Day" />
                </SelectTrigger>
                <SelectContent>
                  {availableDays.map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter className="flex justify-between items-end">
              <AlertDialogCancel className="bg-black text-white">Close</AlertDialogCancel>
              <Button className="dark:border-gray-300" onClick={handleClearFilters} variant="outline">
                Clear Filters
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {hasPermission && hasPermission("create") && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-white">
                <Menu className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsNewInvoiceDialogOpen(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                New Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      <main className="container mx-auto p-4 pb-20 ">
        <div className="mb-4 lg:w-1/2">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, barcode, invoice ID"
            className="w-full"
          /> 
        </div>
        <div className="mb-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedInvoices
              .filter((invoice) => invoice.status === "open")
              .map((invoice) => (
                <div key={invoice.id} className="relative">
                  <Card className="p-2" onClick={() => handleCardClick(invoice.id)}>
                    <CardHeader className="relative">
                      {activeCardId === invoice.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-6 w-6 p-0 absolute top-1 right-1">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {invoice.status === "closed" && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={`/companies/${companyId}/store/${storeId}/invoices/${invoice.id}`}
                                >
                                  View Details
                                </a>
                              </DropdownMenuItem>
                            )}
                            {invoice.status === "open" && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={`/companies/${companyId}/store/${storeId}/invoices/${invoice.id}/edit`}
                                >
                                  Add products
                                </a>
                              </DropdownMenuItem>
                            )}
                            {hasPermission && hasPermission("create") && (
                              <DropdownMenuItem onClick={() => openEditDialog(invoice)}>Edit Card</DropdownMenuItem>
                            )}
                            {hasPermission && hasPermission("delete") && (
                              <DropdownMenuItem onClick={() => setInvoiceToDelete(invoice)}>Delete</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <CardTitle className="text-lg font-semibold text-teal-700 dark:text-teal-400">{invoice.customerName}</CardTitle>
                      <p className="text-sm ">{invoice.customerPhone}</p>
                    </CardHeader>
                    <CardContent className="flex flex-row justify-between">
                      <p className="text-sm text-gray-500 dark:text-gray-200">{formatDate(invoice.createdAt)}</p>
                      {hasPermission && hasPermission("ska") && (
                        <p className="text-base font-medium">Total: ${formatPrice(invoice.totalSold)}</p>
                      )}
                    </CardContent>
                    <CardContent className="flex flex-row justify-between">
                      <p
                        className={`text-sm font-medium ${invoice.status === "open" ? "text-yellow-600" : "text-green-600"}`}
                      >
                        Status: {invoice.status === "open" ? "Open" : "Closed"}
                      </p>
                      <p className="text-sm text-gray-500">{invoice.invoiceId}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedInvoices
            .filter((invoice) => invoice.status !== "open")
            .map((invoice, index) => (
              <div key={invoice.id} className="relative flex justify-start items-start">
                <div className="text-sm font-semibold mr-2 mt-2 text-black dark:text-gray-200">{index + 1}</div>
                <Card className="p-2 flex-grow" onClick={() => handleCardClick(invoice.id)}>
                  <CardHeader className="relative">
                    {activeCardId === invoice.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-6 w-6 p-0 absolute top-1 right-1">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {invoice.status === "closed" && (
                            <DropdownMenuItem asChild>
                              <a
                                href={`/companies/${companyId}/store/${storeId}/invoices/${invoice.id}`}
                              >
                                View Details
                              </a>
                            </DropdownMenuItem>
                          )}
                          {invoice.status === "open" && (
                            <DropdownMenuItem asChild>
                              <a
                                href={`/companies/${companyId}/store/${storeId}/invoices/${invoice.id}/edit`}
                              >
                                Add products
                              </a>
                            </DropdownMenuItem>
                          )}
                          {hasPermission && hasPermission("create") && (
                            <DropdownMenuItem onClick={() => openEditDialog(invoice)}>Edit Card</DropdownMenuItem>
                          )}
                          {hasPermission && hasPermission("delete") && (
                            <DropdownMenuItem onClick={() => setInvoiceToDelete(invoice)}>Delete</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <CardTitle className="text-lg font-semibold text-teal-700 dark:text-teal-400">{invoice.customerName}</CardTitle>
                    <p className="text-sm ">{invoice.customerPhone}</p>
                  </CardHeader>
                  <CardContent className="flex flex-row justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-200">{formatDate(invoice.createdAt)}</p>
                    {hasPermission && hasPermission("ska") && (
                      <p className="text-base font-medium">Total: ${formatPrice(invoice.totalSold)}</p>
                    )}
                  </CardContent>
                  <CardContent className="flex flex-row justify-between items-start">
                    <p
                      className={`text-sm font-medium ${invoice.status === "open" ? "text-yellow-600" : "text-green-600"}`}
                    >
                      Status: {invoice.status === "open" ? "Open" : "Closed"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-200">{invoice.invoiceId}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
        </div>
      </main>

      <AlertDialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the invoice for
              <span className="font-semibold"> {invoiceToDelete?.customerName} </span>
              with a total of ${invoiceToDelete?.totalSold}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isNewInvoiceDialogOpen} onOpenChange={setIsNewInvoiceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Invoice</AlertDialogTitle>
            <AlertDialogDescription>Enter customer details to create a new invoice.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleCreateNewInvoice} disabled={isCreatingInvoice}>
              {isCreatingInvoice ? "Creating..." : "Create Invoice"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isEditInvoiceDialogOpen} onOpenChange={setIsEditInvoiceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Invoice</AlertDialogTitle>
            <AlertDialogDescription>Update customer details for this invoice.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phone" className="text-right">
                Phone
              </Label>
              <Input
                id="edit-phone"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleEditInvoice}>Update Invoice</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default withPermission(InvoiceListPage, ["ska"]);