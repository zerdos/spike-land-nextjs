"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Heart,
  MessageCircle,
  Minus,
  Share2,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface EngagementMetrics {
  averageLikes: number;
  averageComments: number;
  averageShares: number;
  totalPosts: number;
  engagementRate?: number;
}

interface BenchmarkReport {
  ownMetrics: EngagementMetrics;
  competitorMetrics: EngagementMetrics;
  period?: {
    startDate: string;
    endDate: string;
  };
}

interface BenchmarksClientProps {
  workspaceSlug: string;
  competitorCount: number;
}

export function BenchmarksClient({
  workspaceSlug,
  competitorCount,
}: BenchmarksClientProps) {
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBenchmark = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/scout/benchmark`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch benchmark data");
      }

      const data = await response.json();
      setReport(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Could not load benchmark data.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug]);

  useEffect(() => {
    fetchBenchmark();
  }, [fetchBenchmark]);

  const calculateDifference = (own: number, competitor: number) => {
    if (competitor === 0) return { value: 0, percentage: 0, direction: "same" as const };
    const diff = own - competitor;
    const percentage = Math.round((diff / competitor) * 100);
    const direction = diff > 0 ? "up" as const : diff < 0 ? "down" as const : "same" as const;
    return { value: diff, percentage, direction };
  };

  const getDifferenceIcon = (direction: "up" | "down" | "same") => {
    switch (direction) {
      case "up":
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getDifferenceColor = (direction: "up" | "down" | "same") => {
    switch (direction) {
      case "up":
        return "text-green-500";
      case "down":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  if (competitorCount === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No competitors tracked</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Add competitors to your Scout to start benchmarking your performance against them.
            </p>
            <Link
              href={`/orbit/${workspaceSlug}/scout/competitors`}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Users className="h-4 w-4" />
              Add Competitors
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        {error}
      </div>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No benchmark data</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Benchmark data will appear once we have enough data to analyze.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const likesDiff = calculateDifference(
    report.ownMetrics.averageLikes,
    report.competitorMetrics.averageLikes,
  );
  const commentsDiff = calculateDifference(
    report.ownMetrics.averageComments,
    report.competitorMetrics.averageComments,
  );
  const sharesDiff = calculateDifference(
    report.ownMetrics.averageShares,
    report.competitorMetrics.averageShares,
  );
  const postsDiff = calculateDifference(
    report.ownMetrics.totalPosts,
    report.competitorMetrics.totalPosts,
  );

  const metrics = [
    {
      title: "Avg. Likes",
      icon: Heart,
      own: report.ownMetrics.averageLikes,
      competitor: report.competitorMetrics.averageLikes,
      diff: likesDiff,
    },
    {
      title: "Avg. Comments",
      icon: MessageCircle,
      own: report.ownMetrics.averageComments,
      competitor: report.competitorMetrics.averageComments,
      diff: commentsDiff,
    },
    {
      title: "Avg. Shares",
      icon: Share2,
      own: report.ownMetrics.averageShares,
      competitor: report.competitorMetrics.averageShares,
      diff: sharesDiff,
    },
    {
      title: "Total Posts",
      icon: BarChart3,
      own: report.ownMetrics.totalPosts,
      competitor: report.competitorMetrics.totalPosts,
      diff: postsDiff,
    },
  ];

  const overallPerformance =
    (likesDiff.percentage + commentsDiff.percentage + sharesDiff.percentage) / 3;

  return (
    <div className="space-y-6">
      {/* Data Notice */}
      {report.ownMetrics.totalPosts === 0 && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-400">
          <p className="text-sm">
            Note: No social metrics data available yet. Connect social accounts and sync data to see
            your performance metrics.
          </p>
        </div>
      )}

      {/* Overall Performance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Overall Performance
            {overallPerformance >= 0
              ? <TrendingUp className="h-5 w-5 text-green-500" />
              : <TrendingDown className="h-5 w-5 text-red-500" />}
          </CardTitle>
          <CardDescription>
            Compared to competitor average (Last 30 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">
                {overallPerformance >= 0 ? "+" : ""}
                {Math.round(overallPerformance)}%
              </span>
              <Badge
                variant={overallPerformance >= 0 ? "default" : "destructive"}
              >
                {overallPerformance >= 0
                  ? "Above Average"
                  : "Below Average"}
              </Badge>
            </div>
            <Progress
              value={Math.min(100, Math.max(0, 50 + overallPerformance / 2))}
              className="h-2"
            />
            <p className="text-sm text-muted-foreground">
              Your engagement is {overallPerformance >= 0 ? "above" : "below"}{" "}
              the competitor average by {Math.abs(Math.round(overallPerformance))}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metric.own.toFixed(0)}
              </div>
              <div className="flex items-center gap-1 text-xs">
                {getDifferenceIcon(metric.diff.direction)}
                <span className={getDifferenceColor(metric.diff.direction)}>
                  {metric.diff.percentage >= 0 ? "+" : ""}
                  {metric.diff.percentage}% vs competitors
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Comparison</CardTitle>
          <CardDescription>
            Your performance vs competitor average (Last 30 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Your Performance</TableHead>
                <TableHead className="text-right">Competitor Avg</TableHead>
                <TableHead className="text-right">Difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((metric) => (
                <TableRow key={metric.title}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <metric.icon className="h-4 w-4 text-muted-foreground" />
                      {metric.title}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {metric.own.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {metric.competitor.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className={`flex items-center justify-end gap-1 ${
                        getDifferenceColor(metric.diff.direction)
                      }`}
                    >
                      {getDifferenceIcon(metric.diff.direction)}
                      <span>
                        {metric.diff.percentage >= 0 ? "+" : ""}
                        {metric.diff.percentage}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Industry Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Industry Insights</CardTitle>
          <CardDescription>
            Tips based on your benchmark analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {likesDiff.direction === "down" && (
              <div className="flex gap-3 rounded-lg border p-4">
                <Heart className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-medium">Improve Engagement</p>
                  <p className="text-sm text-muted-foreground">
                    Your average likes are below competitor average. Consider posting at different
                    times or experimenting with content formats.
                  </p>
                </div>
              </div>
            )}
            {commentsDiff.direction === "down" && (
              <div className="flex gap-3 rounded-lg border p-4">
                <MessageCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="font-medium">Boost Conversations</p>
                  <p className="text-sm text-muted-foreground">
                    Try asking questions in your posts or creating polls to encourage more comments
                    from your audience.
                  </p>
                </div>
              </div>
            )}
            {sharesDiff.direction === "down" && (
              <div className="flex gap-3 rounded-lg border p-4">
                <Share2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="font-medium">Create Shareable Content</p>
                  <p className="text-sm text-muted-foreground">
                    Create more educational or entertaining content that your audience would want to
                    share with their network.
                  </p>
                </div>
              </div>
            )}
            {likesDiff.direction === "up" &&
              commentsDiff.direction === "up" &&
              sharesDiff.direction === "up" && (
              <div className="flex gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                <TrendingUp className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Great Performance!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You&apos;re outperforming your competitors across all engagement metrics. Keep
                    up the great work!
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
