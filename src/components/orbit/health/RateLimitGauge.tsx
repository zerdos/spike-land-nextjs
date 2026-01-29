/**
 * Rate Limit Gauge - Visual indicator for API rate limits
 * Resolves #522 (ORB-066): Account Health Monitor UI
 */

"use client";

import { Progress } from "@/components/ui/progress";

interface RateLimitGaugeProps {
  remaining: number;
  total: number;
  resetTime?: Date;
}

export function RateLimitGauge({ remaining, total, resetTime }: RateLimitGaugeProps) {
  const percentage = (remaining / total) * 100;
  const isLow = percentage < 20;
  const isWarning = percentage < 50;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Rate Limit</span>
        <span className={isLow ? "text-red-600 font-bold" : isWarning ? "text-yellow-600" : ""}>
          {remaining} / {total}
        </span>
      </div>
      <Progress
        value={percentage}
        className={`h-2 ${isLow ? "[&>div]:bg-red-600" : isWarning ? "[&>div]:bg-yellow-600" : ""}`}
      />
      {resetTime && (
        <p className="text-xs text-muted-foreground">
          Resets at {resetTime.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
