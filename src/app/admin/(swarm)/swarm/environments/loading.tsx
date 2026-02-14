import { Skeleton } from "@/components/ui/skeleton";

export default function EnvironmentsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton variant="shimmer" className="h-8 w-40" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="shimmer" className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
