/**
 * Policy Statistics Dashboard
 *
 * Displays analytics and statistics for policy checks including pass rates,
 * most violated rules, and trends over time.
 *
 * Resolves #522 (ORB-065): Build Policy Checker UI
 */

"use client";

import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PolicyStatsData {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  blockedChecks: number;
  passRate: number;
  topViolatedRules: Array<{
    ruleId: string;
    ruleName: string;
    category: string;
    violationCount: number;
  }>;
  violationsByPlatform: Array<{
    platform: string;
    count: number;
  }>;
  recentTrend: {
    direction: "up" | "down" | "stable";
    percentageChange: number;
  };
}

interface PolicyStatsDashboardProps {
  workspaceSlug: string;
}

const TIME_RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export function PolicyStatsDashboard({ workspaceSlug }: PolicyStatsDashboardProps) {
  const [stats, setStats] = useState<PolicyStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ timeRange });
      if (platformFilter && platformFilter !== "all") {
        params.set("platform", platformFilter);
      }

      const response = await fetch(
        `/api/orbit/${workspaceSlug}/policy/statistics?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch statistics");
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      toast.error("Failed to load statistics");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug, timeRange, platformFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No statistics available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Policy Statistics</h2>
        <div className="flex gap-2">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="FACEBOOK">Facebook</SelectItem>
              <SelectItem value="INSTAGRAM">Instagram</SelectItem>
              <SelectItem value="TWITTER">Twitter</SelectItem>
              <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
              <SelectItem value="TIKTOK">TikTok</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Checks"
          value={stats.totalChecks}
          icon={<CheckCircle className="h-5 w-5 text-blue-600" />}
          trend={stats.recentTrend}
        />
        <StatCard
          title="Pass Rate"
          value={`${stats.passRate.toFixed(1)}%`}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          description={`${stats.passedChecks} passed`}
        />
        <StatCard
          title="Failed Checks"
          value={stats.failedChecks}
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          description={`${stats.blockedChecks} blocked`}
        />
        <StatCard
          title="Warnings"
          value={stats.warningChecks}
          icon={<AlertTriangle className="h-5 w-5 text-yellow-600" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Most Violated Rules</CardTitle>
            <CardDescription>Top 5 rules with most violations</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topViolatedRules.length === 0
              ? (
                <p className="text-center text-muted-foreground py-4">
                  No violations recorded
                </p>
              )
              : (
                <div className="space-y-3">
                  {stats.topViolatedRules.map((rule, index) => (
                    <div
                      key={rule.ruleId}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{rule.ruleName}</p>
                          <p className="text-xs text-muted-foreground">
                            {rule.category}
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive">{rule.violationCount}</Badge>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Violations by Platform</CardTitle>
            <CardDescription>Distribution across platforms</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.violationsByPlatform.length === 0
              ? (
                <p className="text-center text-muted-foreground py-4">
                  No platform data available
                </p>
              )
              : (
                <div className="space-y-3">
                  {stats.violationsByPlatform.map((item) => (
                    <div
                      key={item.platform}
                      className="flex items-center justify-between"
                    >
                      <span className="font-medium">{item.platform}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-600"
                            style={{
                              width: `${
                                (item.count /
                                  Math.max(
                                    ...stats.violationsByPlatform.map((p) => p.count),
                                  )) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        <Badge variant="outline">{item.count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    direction: "up" | "down" | "stable";
    percentageChange: number;
  };
}

function StatCard({ title, value, icon, description, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && trend.direction !== "stable" && (
          <div className="flex items-center gap-1 mt-2 text-xs">
            {trend.direction === "up"
              ? <TrendingUp className="h-3 w-3 text-green-600" />
              : <TrendingDown className="h-3 w-3 text-red-600" />}
            <span
              className={trend.direction === "up" ? "text-green-600" : "text-red-600"}
            >
              {Math.abs(trend.percentageChange).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs previous period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
