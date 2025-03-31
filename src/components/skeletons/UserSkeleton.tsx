import { Skeleton } from "../ui/Skeleton"
import { Card, CardContent } from "..//ui/Card"

export function UserSkeleton() {
    return (
      <div className="container mx-auto bg-white">
        <header className="bg-teal-600 text-white p-3 flex items-center">
          <Skeleton className="h-6 w-6 mr-2" />
          <Skeleton className="h-6 w-32 flex-grow" />
          <Skeleton className="h-9 w-28" />
        </header>
        <div className="container mx-auto p-4 mb-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-3 w-[100px]" />
                        <Skeleton className="h-3 w-[120px]" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }