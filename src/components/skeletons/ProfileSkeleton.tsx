import { Skeleton } from "../ui/Skeleton"
import { Button } from "../ui/Button"
import { ArrowLeft} from 'lucide-react'

export function ProfileSkeleton() {
  return (
    <div className="container mx-auto p-4 mb-20 bg-white dark:bg-gray-600">
      <div className="p-4 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="text-black"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <span className="ml-2 text-lg text-black">Your profile</span>
      </div>
      <main className='mb-44'>
        <div className="flex flex-col items-center mt-4 mb-8 bg-white dark:bg-gray-600">
          <div className="relative">
            <Skeleton className="w-[120px] h-[120px] rounded-full" />
            <Skeleton className="absolute bottom-0 right-0 w-8 h-8 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-6 w-40" />
        </div>
        {/* Menu Items */}
        <div className="px-4 space-y-3">
          <Skeleton className="w-full h-14" />
          <Skeleton className="w-full h-14" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-600">
          <Skeleton className="w-full h-10 mb-4" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </main>
    </div>
  )
}

