import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card"
import { Skeleton } from "../../components/ui/Skeleton"

export function ProductFormSkeleton() {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle><Skeleton className="h-8 w-3/4" /></CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Product Name */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-24 w-full" />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Price and Stock */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Active Switch */}
        <div className="flex items-center space-x-2">
          <Skeleton className="h-6 w-10 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Submit Button */}
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}