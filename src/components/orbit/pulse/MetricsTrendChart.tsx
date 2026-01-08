/**
 * Metrics Trend Chart
 *
 * Displays a line chart showing metrics trends over the last 7 days
 * with support for multiple metrics and platform filtering.
 *
 * Resolves #649
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface MetricDataPoint {
  date: string;
  followers?: number;
  engagement?: number;
  impressions?: number;
  reach?: number;
}

interface MetricsTrendChartProps {
  data: MetricDataPoint[];
  metrics?: Array<"followers" | "engagement" | "impressions" | "reach">;
  title?: string;
  isLoading?: boolean;
}

const metricConfig: Record<
  string,
  {
    label: string;
    color: string;
    formatter: (value: number) => string;
  }
> = {
  followers: {
    label: "Followers",
    color: "#10b981",
    formatter: (v) => formatNumber(v),
  },
  engagement: {
    label: "Engagement",
    color: "#f59e0b",
    formatter: (v) => `${v.toFixed(2)}%`,
  },
  impressions: {
    label: "Impressions",
    color: "#3b82f6",
    formatter: (v) => formatNumber(v),
  },
  reach: {
    label: "Reach",
    color: "#8b5cf6",
    formatter: (v) => formatNumber(v),
  },
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

function calculateTrend(data: MetricDataPoint[], metric: string): number {
  if (data.length < 2) return 0;

  const values = data
    .map((d) => d[metric as keyof MetricDataPoint] as number)
    .filter((v) => v !== undefined);

  if (values.length < 2) return 0;

  const first = values[0]!;
  const last = values[values.length - 1]!;

  if (first === 0) return last > 0 ? 100 : 0;
  return ((last - first) / first) * 100;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 shadow-xl">
      <p className="text-white/60 text-xs mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-white/80">{entry.name}:</span>
          <span className="text-white font-medium">
            {metricConfig[entry.name.toLowerCase()]?.formatter(entry.value) ??
              entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <Card variant="default">
      <CardHeader className="pb-2">
        <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-white/5 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

export function MetricsTrendChart({
  data,
  metrics = ["followers"],
  title = "Performance Trends",
  isLoading = false,
}: MetricsTrendChartProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const primaryMetric = metrics[0] ?? "followers";
  const trend = calculateTrend(data, primaryMetric);
  const isPositive = trend >= 0;

  return (
    <Card variant="default" className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-white/90">
            {title}
          </CardTitle>
          <div
            className={cn(
              "flex items-center gap-1 text-sm",
              isPositive ? "text-emerald-400" : "text-red-400",
            )}
          >
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{isPositive ? "+" : ""}{trend.toFixed(1)}%</span>
          </div>
        </div>
        <p className="text-xs text-white/40">Last 7 days</p>
      </CardHeader>
      <CardContent>
        {data.length === 0
          ? (
            <div className="h-64 flex items-center justify-center text-white/40">
              No data available
            </div>
          )
          : (
            <ResponsiveContainer width="100%" height={256}>
              <LineChart
                data={data}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                {metrics.length > 1 && (
                  <Legend
                    wrapperStyle={{
                      paddingTop: "10px",
                    }}
                  />
                )}
                {metrics.map((metric) => (
                  <Line
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    name={metricConfig[metric]?.label ?? metric}
                    stroke={metricConfig[metric]?.color ?? "#ffffff"}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: metricConfig[metric]?.color ?? "#ffffff",
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
      </CardContent>
    </Card>
  );
}
