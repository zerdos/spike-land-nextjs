/**
 * Best Time Heatmap Component
 * Visual heatmap showing best posting times (7 days x 24 hours)
 * Issue #841
 */

"use client";

import type { HeatmapData } from "@/types/ai-calendar";
import { Fragment, useEffect, useState } from "react";

interface BestTimeHeatmapProps {
  accountId: string;
  onSlotClick?: (day: number, hour: number) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function BestTimeHeatmap({
  accountId,
  onSlotClick,
}: BestTimeHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<
    {
      day: number;
      hour: number;
    } | null
  >(null);

  useEffect(() => {
    // This would fetch from API - simplified for now
    // Placeholder data
    const placeholderData: HeatmapData = {
      accountId,
      platform: "LINKEDIN",
      accountName: "My Account",
      heatmap: Array.from({ length: 7 }, () => Array(24).fill(0)),
      maxScore: 100,
      minScore: 0,
    };
    setHeatmapData(placeholderData);
  }, [accountId]);

  if (!heatmapData) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  const getColorForScore = (score: number): string => {
    if (score === 0) return "bg-gray-100";
    const ratio = score / heatmapData.maxScore;
    if (ratio >= 0.8) return "bg-green-500";
    if (ratio >= 0.6) return "bg-green-400";
    if (ratio >= 0.4) return "bg-yellow-400";
    if (ratio >= 0.2) return "bg-orange-400";
    return "bg-red-400";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Best Posting Times</h3>
        <div className="flex items-center gap-2 text-xs">
          <span>Low</span>
          <div className="flex gap-1">
            <div className="h-3 w-3 rounded bg-red-400" />
            <div className="h-3 w-3 rounded bg-orange-400" />
            <div className="h-3 w-3 rounded bg-yellow-400" />
            <div className="h-3 w-3 rounded bg-green-400" />
            <div className="h-3 w-3 rounded bg-green-500" />
          </div>
          <span>High</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-px bg-gray-200 rounded-lg overflow-hidden">
            {/* Header row (hours) */}
            <div className="bg-white p-2 text-xs font-medium" />
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="bg-white p-1 text-center text-xs font-medium"
              >
                {i}
              </div>
            ))}

            {/* Data rows */}
            {heatmapData.heatmap.map((dayData, dayIdx) => (
              <Fragment key={`row-${dayIdx}`}>
                <div className="bg-white p-2 text-xs font-medium">
                  {DAYS[dayIdx]}
                </div>
                {dayData.map((score, hourIdx) => {
                  const isHovered = hoveredSlot?.day === dayIdx &&
                    hoveredSlot?.hour === hourIdx;

                  return (
                    <button
                      key={`${dayIdx}-${hourIdx}`}
                      type="button"
                      className={`relative h-8 w-full cursor-pointer transition-all ${
                        getColorForScore(score)
                      } ${isHovered ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                      onMouseEnter={() => setHoveredSlot({ day: dayIdx, hour: hourIdx })}
                      onMouseLeave={() => setHoveredSlot(null)}
                      onClick={() => onSlotClick?.(dayIdx, hourIdx)}
                      title={`${DAYS[dayIdx]} ${hourIdx}:00 - Score: ${Math.round(score)}`}
                      aria-label={`${DAYS[dayIdx]} at ${hourIdx}:00 - Score: ${Math.round(score)}`}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {hoveredSlot && (
        <div className="rounded border bg-muted p-3 text-sm">
          <strong>
            {DAYS[hoveredSlot.day]} at {hoveredSlot.hour}:00
          </strong>
          <p className="text-muted-foreground">
            Engagement Score: {Math.round(
              heatmapData.heatmap[hoveredSlot.day]?.[hoveredSlot.hour] ?? 0,
            )}
          </p>
        </div>
      )}
    </div>
  );
}
