"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformTransition } from "@spike-npm-land/shared";
import { ArrowRightIcon } from "lucide-react";

interface TransitionFlowProps {
  transitions: PlatformTransition[];
  className?: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  ORGANIC: "bg-green-500",
  PAID: "bg-blue-500",
  DIRECT: "bg-purple-500",
  OTHER: "bg-gray-500",
};

export function TransitionFlow({
  transitions,
  className,
}: TransitionFlowProps) {
  // Calculate total transitions
  const totalTransitions = transitions.reduce((sum, t) => sum + t.count, 0);

  // Group transitions by source and target
  const fromCounts: Record<string, number> = {};
  const toCounts: Record<string, number> = {};

  transitions.forEach((t) => {
    fromCounts[t.from] = (fromCounts[t.from] || 0) + t.count;
    toCounts[t.to] = (toCounts[t.to] || 0) + t.count;
  });

  // Sort transitions by count for better visualization
  const sortedTransitions = [...transitions].sort((a, b) => b.count - a.count);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Platform Transition Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted p-4 md:grid-cols-4">
            {Object.entries(fromCounts).map(([platform, count]) => (
              <div key={platform} className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${PLATFORM_COLORS[platform] || "bg-gray-400"}`}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {platform}
                  </span>
                </div>
                <span className="mt-1 text-lg font-bold">
                  {count} transition{count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>

          {/* Transitions List */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">
              Transition Details
            </h4>
            {sortedTransitions.map((transition, index) => {
              const percentage = totalTransitions > 0
                ? (transition.count / totalTransitions) * 100
                : 0;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-8 w-8 rounded-full ${
                          PLATFORM_COLORS[transition.from] || "bg-gray-400"
                        } flex items-center justify-center text-xs font-bold text-white`}
                      >
                        {transition.from[0]}
                      </div>
                      <span className="text-sm font-medium">
                        {transition.from}
                      </span>
                    </div>
                    <ArrowRightIcon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-8 w-8 rounded-full ${
                          PLATFORM_COLORS[transition.to] || "bg-gray-400"
                        } flex items-center justify-center text-xs font-bold text-white`}
                      >
                        {transition.to[0]}
                      </div>
                      <span className="text-sm font-medium">
                        {transition.to}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {transition.count}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                    {/* Visual bar */}
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {sortedTransitions.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                No platform transitions found for this period.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
