import { Button } from "../../components/ui/Button"
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../../components/ui/DropdownMenu"
import { Skeleton } from "../../components/ui/Skeleton"
import { Input } from "../../components/ui/Input"
import { Label } from "../../components/ui/Label"
import { ArrowLeft, Menu, FileDown } from "lucide-react"

export default function InvoiceDetailSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-teal-600 text-white p-3 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Invoice <Skeleton className="inline-block w-24 h-6" /></h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-white">
              <Menu className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main className='m-4 mb-20'>
        <Card className="mb-2">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Invoice for <Skeleton className="inline-block w-32 h-8" /></CardTitle>
            <div className="text-sm text-gray-500">
              Date: <Skeleton className="inline-block w-24 h-4" />
            </div>
          </CardHeader>
          <CardContent> 
            <div className="mb-2">Store: <span><Skeleton className="inline-block w-24 h-4" /></span></div>
            <div className="mb-2">Customer Phone: <span><Skeleton className="inline-block w-32 h-4" /></span></div>
            <div className="mb-2 text-lg font-semibold">Total Sold: <span><Skeleton className="inline-block w-24 h-6" /></span></div>
            <div className="mb-2 text-lg font-semibold">Total Earn: <span><Skeleton className="inline-block w-24 h-6" /></span></div>
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Cambios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="returnBarcode">Return</Label>
                  <div className="flex">
                    <Input
                      id="returnBarcode"
                      placeholder="Enter barcode to return"
                      className="mr-2"
                    />
                    <Button>Return</Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="addBarcode">Add to Invoice</Label>
                  <div className="flex">
                    <Input
                      id="addBarcode"
                      placeholder="Enter barcode to add"
                      className="mr-2"
                    />
                    <Button>Search</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="mt-4">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Invoice Items</CardTitle>
            <span className="text-sm text-gray-500">(<Skeleton className="inline-block w-8 h-4" /> items)</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((_, index) => (
                <div key={index} className="flex items-start">
                  <span className="text-sm font-semibold text-gray-500 mr-2 mt-1">{index + 1}</span>
                  <Card className="w-full">
                    <CardContent className="p-2 flex items-center justify-between">
                      <div className="flex-1">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2 mb-1" />
                        <Skeleton className="h-4 w-1/3 mb-1" />
                        <Skeleton className="h-4 w-2/3 mb-1" />
                        <Skeleton className="h-4 w-1/4 mb-1" />
                        <Skeleton className="h-4 w-1/2 mb-1" />
                        <div className='flex space-x-4'>
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                      <div className="w-24 h-24 bg-gray-200 rounded-md"></div>
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