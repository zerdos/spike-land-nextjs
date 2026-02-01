import { cn } from "@/lib/utils";

interface SeverityBadgeProps {
  level: "critical" | "high" | "medium" | "low";
  className?: string;
  count?: number;
}

export function SeverityBadge({ level, className, count }: SeverityBadgeProps) {
  const getStyles = () => {
    switch (level) {
      case "critical":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "high":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "medium":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "low":
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider",
        getStyles(),
        className,
      )}
    >
      {level}
      {count !== undefined && (
        <span className="px-1.5 py-0.5 ml-1 text-[10px] bg-black/20 rounded-full">
          {count}
        </span>
      )}
    </span>
  );
}
