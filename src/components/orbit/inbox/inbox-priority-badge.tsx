import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, ArrowUp } from "lucide-react";

interface InboxPriorityBadgeProps {
  score?: number | null;
  className?: string;
}

export function InboxPriorityBadge({ score, className }: InboxPriorityBadgeProps) {
  if (score === undefined || score === null) return null;

  let color = "bg-gray-100 text-gray-800";
  let Icon = ArrowUp;

  if (score >= 80) {
    color = "bg-red-100 text-red-800 border-red-200";
    Icon = AlertCircle;
  } else if (score >= 50) {
    color = "bg-orange-100 text-orange-800 border-orange-200";
    Icon = AlertTriangle;
  } else if (score >= 20) {
    color = "bg-blue-100 text-blue-800 border-blue-200";
  }

  return (
    <Badge variant="outline" className={`flex items-center gap-1 ${color} ${className}`}>
      <Icon className="w-3 h-3" />
      <span>Priority {score}</span>
    </Badge>
  );
}
