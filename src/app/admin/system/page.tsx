/**
 * System Health Page
 *
 * Displays job processing metrics, failure rates, and system health indicators.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface SystemHealthData {
  hourlyJobs: Array<{ hour: string; count: number; }>;
  avgProcessingTime: Array<{ tier: string; seconds: number; }>;
  tierStats: Array<{ tier: string; total: number; failed: number; failureRate: number; }>;
  queueDepth: number;
  jobsByStatus: Array<{ status: string; count: number; }>;
  recentFailures: Array<{ id: string; tier: string; error: string | null; timestamp: string; }>;
}

export default function SystemHealthPage() {
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const response = await fetch("/api/admin/system/health");
        if (!response.ok) {
          throw new Error("Failed to fetch system health");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchHealth();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">System Health</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Card key={i} className="h-32 animate-pulse bg-neutral-100" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">System Health</h1>
        <Card className="p-6">
          <p className="text-red-500">Error: {error || "No data available"}</p>
        </Card>
      </div>
    );
  }

  const totalJobs = data.jobsByStatus.reduce((sum, s) => sum + s.count, 0);
  const failedJobs = data.jobsByStatus.find((s) => s.status === "FAILED")?.count || 0;
  const overallFailureRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">System Health</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Job processing and system performance metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Queue Depth
          </p>
          <p className="mt-2 text-3xl font-bold">{data.queueDepth}</p>
          <p className="mt-2 text-xs text-neutral-500">
            Pending + Processing
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Total Jobs
          </p>
          <p className="mt-2 text-3xl font-bold">{totalJobs.toLocaleString()}</p>
          <p className="mt-2 text-xs text-neutral-500">All time</p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Failure Rate
          </p>
          <p className="mt-2 text-3xl font-bold">{overallFailureRate.toFixed(1)}%</p>
          <p className="mt-2 text-xs text-neutral-500">
            {failedJobs} failed jobs
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Avg Processing
          </p>
          <p className="mt-2 text-3xl font-bold">
            {Math.round(
              data.avgProcessingTime.reduce((sum, t) => sum + t.seconds, 0) /
                (data.avgProcessingTime.length || 1),
            )}s
          </p>
          <p className="mt-2 text-xs text-neutral-500">Across all tiers</p>
        </Card>
      </div>

      {/* Jobs per Hour */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Jobs per Hour (Last 24h)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.hourlyJobs}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="hour"
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getHours()}:00`;
              }}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(value) => {
                const date = new Date(value as string);
                return date.toLocaleTimeString();
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              name="Jobs"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Processing Time & Failure Rates */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">
            Avg Processing Time by Tier
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.avgProcessingTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tier" />
              <YAxis label={{ value: "Seconds", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="seconds" fill="#10b981" name="Seconds" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Failure Rate by Tier</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.tierStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tier" />
              <YAxis label={{ value: "Percentage", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
              <Legend />
              <Bar dataKey="failureRate" fill="#ef4444" name="Failure %" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Job Status Breakdown */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Job Status Breakdown</h2>
        <div className="grid gap-4 md:grid-cols-5">
          {data.jobsByStatus.map((status) => (
            <div key={status.status} className="text-center">
              <Badge
                variant={status.status === "COMPLETED"
                  ? "default"
                  : status.status === "FAILED"
                  ? "destructive"
                  : "secondary"}
                className="mb-2"
              >
                {status.status}
              </Badge>
              <p className="text-2xl font-bold">{status.count.toLocaleString()}</p>
              <p className="text-xs text-neutral-500">
                {((status.count / totalJobs) * 100).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Failures */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Recent Failures</h2>
        {data.recentFailures.length === 0
          ? <p className="text-center text-neutral-500">No recent failures</p>
          : (
            <div className="space-y-3">
              {data.recentFailures.map((failure) => (
                <div
                  key={failure.id}
                  className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="destructive">{failure.tier}</Badge>
                    <span className="text-xs text-neutral-500">
                      {new Date(failure.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {failure.error || "No error message"}
                  </p>
                </div>
              ))}
            </div>
          )}
      </Card>
    </div>
  );
}
