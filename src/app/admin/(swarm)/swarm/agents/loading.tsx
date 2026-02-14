import { Skeleton } from "@/components/ui/skeleton";

export default function AgentsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton variant="shimmer" className="h-8 w-36" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="shimmer" className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
