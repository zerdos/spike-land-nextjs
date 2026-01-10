/**
 * BestTimeRecommendations Component
 *
 * Displays best-time posting recommendations panel for the calendar.
 * Part of #578: Add best-time recommendations
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  Clock,
  Lightbulb,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  BestTimeRecommendationsResponse,
  CalendarGap,
  PlatformRecommendations,
  TimeSlotRecommendation,
} from "@/lib/calendar/best-time-types";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface BestTimeRecommendationsProps {
  workspaceId: string;
  className?: string;
  onSlotClick?: (dayOfWeek: number, hour: number) => void;
}

async function fetchRecommendations(
  workspaceId: string,
): Promise<BestTimeRecommendationsResponse> {
  const response = await fetch(
    `/api/calendar/recommendations?workspaceId=${workspaceId}&includeGaps=true`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch recommendations");
  }
  return response.json();
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: "high" | "medium" | "low";
}) {
  return (
    <Badge
      variant={
        confidence === "high"
          ? "default"
          : confidence === "medium"
            ? "secondary"
            : "outline"
      }
      className="text-xs"
    >
      {confidence}
    </Badge>
  );
}

function TimeSlotItem({
  slot,
  onClick,
}: {
  slot: TimeSlotRecommendation;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "flex items-center gap-2 rounded-md border p-2 text-left transition-colors",
            "hover:bg-accent/50",
            slot.confidence === "high" && "border-primary/50 bg-primary/5",
            slot.confidence === "medium" && "border-secondary/50 bg-secondary/5",
            slot.confidence === "low" && "border-muted",
          )}
          data-testid="time-slot-recommendation"
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {DAY_NAMES[slot.dayOfWeek]} at {formatHour(slot.hour)}
            </span>
            <span className="text-xs text-muted-foreground">
              {slot.engagementScore}% engagement
            </span>
          </div>
          <ConfidenceBadge confidence={slot.confidence} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <p>{slot.reason}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function PlatformSection({
  recommendations,
  onSlotClick,
}: {
  recommendations: PlatformRecommendations;
  onSlotClick?: (dayOfWeek: number, hour: number) => void;
}) {
  const platformName =
    recommendations.platform.charAt(0) +
    recommendations.platform.slice(1).toLowerCase();

  return (
    <Collapsible defaultOpen className="space-y-2">
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md p-2 hover:bg-accent/50">
        <div className="flex items-center gap-2">
          <span className="font-medium">{platformName}</span>
          <span className="text-xs text-muted-foreground">
            ({recommendations.accountName})
          </span>
        </div>
        {!recommendations.hasEnoughData && (
          <Tooltip>
            <TooltipTrigger>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </TooltipTrigger>
            <TooltipContent>
              Limited data ({recommendations.daysAnalyzed} days). Recommendations based on industry benchmarks.
            </TooltipContent>
          </Tooltip>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pl-2">
        {recommendations.bestTimeSlots.length > 0 ? (
          <div className="grid gap-2">
            {recommendations.bestTimeSlots.slice(0, 4).map((slot, idx) => (
              <TimeSlotItem
                key={`${slot.dayOfWeek}-${slot.hour}-${idx}`}
                slot={slot}
                onClick={() => onSlotClick?.(slot.dayOfWeek, slot.hour)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No recommendations available
          </p>
        )}
        {recommendations.avoidDays.length > 0 && (
          <div className="mt-2 rounded-md bg-destructive/10 p-2">
            <p className="text-xs text-destructive">
              Avoid posting on:{" "}
              {recommendations.avoidDays
                .map((d) => DAY_NAMES[d])
                .join(", ")}
            </p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function CalendarGapItem({ gap }: { gap: CalendarGap }) {
  const startDate = new Date(gap.start);
  const endDate = new Date(gap.end);

  return (
    <div
      className={cn(
        "rounded-md border p-2",
        gap.isHighEngagementSlot && "border-amber-500/50 bg-amber-50",
      )}
      data-testid="calendar-gap"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {startDate.toLocaleDateString()} -{" "}
            {endDate.toLocaleDateString()}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {gap.durationHours}h gap
        </span>
      </div>
      {gap.isHighEngagementSlot && (
        <p className="mt-1 text-xs text-amber-700">
          This is a high-engagement time slot
        </p>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

export function BestTimeRecommendations({
  workspaceId,
  className,
  onSlotClick,
}: BestTimeRecommendationsProps) {
  const {
    data: recommendations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["best-time-recommendations", workspaceId],
    queryFn: () => fetchRecommendations(workspaceId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5" />
            Best Times to Post
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5" />
            Best Times to Post
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">Failed to load recommendations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations) {
    return null;
  }

  return (
    <Card className={className} data-testid="best-time-recommendations">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5" />
          Best Times to Post
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global best slots */}
        {recommendations.globalBestSlots.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              Top Recommendations
            </h4>
            <div className="grid gap-2">
              {recommendations.globalBestSlots.slice(0, 3).map((slot, idx) => (
                <TimeSlotItem
                  key={`global-${slot.dayOfWeek}-${slot.hour}-${idx}`}
                  slot={slot}
                  onClick={() => onSlotClick?.(slot.dayOfWeek, slot.hour)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Per-platform recommendations */}
        {recommendations.platformRecommendations.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              By Platform
            </h4>
            <div className="space-y-3">
              {recommendations.platformRecommendations.map((pr) => (
                <PlatformSection
                  key={pr.accountId}
                  recommendations={pr}
                  onSlotClick={onSlotClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Calendar gaps */}
        {recommendations.calendarGaps.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Content Gaps
            </h4>
            <div className="space-y-2">
              {recommendations.calendarGaps.slice(0, 3).map((gap, idx) => (
                <CalendarGapItem key={idx} gap={gap} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {recommendations.platformRecommendations.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Connect social accounts to get personalized recommendations
          </p>
        )}
      </CardContent>
    </Card>
  );
}
