"use client";

import { useEffect, useState } from "react";
import { EngagementOverview } from "./EngagementOverview";
import { GrowthChart } from "./GrowthChart";
import { TopPostsTable } from "./TopPostsTable";
import { AIInsightsPanel } from "./AIInsightsPanel";
import { PlatformBreakdown } from "./PlatformBreakdown";
import type { AnalyticsData } from "@/types/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AnalyticsDashboardProps {
  workspaceSlug: string;
}

export function AnalyticsDashboard({ workspaceSlug }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(
          `/api/orbit/${workspaceSlug}/analytics?days=30`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch analytics");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [workspaceSlug]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <EngagementOverview data={data.overview} />
      <div className="grid gap-6 lg:grid-cols-2">
        <GrowthChart data={data.growth} />
        <PlatformBreakdown data={data.platformBreakdown} />
      </div>
      <TopPostsTable data={data.topPosts} />
      <AIInsightsPanel data={data.insights} />
    </div>
  );
}
