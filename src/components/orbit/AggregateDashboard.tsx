"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AggregateKPIs, WorkspaceSummary } from "@/types/workspace";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  Calendar,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Users,
} from "lucide-react";
/**
 * Format a number with K/M suffixes for large values
 */
function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

interface AggregateApiResponse {
  kpis: AggregateKPIs;
  workspaceSummaries: WorkspaceSummary[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatNumber(value)}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="mt-1 h-3 w-32" />
      </CardContent>
    </Card>
  );
}

interface WorkspaceSummaryRowProps {
  summary: WorkspaceSummary;
}

function WorkspaceSummaryRow({ summary }: WorkspaceSummaryRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex flex-col">
        <span className="font-medium">{summary.workspaceName}</span>
        <span className="text-sm text-muted-foreground">
          {summary.socialAccountCount} accounts
        </span>
      </div>
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{summary.scheduledPostCount}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Share2 className="h-4 w-4" />
          <span>{summary.publishedPostCount}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{formatNumber(summary.totalFollowers)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard component showing aggregated KPIs across all user workspaces.
 * Displays summary statistics and per-workspace breakdowns.
 *
 * @example
 * ```tsx
 * <AggregateDashboard />
 * ```
 */
export function AggregateDashboard() {
  const { data, isLoading, error } = useQuery<AggregateApiResponse>({
    queryKey: ["workspace-aggregate"],
    queryFn: async () => {
      const response = await fetch("/api/workspaces/aggregate");
      if (!response.ok) {
        throw new Error("Failed to fetch aggregate data");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-destructive">
          <p>Failed to load aggregate dashboard</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
          <p className="text-muted-foreground">
            Aggregated metrics across all your workspaces
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { kpis, workspaceSummaries } = data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <p className="text-muted-foreground">
          Aggregated metrics across all your workspaces
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Workspaces"
          value={kpis.totalWorkspaces}
          icon={<Building2 className="h-4 w-4" />}
          description="Active workspaces"
        />
        <StatCard
          title="Social Accounts"
          value={kpis.totalSocialAccounts}
          icon={<MessageSquare className="h-4 w-4" />}
          description="Connected accounts"
        />
        <StatCard
          title="Scheduled Posts"
          value={kpis.totalScheduledPosts}
          icon={<Calendar className="h-4 w-4" />}
          description="Pending publication"
        />
        <StatCard
          title="Published Posts"
          value={kpis.totalPublishedPosts}
          icon={<BarChart3 className="h-4 w-4" />}
          description="Successfully posted"
        />
      </div>

      {/* Engagement Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Followers"
          value={kpis.totalFollowers}
          icon={<Users className="h-4 w-4" />}
          description="Across all accounts"
        />
        <StatCard
          title="Total Engagements"
          value={kpis.totalEngagements}
          icon={<Heart className="h-4 w-4" />}
          description="Likes, comments, shares"
        />
        <StatCard
          title="Total Impressions"
          value={kpis.totalImpressions}
          icon={<Eye className="h-4 w-4" />}
          description="Content views"
        />
      </div>

      {/* Workspace Breakdown */}
      {workspaceSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Workspace Breakdown</CardTitle>
            <CardDescription>
              Performance metrics for each workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {workspaceSummaries.map((summary) => (
                <WorkspaceSummaryRow key={summary.workspaceId} summary={summary} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
