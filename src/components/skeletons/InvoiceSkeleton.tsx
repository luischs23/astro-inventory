import { Card, CardContent, CardHeader } from "../ui/Card"
import { Skeleton } from "../ui/Skeleton"

export function InvoiceSkeleton() {
  return (
    <div className="relative">
      <div className="absolute top-2 left-2 w-8 h-8 bg-gray-200 rounded-full z-10"></div>
      <Card className="border-2 shadow-md p-2">
        <CardHeader>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className='flex justify-between items-center'>
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
        </CardContent>
      </Card>
    </div>
  )
}