import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConnectionWarmthBadgeProps {
  score: number;
  className?: string;
  showScore?: boolean;
}

export function ConnectionWarmthBadge({
  score,
  className,
  showScore = true,
}: ConnectionWarmthBadgeProps) {
  let colorClass = "bg-gray-100 text-gray-800";
  let icon = "❄️";
  let label = "Cold";

  if (score >= 80) {
    colorClass = "bg-red-100 text-red-800 border-red-200";
    icon = "🔥";
    label = "Hot";
  } else if (score >= 50) {
    colorClass = "bg-orange-100 text-orange-800 border-orange-200";
    icon = "🌡️";
    label = "Warm";
  } else if (score >= 20) {
    colorClass = "bg-blue-100 text-blue-800 border-blue-200";
    icon = "🧊";
    label = "Cool";
  }

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 px-2 py-0.5 font-normal", colorClass, className)}
    >
      <span>{icon}</span>
      <span className="font-medium">{label}</span>
      {showScore && (
        <span className="ml-1 opacity-70 border-l pl-2 border-inherit">
          {score}
        </span>
      )}
    </Badge>
  );
}
