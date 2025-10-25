import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function MyAppsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-11 w-full sm:w-40" />
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>

        <Card className="border-dashed">
          <CardHeader className="text-center">
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-8">
            <div className="space-y-2">
              <Skeleton className="h-4 w-96 mx-auto" />
              <Skeleton className="h-3 w-64 mx-auto" />
            </div>
            <Skeleton className="h-11 w-48" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
