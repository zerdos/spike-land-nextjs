/**
 * Pulse Dashboard
 *
 * Main dashboard component that aggregates all Pulse widgets
 * with automatic polling and visibility-based refresh.
 *
 * Resolves #649
 */

"use client";

import type { HealthStatus } from "@/lib/social/anomaly-detection";
import type { SocialPlatform } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { AnomalyAlertsList } from "./AnomalyAlertsList";
import { MetricsTrendChart } from "./MetricsTrendChart";
import { PlatformStatusGrid } from "./PlatformStatusGrid";
import { PulseHealthWidget } from "./PulseHealthWidget";

interface PulseDashboardProps {
  workspaceSlug: string;
}

interface PulseData {
  health: {
    status: HealthStatus;
    criticalCount: number;
    warningCount: number;
    lastChecked: string;
  };
  anomalies: Array<{
    accountId: string;
    platform: SocialPlatform;
    metricType: string;
    currentValue: number;
    expectedValue: number;
    percentChange: number;
    severity: "warning" | "critical";
    direction: "spike" | "drop";
    zScore: number;
    detectedAt: string;
  }>;
  platforms: Array<{
    platform: SocialPlatform;
    accountName: string;
    status: HealthStatus;
    followerCount: number;
    followerChange: number;
    lastUpdated: string;
  }>;
  trends: Array<{
    date: string;
    followers: number;
    impressions: number;
    reach: number;
    engagement: number;
  }>;
  workspaceName: string;
}

const POLL_INTERVAL = 30_000; // 30 seconds

async function fetchPulseData(workspaceSlug: string): Promise<PulseData> {
  const response = await fetch(`/api/orbit/${workspaceSlug}/pulse`);

  if (!response.ok) {
    throw new Error("Failed to fetch Pulse data");
  }

  return response.json();
}

export function PulseDashboard({ workspaceSlug }: PulseDashboardProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const queryFn = useCallback(() => fetchPulseData(workspaceSlug), [
    workspaceSlug,
  ]);

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pulse", workspaceSlug],
    queryFn,
    refetchInterval: isVisible ? POLL_INTERVAL : false,
    staleTime: 10_000, // Consider data fresh for 10 seconds
  });

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
        <p className="text-red-400">Failed to load Pulse data</p>
        <p className="text-sm text-red-400/70 mt-1">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  const healthData = data?.health ?? {
    status: "healthy" as const,
    criticalCount: 0,
    warningCount: 0,
    lastChecked: new Date().toISOString(),
  };

  const anomalies = data?.anomalies.map((a) => ({
    id: `${a.accountId}-${a.metricType}-${a.detectedAt}`,
    accountName: a.platform, // Will be replaced with actual name
    platform: a.platform,
    metricType: a.metricType,
    currentValue: a.currentValue,
    expectedValue: a.expectedValue,
    percentChange: a.percentChange,
    severity: a.severity,
    direction: a.direction,
    detectedAt: new Date(a.detectedAt),
  })) ?? [];

  const platforms = data?.platforms.map((p) => ({
    platform: p.platform,
    accountName: p.accountName,
    status: p.status,
    followerCount: p.followerCount,
    followerChange: p.followerChange,
    lastUpdated: new Date(p.lastUpdated),
  })) ?? [];

  const trends = data?.trends.map((t) => ({
    date: formatDateLabel(t.date),
    followers: t.followers,
    impressions: t.impressions,
    reach: t.reach,
    engagement: t.engagement,
  })) ?? [];

  return (
    <div className="space-y-6">
      {/* Top row: Health and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PulseHealthWidget
            status={healthData.status}
            criticalCount={healthData.criticalCount}
            warningCount={healthData.warningCount}
            lastChecked={new Date(healthData.lastChecked)}
            isLoading={isLoading}
          />
        </div>
        <div className="lg:col-span-2">
          <AnomalyAlertsList alerts={anomalies} isLoading={isLoading} />
        </div>
      </div>

      {/* Platform status grid */}
      <div>
        <h3 className="text-lg font-medium text-white/90 mb-4">
          Platform Status
        </h3>
        <PlatformStatusGrid platforms={platforms} isLoading={isLoading} />
      </div>

      {/* Trends chart */}
      <MetricsTrendChart
        data={trends}
        metrics={["followers"]}
        title="Follower Growth"
        isLoading={isLoading}
      />
    </div>
  );
}

function formatDateLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
