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
  tierStats: Array<
    { tier: string; total: number; failed: number; failureRate: number; }
  >;
  queueDepth: number;
  jobsByStatus: Array<{ status: string; count: number; }>;
  recentFailures: Array<
    { id: string; tier: string; error: string | null; timestamp: string; }
  >;
}

interface StorageData {
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  averageSizeBytes: number;
  averageSizeFormatted: string;
  imageStats: {
    count: number;
    sizeBytes: number;
    sizeFormatted: string;
  };
  byFileType: Record<
    string,
    { count: number; sizeBytes: number; sizeFormatted: string; }
  >;
  isConfigured: boolean;
}

export default function SystemHealthPage() {
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageLoading, setStorageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

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

    async function fetchStorage() {
      try {
        const response = await fetch("/api/admin/storage");
        if (!response.ok) {
          throw new Error("Failed to fetch storage stats");
        }
        const result = await response.json();
        setStorageData(result);
      } catch (err) {
        setStorageError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setStorageLoading(false);
      }
    }

    fetchHealth();
    fetchStorage();
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
          <p className="mt-2 text-xs text-neutral-500">Pending + Processing</p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Total Jobs
          </p>
          <p className="mt-2 text-3xl font-bold">
            {totalJobs.toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-neutral-500">All time</p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Failure Rate
          </p>
          <p className="mt-2 text-3xl font-bold">
            {overallFailureRate.toFixed(1)}%
          </p>
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
            )}
            s
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
              <YAxis
                label={{ value: "Seconds", angle: -90, position: "insideLeft" }}
              />
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
              <YAxis
                label={{
                  value: "Percentage",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
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
              <p className="text-2xl font-bold">
                {status.count.toLocaleString()}
              </p>
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

      {/* R2 Storage Metrics */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">R2 Storage</h2>
        {storageLoading
          ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded bg-neutral-100"
                />
              ))}
            </div>
          )
          : storageError
          ? (
            <p className="text-center text-red-500">
              Error loading storage data: {storageError}
            </p>
          )
          : !storageData?.isConfigured
          ? (
            <p className="text-center text-neutral-500">
              R2 storage is not configured. Set environment variables to enable storage monitoring.
            </p>
          )
          : (
            <>
              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Total Storage
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {storageData.totalSizeFormatted}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Total Files
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {storageData.totalFiles.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Images Stored
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {storageData.imageStats.count.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {storageData.imageStats.sizeFormatted}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Avg File Size
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {storageData.averageSizeFormatted}
                  </p>
                </div>
              </div>

              {/* File Type Breakdown */}
              {Object.keys(storageData.byFileType).length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Storage by File Type
                  </h3>
                  <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
                    {Object.entries(storageData.byFileType)
                      .sort((a, b) => b[1].sizeBytes - a[1].sizeBytes)
                      .slice(0, 8)
                      .map(([ext, fileData]) => (
                        <div
                          key={ext}
                          className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2 dark:border-neutral-800"
                        >
                          <span className="font-mono text-sm uppercase">
                            .{ext}
                          </span>
                          <span className="text-sm text-neutral-500">
                            {fileData.count} ({fileData.sizeFormatted})
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
      </Card>
    </div>
  );
}
