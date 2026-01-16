/**
 * Pulse Health Widget
 *
 * Displays the overall health status of social media accounts
 * with a pulsing animation for visual feedback.
 *
 * Resolves #649
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HealthStatus } from "@/lib/social/anomaly-detection";
import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface PulseHealthWidgetProps {
  status: HealthStatus;
  criticalCount: number;
  warningCount: number;
  lastChecked: Date;
  isLoading?: boolean;
}

const statusConfig: Record<
  HealthStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: typeof CheckCircle;
    pulseColor: string;
  }
> = {
  healthy: {
    label: "All Systems Healthy",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    icon: CheckCircle,
    pulseColor: "bg-emerald-500",
  },
  warning: {
    label: "Attention Needed",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    icon: AlertTriangle,
    pulseColor: "bg-amber-500",
  },
  critical: {
    label: "Critical Issues",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    icon: XCircle,
    pulseColor: "bg-red-500",
  },
};

export function PulseHealthWidget({
  status,
  criticalCount,
  warningCount,
  lastChecked,
  isLoading = false,
}: PulseHealthWidgetProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card
      variant={status === "critical"
        ? "orange"
        : status === "warning"
        ? "orange"
        : "green"}
      className="relative overflow-hidden"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-medium text-white/90">
          <Activity className="h-5 w-5" />
          Pulse Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Pulsing indicator */}
          <div className="relative">
            <div
              className={cn(
                "h-16 w-16 rounded-full flex items-center justify-center",
                config.bgColor,
              )}
            >
              <Icon className={cn("h-8 w-8", config.color)} />
            </div>
            {/* Pulse animation */}
            {!isLoading && (
              <div
                className={cn(
                  "absolute inset-0 rounded-full animate-ping opacity-40",
                  config.pulseColor,
                )}
                style={{
                  animationDuration: status === "critical" ? "1s" : "2s",
                }}
              />
            )}
          </div>

          <div className="flex-1">
            <p className={cn("text-lg font-semibold", config.color)}>
              {isLoading ? "Loading..." : config.label}
            </p>

            {!isLoading && (
              <div className="flex gap-4 mt-1 text-sm text-white/60">
                {criticalCount > 0 && (
                  <span className="text-red-400">
                    {criticalCount} critical
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="text-amber-400">
                    {warningCount} warnings
                  </span>
                )}
                {criticalCount === 0 && warningCount === 0 && (
                  <span className="text-emerald-400/70">
                    No issues detected
                  </span>
                )}
              </div>
            )}

            <p className="text-xs text-white/40 mt-2">
              Last checked: {formatTime(lastChecked)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
