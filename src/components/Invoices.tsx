'use client'

import "../styles/global.css";
import { useState, useEffect } from 'react'
import { collection, getDocs, Timestamp, doc, getDoc, getFirestore} from 'firebase/firestore'
import { Button } from "../components/ui/Button"
import { Card, CardContent } from "../components/ui/Card"
import { Input } from "../components/ui/Input"
import { toast } from "../components/ui/UseToast"
import { ArrowLeft, MoreHorizontal, Pencil, Calendar, Store, FolderTree } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "../components/ui/DropdownMenu"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogCancel } from "../components/ui/AlertDialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/Select"
import { InvoiceSkeleton } from '../components/skeletons/InvoiceSkeleton'
import { Skeleton } from '../components/ui/Skeleton'
import { withPermission } from "../components/WithPermission"
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  }  

interface InvoiceItem {
  productId: string
  brand: string
  reference: string
  color: string
  size: string
  barcode: string
  salePrice: number
  baseprice: number
  earn: number
  sold: boolean
  addedAt: Timestamp
  exhibitionStore: string | null
  warehouseId: string | null
  imageUrl: string
  isBox: boolean
  quantity: number
}

interface Invoice {
  id: string
  storeId: string
  storeName: string
  customerName: string
  customerPhone: string
  createdAt: Timestamp
  totalSold: number
  totalEarn: number
  items: InvoiceItem[]
  companyId: string
  invoiceId: string
  status: 'open' | 'closed'
}

interface Store {
  id: string
  name: string
}

interface InvoicesProps {
    firebaseConfig: FirebaseConfig;
    companyId?: string;
    hasPermission?: (action: string) => boolean;
  }

