"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallback, useEffect, useState } from "react";
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AttributionModel, AttributionToggle } from "../AttributionToggle";
import {
  DateRange,
  DateRangePicker,
  DateRangePreset,
  formatDateForAPI,
  getDateRangeFromPreset,
} from "../DateRangePicker";
import { MetricCardData, MetricCards } from "../MetricCards";

interface OverviewData {
  metrics: {
    visitors: number;
    visitorsChange: number;
    signups: number;
    signupsChange: number;
    conversionRate: number;
    conversionRateChange: number;
    revenue: number;
    revenueChange: number;
  };
  daily: Array<{
    date: string;
    visitors: number;
    conversions: number;
  }>;
  trafficSources: Array<{
    name: string;
    value: number;
  }>;
}

const TRAFFIC_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

interface OverviewTabProps {
  className?: string;
}

export function OverviewTab({ className }: OverviewTabProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DateRangePreset>("30d");
  const [dateRange, setDateRange] = useState<DateRange>(
    getDateRangeFromPreset("30d"),
  );
  const [attribution, setAttribution] = useState<AttributionModel>(
    "first-touch",
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Convert frontend format (first-touch) to API format (FIRST_TOUCH)
      const apiAttributionModel = attribution === "first-touch"
        ? "FIRST_TOUCH"
        : "LAST_TOUCH";
      const params = new URLSearchParams({
        startDate: formatDateForAPI(dateRange.startDate),
        endDate: formatDateForAPI(dateRange.endDate),
        attributionModel: apiAttributionModel,
      });

      const response = await fetch(
        `/api/admin/marketing/analytics/overview?${params}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch overview data");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [dateRange, attribution]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePresetChange = (preset: DateRangePreset) => {
    setDatePreset(preset);
    if (preset !== "custom") {
      setDateRange(getDateRangeFromPreset(preset));
    }
  };

  const metrics: MetricCardData[] = data
    ? [
      {
        title: "Visitors",
        value: data.metrics.visitors,
        change: data.metrics.visitorsChange,
        changeLabel: "vs previous period",
      },
      {
        title: "Signups",
        value: data.metrics.signups,
        change: data.metrics.signupsChange,
        changeLabel: "vs previous period",
      },
      {
        title: "Conv. Rate",
        value: `${data.metrics.conversionRate.toFixed(2)}%`,
        change: data.metrics.conversionRateChange,
        changeLabel: "vs previous period",
      },
      {
        title: "Revenue",
        value: `$${data.metrics.revenue.toLocaleString()}`,
        change: data.metrics.revenueChange,
        changeLabel: "vs previous period",
      },
    ]
    : [
      { title: "Visitors", value: 0 },
      { title: "Signups", value: 0 },
      { title: "Conv. Rate", value: "0%" },
      { title: "Revenue", value: "$0" },
    ];

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Controls Row */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DateRangePicker
          preset={datePreset}
          onPresetChange={handlePresetChange}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
        <AttributionToggle value={attribution} onChange={setAttribution} />
      </div>

      {/* Metric Cards */}
      <MetricCards metrics={metrics} loading={loading} className="mb-6" />

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily Trends Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {loading
              ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              )
              : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data?.daily || []}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip
                      labelFormatter={(value) => {
                        const date = new Date(value as string);
                        return date.toLocaleDateString();
                      }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="visitors"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Visitors"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="conversions"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Conversions"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
          </CardContent>
        </Card>

        {/* Traffic Sources Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {loading
              ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Skeleton className="h-[200px] w-[200px] rounded-full" />
                </div>
              )
              : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data?.trafficSources || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: { name?: string; percent?: number; }) => {
                        const name = props.name ?? "Unknown";
                        const percent = props.percent ?? 0;
                        if (percent < 0.05) return null;
                        return `${name} ${(percent * 100).toFixed(0)}%`;
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(data?.trafficSources || []).map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={TRAFFIC_COLORS[index % TRAFFIC_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
