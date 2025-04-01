'use client'

import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card"
import { Skeleton } from "../../components/ui/Skeleton"
import { ArrowLeft, Search, Save } from 'lucide-react'

export default function NewInvoiceSkeleton() {
  return (
    <div className="min-h-screen bg-blue-100 dark:bg-gray-800">
      <header className="bg-teal-600 text-white p-4 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" disabled>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow"><Skeleton className="h-6 w-32 inline-block" /></h1>
        <Button disabled>
          <Save className="h-4 w-4 mr-2" />
        </Button>
      </header>
      <main className="container mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter barcode"
                disabled
              />
              <Button disabled>
                <Search className="h-4 w-4 mr-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex space-x-4">
            <Input
              placeholder="Customer Name"
              disabled
            />
            <Input
              placeholder="Customer Phone"
              disabled
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(1)].map((_, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}