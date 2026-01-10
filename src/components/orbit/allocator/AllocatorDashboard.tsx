/**
 * Allocator Dashboard
 *
 * Main dashboard component for budget allocation recommendations.
 * Displays spend overview, performance charts, and recommendation cards.
 *
 * Resolves #552
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  AllocatorRecommendationsResponse,
  BudgetRecommendation,
  CampaignPerformanceAnalysis,
} from "@/lib/allocator/allocator-types";

import { PerformanceChart } from "./PerformanceChart";
import { RecommendationCard } from "./RecommendationCard";
import { SpendOverviewCards } from "./SpendOverviewCards";

interface AllocatorDashboardProps {
  workspaceSlug: string;
}

type LookbackPeriod = "7" | "14" | "30" | "60" | "90";
type RiskTolerance = "conservative" | "moderate" | "aggressive";

interface AllocatorData {
  campaignAnalyses: CampaignPerformanceAnalysis[];
  recommendations: BudgetRecommendation[];
  summary: AllocatorRecommendationsResponse["summary"];
  hasEnoughData: boolean;
  dataQualityScore: number;
  workspaceName: string;
  analysisRange: {
    start: string;
    end: string;
  };
}

export function AllocatorDashboard({ workspaceSlug }: AllocatorDashboardProps) {
  const [data, setData] = useState<AllocatorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lookbackDays, setLookbackDays] = useState<LookbackPeriod>("30");
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>("moderate");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lookbackDays,
        riskTolerance,
      });

      const response = await fetch(
        `/api/orbit/${workspaceSlug}/allocator?${params.toString()}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch allocator data");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug, lookbackDays, riskTolerance]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApplyRecommendation = async (recommendationId: string) => {
    // TODO: Implement recommendation application
    console.log("Applying recommendation:", recommendationId);
    // This would typically call an API to apply the budget change
    // Then refresh the data
    await fetchData();
  };

  if (isLoading) {
    return <AllocatorDashboardSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertDescription>No data available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Period:</span>
          <Select
            value={lookbackDays}
            onValueChange={(v) => setLookbackDays(v as LookbackPeriod)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Risk:</span>
          <Select
            value={riskTolerance}
            onValueChange={(v) => setRiskTolerance(v as RiskTolerance)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Quality Warning */}
      {!data.hasEnoughData && (
        <Alert>
          <AlertDescription>
            Limited data available for analysis. Recommendations may be less accurate. Connect more
            ad accounts or wait for more data to accumulate.
          </AlertDescription>
        </Alert>
      )}

      {/* Spend Overview */}
      <SpendOverviewCards
        summary={data.summary}
        campaignAnalyses={data.campaignAnalyses}
        dataQualityScore={data.dataQualityScore}
      />

      {/* Performance Charts */}
      <PerformanceChart
        campaignAnalyses={data.campaignAnalyses}
        lookbackDays={parseInt(lookbackDays)}
      />

      {/* Recommendations */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recommendations</h2>
        {data.recommendations.length === 0
          ? (
            <Alert>
              <AlertDescription>
                No recommendations at this time. Your campaigns are performing well, or there
                isn&apos;t enough data yet to make confident suggestions.
              </AlertDescription>
            </Alert>
          )
          : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.recommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  onApply={() => handleApplyRecommendation(recommendation.id)}
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

function AllocatorDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Controls skeleton */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Overview cards skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>

      {/* Chart skeleton */}
      <Skeleton className="h-80" />

      {/* Recommendations skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    </div>
  );
}
