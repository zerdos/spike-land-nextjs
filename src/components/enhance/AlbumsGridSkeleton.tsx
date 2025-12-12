import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AlbumsGridSkeletonProps {
  count?: number;
  className?: string;
}

export function AlbumsGridSkeleton({
  count = 4,
  className,
}: AlbumsGridSkeletonProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          <Skeleton className="aspect-square rounded-2xl bg-muted" />
          <Skeleton className="mt-2 h-4 w-2/3 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
