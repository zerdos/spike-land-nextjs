"use client";

import {
  type AttributionModel,
  AttributionModelSelector,
} from "@/components/admin/marketing/attribution/AttributionModelSelector";
import { ExportButton } from "@/components/admin/marketing/attribution/ExportButton";
import { ModelComparisonTable } from "@/components/admin/marketing/attribution/ModelComparisonTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DateRange, DateRangePreset } from "../DateRangePicker";
import { DateRangePicker, formatDateForAPI, getDateRangeFromPreset } from "../DateRangePicker";

interface AttributionData {
  totalConversions: number;
  comparison: {
    model: string;
    value: number;
    conversionCount: number;
  }[];
  platformBreakdown: {
    platform: string;
    conversionCount: number;
    value: number;
    model: string;
  }[];
}

interface AttributionTabProps {
  className?: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export function AttributionTab({ className }: AttributionTabProps) {
  const [data, setData] = useState<AttributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DateRangePreset>("30d");
  const [dateRange, setDateRange] = useState<DateRange>(
    getDateRangeFromPreset("30d"),
  );
  const [activeModel, setActiveModel] = useState<AttributionModel>("FIRST_TOUCH");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: formatDateForAPI(dateRange.startDate),
        endDate: formatDateForAPI(dateRange.endDate),
      });

      const response = await fetch(
        `/api/admin/marketing/analytics/attribution?${params}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch attribution data");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePresetChange = (preset: DateRangePreset) => {
    setDatePreset(preset);
    if (preset !== "custom") {
      setDateRange(getDateRangeFromPreset(preset));
    }
  };

  const getBreakdownData = () => {
    if (!data) return [];
    return data.platformBreakdown.filter((item) => item.model === activeModel);
  };

  if (error) {
    return (
      <div
        className={cn(
          "flex min-h-[400px] flex-col items-center justify-center space-y-4 rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center",
          className,
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <svg
            className="h-6 w-6 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-destructive">
            Unable to Load Attribution Data
          </h3>
          <p className="max-w-md text-sm text-destructive/80">
            {error ||
              "An unexpected error occurred while fetching attribution insights. Please try again or check your filters."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchData()}
          className="mt-2 border-destructive/20 hover:bg-destructive/10"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry Analysis
        </Button>
      </div>
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
        <ExportButton
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          selectedModel={activeModel}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Model Comparison Table */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Attribution Model Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {loading
              ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )
              : <ModelComparisonTable models={data?.comparison || []} />}
          </CardContent>
        </Card>

        {/* Model Comparison Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Attribution Value by Model</CardTitle>
          </CardHeader>
          <CardContent>
            {loading
              ? <Skeleton className="h-[300px] w-full" />
              : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data?.comparison}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="model" />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#8884d8"
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#82ca9d"
                      />
                      <Tooltip />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="value"
                        fill="#8884d8"
                        name="Total Value"
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="conversionCount"
                        fill="#82ca9d"
                        name="Conversions"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Breakdown by Platform */}
        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Platform Breakdown</CardTitle>
              <AttributionModelSelector
                selectedModel={activeModel}
                onModelChange={setActiveModel}
                className="w-[200px]"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="FIRST_TOUCH"
              value={activeModel}
              onValueChange={(value) => setActiveModel(value as AttributionModel)}
            >
              <TabsList className="mb-4 hidden">
                <TabsTrigger value="FIRST_TOUCH">First Touch</TabsTrigger>
                <TabsTrigger value="LAST_TOUCH">Last Touch</TabsTrigger>
                <TabsTrigger value="LINEAR">Linear</TabsTrigger>
                <TabsTrigger value="TIME_DECAY">Time Decay</TabsTrigger>
                <TabsTrigger value="POSITION_BASED">Position-Based</TabsTrigger>
              </TabsList>

              <TabsContent value={activeModel} className="h-[300px]">
                {loading
                  ? <Skeleton className="h-full w-full" />
                  : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getBreakdownData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="platform"
                        >
                          {getBreakdownData().map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Summary Stats Table */}
        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>Detailed Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading
              ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              )
              : (
                <div className="space-y-4">
                  <div className="flex justify-between border-b pb-2 font-medium">
                    <span>Platform</span>
                    <span>Value</span>
                  </div>
                  {getBreakdownData().map((item) => (
                    <div
                      key={item.platform}
                      className="flex justify-between border-b border-dashed pb-2 last:border-0"
                    >
                      <span>{item.platform}</span>
                      <span className="font-mono">
                        {item.value.toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                        })}
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({item.conversionCount.toFixed(1)})
                        </span>
                      </span>
                    </div>
                  ))}
                  {getBreakdownData().length === 0 && (
                    <div className="py-4 text-center text-muted-foreground">
                      No data available for this period.
                    </div>
                  )}
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