function InvoicesPage({ firebaseConfig, companyId, hasPermission }: InvoicesProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('all')
  const [sortOrder, ] = useState<'date' | 'name'>('date')
  const [, setCompanyName] = useState<string>('')
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined)
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined)
  const [selectedDay, setSelectedDay] = useState<number | undefined>(undefined)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [availableMonths, setAvailableMonths] = useState<number[]>([])
  const [availableDays, setAvailableDays] = useState<number[]>([])
  const [activeCardId, setActiveCardId] = useState<string | null>(null)

  const app: FirebaseApp = initializeApp(firebaseConfig);
  const auth: Auth = getAuth(app);
  const db = getFirestore(app);

  useEffect(() => {
    const fetchCompanyAndStoresAndInvoices = async () => {
      setLoading(true)
      try {
        if (!companyId) {
          throw new Error('Company ID is undefined')
        }

        // Fetch company name
        const companyRef = doc(db, 'companies', companyId)
        const companyDoc = await getDoc(companyRef)
        if (companyDoc.exists()) {
          setCompanyName(companyDoc.data().name)
        } else {
          throw new Error('Company not found')
        }

        // Fetch stores
        const storesRef = collection(db, `companies/${companyId}/stores`)
        const storesSnapshot = await getDocs(storesRef)
        const storesData = storesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }))
        setStores(storesData)

        // Fetch invoices from all stores
        let allInvoices: Invoice[] = []
        for (const store of storesData) {
          const invoicesRef = collection(db, `companies/${companyId}/stores/${store.id}/invoices`)
          const invoicesSnapshot = await getDocs(invoicesRef)
          const storeInvoices = invoicesSnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            storeId: store.id,
            storeName: store.name,
            companyId: companyId
          } as Invoice))
          allInvoices = [...allInvoices, ...storeInvoices]
        }
        setInvoices(allInvoices)
        setFilteredInvoices(allInvoices)

        // Set available years
        const years = Array.from(new Set(allInvoices.map(invoice => invoice.createdAt.toDate().getFullYear())))
        setAvailableYears(years.sort((a, b) => b - a))
      } catch (err) {
        console.error('Error fetching company, stores and invoices:', err)
        toast({
          title: "Error",
          description: "Failed to fetch invoices. Please try again later.",
          variant: "destructive",
        })
        window.location.href = '/companies' // Redirect to companies page on error
      } finally {
        setLoading(false)
      }
    }
    fetchCompanyAndStoresAndInvoices()
  }, [companyId])

  useEffect(() => {
    filterAndSortInvoices()
  }, [selectedStore, sortOrder, searchTerm, invoices, selectedYear, selectedMonth, selectedDay])

  useEffect(() => {
    if (selectedYear) {
      const months = Array.from(new Set(invoices
        .filter(invoice => invoice.createdAt.toDate().getFullYear() === selectedYear)
        .map(invoice => invoice.createdAt.toDate().getMonth())
      ))
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
      const days = Array.from(new Set(invoices
        .filter(invoice => {
          const date = invoice.createdAt.toDate()
          return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth
        })
        .map(invoice => invoice.createdAt.toDate().getDate())
      ))
      setAvailableDays(days.sort((a, b) => a - b))
      setSelectedDay(undefined)
    } else {
      setAvailableDays([])
      setSelectedDay(undefined)
    }
  }, [selectedYear, selectedMonth, invoices])

  const filterAndSortInvoices = () => {
    let filtered = invoices

    // Filter by store
    if (selectedStore !== 'all') {
      filtered = filtered.filter(invoice => invoice.storeId === selectedStore)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (invoice) =>
          invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (invoice.invoiceId && invoice.invoiceId.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (invoice.items &&
            invoice.items.some((item) => item.barcode.toLowerCase().includes(searchTerm.toLowerCase()))),
      )
    }

    // Filter by date
    if (selectedYear) {
      filtered = filtered.filter(invoice => invoice.createdAt.toDate().getFullYear() === selectedYear)
    }
    if (selectedMonth !== undefined) {
      filtered = filtered.filter(invoice => invoice.createdAt.toDate().getMonth() === selectedMonth)
    }
    if (selectedDay) {
      filtered = filtered.filter(invoice => invoice.createdAt.toDate().getDate() === selectedDay)
    }

    // Sort
    if (sortOrder === 'date') {
      filtered.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)
    } else {
      filtered.sort((a, b) => a.customerName.localeCompare(b.customerName))
    }

    // Sort by status and invoiceId
    filtered.sort((a, b) => {
      if (a.status === 'open' && b.status !== 'open') return -1
      if (a.status !== 'open' && b.status === 'open') return 1
      return parseInt(b.invoiceId) - parseInt(a.invoiceId)
    })

    setFilteredInvoices(filtered)
  }

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }
  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null) {
      return '0'
    }
    return price.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  } 
 
  // const calculateTotalProductItems = (invoices: Invoice[]) => {
  //   return invoices.reduce((sum, invoice) => {
  //     if (Array.isArray(invoice.items)) {
  //       return sum + invoice.items.reduce((itemSum, item) => {
  //         const quantity = typeof item.quantity === 'number' ? item.quantity : 0
  //         return itemSum + quantity
  //       }, 0)
  //     }
  //     return sum
  //   }, 0)
  // }

  const totalInvoices = filteredInvoices.length
  //const totalProductItems = calculateTotalProductItems(filteredInvoices)
  const totalSold = filteredInvoices.reduce((sum, invoice) => sum + (invoice.totalSold || 0), 0)
  const totalEarn = filteredInvoices.reduce((sum, invoice) => sum + (invoice.totalEarn || 0), 0)

  const handleClearFilters = () => {
    setSelectedYear(undefined)
    setSelectedMonth(undefined)
    setSelectedDay(undefined)
    setIsFilterDialogOpen(false)
  }

  const handleCardClick = (invoiceId: string) => {
    setActiveCardId(activeCardId === invoiceId ? null : invoiceId)
  }
  const formatInvoiceId = (invoiceId: string | undefined) => {
    if (!invoiceId) return '...'
    return invoiceId.slice(-4)
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
      <header className="bg-teal-600 text-white p-4 flex items-center sticky top-0 z-50">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => window.history.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Invoices</h1>
        <AlertDialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-white p-2 mr-2">
              <Calendar className="h-6 w-6" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Filter Invoices</AlertDialogTitle>
              <AlertDialogDescription>
                Select a date range to filter invoices.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <Select value={selectedYear?.toString()} onValueChange={(value) => setSelectedYear(value ? parseInt(value) : undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                value={selectedMonth?.toString()} 
                onValueChange={(value) => setSelectedMonth(value ? parseInt(value) : undefined)}
                disabled={!selectedYear}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2000, month).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                value={selectedDay?.toString()} 
                onValueChange={(value) => setSelectedDay(value ? parseInt(value) : undefined)}
                disabled={!selectedYear || selectedMonth === undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Day" />
                </SelectTrigger>
                <SelectContent>
                  {availableDays.map((day) => (
                    <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter className="flex justify-between items-end">
              <AlertDialogCancel className='bg-black text-white'>Close</AlertDialogCancel>
              <Button className="dark:border-gray-200" onClick={handleClearFilters} variant="outline">Clear Filters</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-white p-2">
              <Store className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSelectedStore('all')}>All Stores</DropdownMenuItem>
            {stores.map(store => (
              <DropdownMenuItem key={store.id} onClick={() => setSelectedStore(store.id)}>
                {store.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">
              <FolderTree className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {stores.map(store => (
              <DropdownMenuItem key={store.id} asChild>
                <a href={`/companies/${companyId}/store/${store.id}/invoices`}>
                  {store.name}
                </a>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="container mx-auto p-4 relative z-0">
        <div className="mb-4">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, barcode, invoiceID"
            className="w-full"
          />
        </div>
        <div className="bg-white rounded-lg p-4 mb-2 shadow text-slate-900 dark:bg-gray-700 dark:text-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-semibold">Total Items</h3>
              <p className="text-lg">{totalInvoices}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Total Sold</h3>
              <p className="text-lg">${formatPrice(totalSold)}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Total Earn</h3>
              <p className="text-lg">${formatPrice(totalEarn)}</p>
            </div>
          </div>
        </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="relative">
                <Card className="mt-4 overflow-hidden" onClick={() => handleCardClick(invoice.id)}>
                  <CardContent className="p-4">
                    <div className="absolute top-2 right-2 mt-4">
                    {activeCardId === invoice.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {invoice.status === 'open' && (
                          <DropdownMenuItem asChild>
                            <a href={`/companies/${companyId}/store/${invoice.storeId}/invoices/${invoice.id}/edit`}>
                              Edit Invoice
                            </a>
                          </DropdownMenuItem>
                          )}{invoice.status === 'closed' && (
                          <DropdownMenuItem>
                            <a href={`/companies/${invoice.companyId}/store/${invoice.storeId}/invoices/${invoice.id}`} className="flex items-center">
                              <Pencil className="mr-2 h-4 w-4" />
                              Update
                            </a>
                          </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    </div>
                    <div className='w-full'>
                      <div>
                        <span className="absolute top-0 left-0 bg-teal-600 text-white px-2 py-1 rounded-tl-lg rounded-br-lg z-10">
                         {formatInvoiceId(invoice.invoiceId)}
                        </span>
                        <h3 className="font-semibold">{invoice.customerName}</h3>
                      </div>
                      <div className="text-sm">
                        <p className="text-gray-700 dark:text-gray-200">Phone: {invoice.customerPhone}</p>                                        
                      </div>
                        <div className='flex flex-col items-end mt-1'>
                          <div className='flex justify-end'>
                            <p className="text-sm font-semibold mr-2">Total:</p>
                            <p className="text-sm">${formatPrice(invoice.totalSold)}</p>
                          </div>
                      </div>
                      <div className='flex justify-between items-center'>
                        <p className="text-gray-500 text-sm dark:text-gray-200">Store: {invoice.storeName}</p>
                        <div className='flex justify-end'>
                            <p className="text-sm font-semibold mr-2">Earn:</p>
                            <p className="text-sm">${formatPrice(invoice.totalEarn)}</p>
                        </div>
                      </div>
                      <div className='flex justify-between items-center mt-2'>
                          <p className={`text-sm font-medium ${invoice.status === 'open' ? 'text-yellow-600' : 'text-green-600'}`}>
                            Status: {invoice.status}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-200">{formatDate(invoice.createdAt)}</p>
                        </div>  
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
      </main>
    </div>
  )
}

export default withPermission(InvoicesPage, ["create"])