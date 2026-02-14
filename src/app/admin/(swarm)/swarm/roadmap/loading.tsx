import { Skeleton } from "@/components/ui/skeleton";

export default function RoadmapLoading() {
  return (
    <div className="space-y-6">
      <Skeleton variant="shimmer" className="h-8 w-32" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton variant="shimmer" className="h-6 w-24" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} variant="shimmer" className="h-24 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
