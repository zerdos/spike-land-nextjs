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

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { useAutopilotConfig } from "@/hooks/useAutopilotConfig";
import { Settings } from "lucide-react";
import { AutopilotConfigPanel } from "./AutopilotConfigPanel";
import { AutopilotExecutionHistory } from "./AutopilotExecutionHistory";
import { AutopilotToggle } from "./AutopilotToggle";
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
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const {
    config: autopilotConfig,
    isLoading: isAutopilotLoading,
    toggleAutopilot,
    updateConfig: updateAutopilotConfig,
    refreshConfig: refreshAutopilotConfig,
  } = useAutopilotConfig(workspaceSlug);

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
      {/* Header Area with Autopilot Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-4 items-center">
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

        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-2 bg-secondary/20 p-2 rounded-lg border">
            <AutopilotToggle
              isEnabled={autopilotConfig?.isEnabled ?? false}
              isLoading={isAutopilotLoading}
              onToggle={toggleAutopilot}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              title="Autopilot Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={async () => {
                setIsLoading(true);
                try {
                  await fetch(`/api/orbit/${workspaceSlug}/allocator/google/sync`, {
                    method: "POST",
                  });
                  await fetchData();
                } catch (_err) {
                  setError("Failed to sync Google Ads");
                } finally {
                  setIsLoading(false);
                }
              }}
              className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Sync Google Ads
            </button>
            <button
              onClick={async () => {
                setIsLoading(true);
                try {
                  await fetch(`/api/orbit/${workspaceSlug}/allocator/facebook/sync`, {
                    method: "POST",
                  });
                  await fetchData();
                } catch (_err) {
                  setError("Failed to sync Facebook Ads");
                } finally {
                  setIsLoading(false);
                }
              }}
              className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Sync Facebook Ads
            </button>
          </div>
        </div>
      </div>

      {/* Autopilot Config Panel (Collapsible) */}
      <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <CollapsibleContent className="space-y-4 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AutopilotConfigPanel
                config={autopilotConfig}
                onSave={async (data) => {
                  await updateAutopilotConfig(data);
                  setIsConfigOpen(false);
                }}
              />
            </div>
            <div>
              <AutopilotExecutionHistory workspaceSlug={workspaceSlug} />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

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
        <Skeleton className="h-10 w-48 ml-auto" />
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
