"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import {
  DateRange,
  DateRangePicker,
  DateRangePreset,
  formatDateForAPI,
  getDateRangeFromPreset,
} from "../DateRangePicker";

interface FunnelStage {
  name: string;
  count: number;
  conversionRate: number;
  dropoffRate: number;
}

interface FunnelData {
  stages: FunnelStage[];
  campaigns: Array<{
    id: string;
    name: string;
  }>;
}

interface FunnelTabProps {
  className?: string;
}

const STAGE_COLORS = [
  "bg-blue-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-pink-500",
];

export function FunnelTab({ className }: FunnelTabProps) {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DateRangePreset>("30d");
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromPreset("30d"));
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: formatDateForAPI(dateRange.startDate),
        endDate: formatDateForAPI(dateRange.endDate),
      });

      if (selectedCampaign !== "all") {
        params.set("utmCampaign", selectedCampaign);
      }

      const response = await fetch(`/api/admin/marketing/analytics/funnel?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch funnel data");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedCampaign]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePresetChange = (preset: DateRangePreset) => {
    setDatePreset(preset);
    if (preset !== "custom") {
      setDateRange(getDateRangeFromPreset(preset));
    }
  };

  const maxCount = data?.stages[0]?.count || 1;

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
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by campaign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {data?.campaigns?.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          {loading
            ? (
              <div className="space-y-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            )
            : (
              <div className="space-y-1">
                {data?.stages.map((stage, index) => {
                  const widthPercent = (stage.count / maxCount) * 100;
                  const isLast = index === (data?.stages.length || 0) - 1;

                  return (
                    <div key={stage.name}>
                      {/* Funnel Stage */}
                      <div className="relative">
                        <div
                          className={cn(
                            "relative rounded-lg p-4 transition-all",
                            STAGE_COLORS[index % STAGE_COLORS.length],
                          )}
                          style={{ width: `${Math.max(widthPercent, 20)}%` }}
                        >
                          <div className="flex items-center justify-between text-white">
                            <div>
                              <p className="font-semibold">{stage.name}</p>
                              <p className="text-2xl font-bold">{stage.count.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              {index > 0 && (
                                <p className="text-sm opacity-90">
                                  {stage.conversionRate.toFixed(1)}% from previous
                                </p>
                              )}
                              <p className="text-sm opacity-75">
                                {((stage.count / maxCount) * 100).toFixed(1)}% of total
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Dropoff indicator between stages */}
                        {!isLast && data?.stages[index + 1] && (
                          <div className="my-2 ml-4 flex items-center gap-2 text-sm text-muted-foreground">
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 14l-7 7m0 0l-7-7m7 7V3"
                              />
                            </svg>
                            <span>
                              {stage.dropoffRate.toFixed(1)}% drop-off (
                              {(stage.count - (data.stages[index + 1]?.count ?? 0))
                                .toLocaleString()} users)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {!loading && data && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Visitors</p>
              <p className="text-2xl font-bold">{data.stages[0]?.count.toLocaleString() || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Purchases</p>
              <p className="text-2xl font-bold">
                {data.stages[data.stages.length - 1]?.count.toLocaleString() || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Overall Conversion Rate</p>
              <p className="text-2xl font-bold">
                {data.stages[0]?.count
                  ? (
                    ((data.stages[data.stages.length - 1]?.count ?? 0) / data.stages[0].count) * 100
                  ).toFixed(2)
                  : 0}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
