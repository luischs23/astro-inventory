import { Card, CardContent } from "../../components/ui/Card"
import { Skeleton } from "../../components/ui/Skeleton"

export function WarehouseCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex">
        <div className="w-1/3">
          <Skeleton className="h-full w-full" />
        </div>
        <CardContent className="w-2/3 p-4 relative">
          <div className="absolute top-2 right-2 flex">
            <Skeleton className="h-8 w-8 rounded-full mr-1" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </div>
    </Card>
  )
}