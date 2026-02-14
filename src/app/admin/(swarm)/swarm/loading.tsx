import { Skeleton } from "@/components/ui/skeleton";

export default function SwarmLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton variant="shimmer" className="h-8 w-48" />
        <Skeleton variant="shimmer" className="h-9 w-24" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="shimmer" className="h-40 w-full" />
        ))}
      </div>
    </div>
  );
}
