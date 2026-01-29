/**
 * Anomaly Alerts List
 *
 * Displays a list of recent anomaly detections with
 * severity indicators and details.
 *
 * Resolves #649
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { SocialPlatform } from "@prisma/client";
import { AlertTriangle, Bell, TrendingDown, TrendingUp } from "lucide-react";

interface AnomalyAlert {
  id: string;
  accountName: string;
  platform: SocialPlatform;
  metricType: string;
  currentValue: number;
  expectedValue: number;
  percentChange: number;
  severity: "warning" | "critical";
  direction: "spike" | "drop";
  detectedAt: Date;
}

interface AnomalyAlertsListProps {
  alerts: AnomalyAlert[];
  maxItems?: number;
  isLoading?: boolean;
}

const platformNames: Record<SocialPlatform, string> = {
  LINKEDIN: "LinkedIn",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TWITTER: "X/Twitter",
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
  DISCORD: "Discord",
  PINTEREST: "Pinterest",
  SNAPCHAT: "Snapchat",
};

const metricNames: Record<string, string> = {
  followers: "Followers",
  following: "Following",
  postsCount: "Posts",
  engagementRate: "Engagement",
  impressions: "Impressions",
  reach: "Reach",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
};

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function AlertItem({ alert }: { alert: AnomalyAlert; }) {
  const isCritical = alert.severity === "critical";
  const isSpike = alert.direction === "spike";

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-colors",
        isCritical
          ? "bg-red-500/5 border-red-500/20 hover:border-red-500/30"
          : "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/30",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {isSpike
            ? (
              <TrendingUp
                className={cn(
                  "h-4 w-4",
                  isCritical ? "text-red-400" : "text-amber-400",
                )}
              />
            )
            : (
              <TrendingDown
                className={cn(
                  "h-4 w-4",
                  isCritical ? "text-red-400" : "text-amber-400",
                )}
              />
            )}
          <span className="text-sm font-medium text-white">
            {metricNames[alert.metricType] ?? alert.metricType} {isSpike ? "Spike" : "Drop"}
          </span>
        </div>
        <Badge
          variant={isCritical ? "destructive" : "secondary"}
          className="text-xs"
        >
          {isCritical ? "Critical" : "Warning"}
        </Badge>
      </div>

      <div className="text-xs text-white/60 mb-2">
        {alert.accountName} • {platformNames[alert.platform]}
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-white/50">
            Current:{" "}
            <span className="text-white">
              {formatNumber(alert.currentValue)}
            </span>
          </span>
          <span className="text-white/50">
            Expected:{" "}
            <span className="text-white">
              {formatNumber(alert.expectedValue)}
            </span>
          </span>
        </div>
        <span
          className={cn(
            "font-medium",
            isSpike ? "text-emerald-400" : "text-red-400",
          )}
        >
          {isSpike ? "+" : ""}
          {alert.percentChange.toFixed(1)}%
        </span>
      </div>

      <div className="text-xs text-white/40 mt-2">
        {formatTimeAgo(alert.detectedAt)}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-3 rounded-lg border border-white/10 animate-pulse"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="h-4 w-32 bg-white/10 rounded" />
            <div className="h-5 w-16 bg-white/10 rounded-full" />
          </div>
          <div className="h-3 w-40 bg-white/10 rounded mb-2" />
          <div className="h-3 w-full bg-white/10 rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
        <Bell className="h-6 w-6 text-emerald-400" />
      </div>
      <p className="text-white/60 font-medium">No anomalies detected</p>
      <p className="text-xs text-white/40 mt-1">
        All metrics are within normal range
      </p>
    </div>
  );
}

export function AnomalyAlertsList({
  alerts,
  maxItems = 5,
  isLoading = false,
}: AnomalyAlertsListProps) {
  const displayAlerts = alerts.slice(0, maxItems);
  const hasMore = alerts.length > maxItems;

  return (
    <Card variant="default" className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-white/90">
            <AlertTriangle className="h-5 w-5" />
            Recent Anomalies
          </CardTitle>
          {alerts.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {alerts.length} total
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading
          ? <LoadingSkeleton />
          : displayAlerts.length === 0
          ? <EmptyState />
          : (
            <>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {displayAlerts.map((alert) => <AlertItem key={alert.id} alert={alert} />)}
                </div>
              </ScrollArea>
              {hasMore && (
                <div className="pt-3 mt-3 border-t border-white/10 text-center">
                  <button
                    type="button"
                    className="text-xs text-white/50 hover:text-white/70 transition-colors"
                  >
                    View all {alerts.length} anomalies
                  </button>
                </div>
              )}
            </>
          )}
      </CardContent>
    </Card>
  );
}
