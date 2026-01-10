/**
 * TimeSlotIndicator Component
 *
 * Visual indicator for recommended posting time slots on calendar cells.
 * Part of #578: Add best-time recommendations
 */

"use client";

import { Sparkles } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConfidenceLevel } from "@/lib/calendar/best-time-types";
import { cn } from "@/lib/utils";

interface TimeSlotIndicatorProps {
  confidence: ConfidenceLevel;
  engagementScore: number;
  reason?: string;
  className?: string;
}

const confidenceColors: Record<ConfidenceLevel, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-slate-400",
};

const confidenceBorderColors: Record<ConfidenceLevel, string> = {
  high: "border-emerald-200",
  medium: "border-amber-200",
  low: "border-slate-200",
};

export function TimeSlotIndicator({
  confidence,
  engagementScore,
  reason,
  className,
}: TimeSlotIndicatorProps) {
  const indicator = (
    <div
      className={cn(
        "absolute right-1 top-1 flex items-center gap-1",
        className,
      )}
      data-testid="time-slot-indicator"
    >
      <div
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full",
          confidenceColors[confidence],
          "text-white",
        )}
      >
        <Sparkles className="h-3 w-3" />
      </div>
    </div>
  );

  if (reason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{indicator}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">
            <span className="font-medium">{engagementScore}% engagement</span>
            <br />
            {reason}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return indicator;
}

/**
 * Badge variant for showing recommended slot info
 */
interface RecommendedSlotBadgeProps {
  confidence: ConfidenceLevel;
  className?: string;
}

export function RecommendedSlotBadge({
  confidence,
  className,
}: RecommendedSlotBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        confidenceBorderColors[confidence],
        confidence === "high" && "bg-emerald-50 text-emerald-700",
        confidence === "medium" && "bg-amber-50 text-amber-700",
        confidence === "low" && "bg-slate-50 text-slate-700",
        className,
      )}
      data-testid="recommended-slot-badge"
    >
      <Sparkles className="h-3 w-3" />
      <span>Best time</span>
    </div>
  );
}
