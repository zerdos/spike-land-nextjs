"use client";

import { TopPathsList } from "@/components/admin/marketing/journey/TopPathsList";
import { TransitionFlow } from "@/components/admin/marketing/journey/TransitionFlow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PlatformTransition } from "@spike-npm-land/shared/types";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { DateRange, DateRangePreset } from "../DateRangePicker";
import { DateRangePicker, formatDateForAPI, getDateRangeFromPreset } from "../DateRangePicker";

interface JourneyData {
  transitions: PlatformTransition[];
  topJourneys: {
    path: string[];
    count: number;
  }[];
  avgTouchpoints: number;
  organicToPaidConversions: number;
  totalConversions: number;
}

interface JourneyTabProps {
  className?: string;
}

export function JourneyTab({ className }: JourneyTabProps) {
  const [data, setData] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DateRangePreset>("30d");
  const [dateRange, setDateRange] = useState<DateRange>(
    getDateRangeFromPreset("30d"),
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: formatDateForAPI(dateRange.startDate),
        endDate: formatDateForAPI(dateRange.endDate),
      });

      const response = await fetch(
        `/api/admin/marketing/analytics/journey?${params}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch journey data");
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
            Unable to Load Journey Data
          </h3>
          <p className="max-w-md text-sm text-destructive/80">
            {error ||
              "An unexpected error occurred while fetching journey insights. Please try again or check your filters."}
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
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading
              ? <Skeleton className="h-8 w-24" />
              : (
                <div className="text-3xl font-bold">
                  {data?.totalConversions.toLocaleString() || 0}
                </div>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Touchpoints
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading
              ? <Skeleton className="h-8 w-24" />
              : (
                <div className="text-3xl font-bold">
                  {data?.avgTouchpoints.toFixed(1) || "0.0"}
                </div>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Organic → Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading
              ? <Skeleton className="h-8 w-24" />
              : (
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold">
                    {data?.organicToPaidConversions.toLocaleString() || 0}
                  </div>
                  {data && data.totalConversions > 0 && (
                    <div className="text-sm text-muted-foreground">
                      (
                      {(
                        (data.organicToPaidConversions / data.totalConversions) *
                        100
                      ).toFixed(1)}
                      %)
                    </div>
                  )}
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        {/* Platform Transitions */}
        {loading
          ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </CardContent>
            </Card>
          )
          : <TransitionFlow transitions={data?.transitions || []} />}

        {/* Top Conversion Paths */}
        {loading
          ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </CardContent>
            </Card>
          )
          : (
            <TopPathsList
              paths={data?.topJourneys || []}
              totalConversions={data?.totalConversions || 0}
            />
          )}
      </div>
    </div>
  );
}
