import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CodeSpaceLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-24 pb-8">
        {/* Header Skeleton */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chat Panel Skeleton */}
          <Card className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            <CardHeader className="border-b">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="flex-1 p-4">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Skeleton className="h-16 w-3/4 rounded-lg" />
                </div>
                <div className="flex justify-start">
                  <Skeleton className="h-24 w-3/4 rounded-lg" />
                </div>
                <div className="flex justify-end">
                  <Skeleton className="h-12 w-1/2 rounded-lg" />
                </div>
              </div>
            </CardContent>
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Skeleton className="h-[60px] flex-1" />
                <Skeleton className="h-[60px] w-20" />
              </div>
            </div>
          </Card>

          {/* Preview Panel Skeleton */}
          <Card className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            <CardHeader className="border-b">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <Skeleton className="h-full w-full rounded-none" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
