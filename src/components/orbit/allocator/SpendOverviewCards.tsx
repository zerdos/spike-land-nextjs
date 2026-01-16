/**
 * Spend Overview Cards
 *
 * Displays key metrics including total spend, ROAS, CPA, and data quality.
 * Includes platform breakdown.
 *
 * Resolves #552
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type {
  AllocatorRecommendationsResponse,
  CampaignPerformanceAnalysis,
} from "@/lib/allocator/allocator-types";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

interface SpendOverviewCardsProps {
  summary: AllocatorRecommendationsResponse["summary"];
  campaignAnalyses: CampaignPerformanceAnalysis[];
  dataQualityScore: number;
}

function formatCurrency(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function SpendOverviewCards({
  summary,
  campaignAnalyses,
  dataQualityScore,
}: SpendOverviewCardsProps) {
  // Calculate platform breakdown
  const platformBreakdown = campaignAnalyses.reduce<Record<string, number>>(
    (acc, campaign) => {
      const platform = campaign.platform;
      acc[platform] = (acc[platform] || 0) + campaign.metrics.spend;
      return acc;
    },
    {},
  );

  const totalSpend = summary.totalCurrentSpend;
  const platformColors: Record<string, string> = {
    FACEBOOK: "#1877F2",
    GOOGLE_ADS: "#4285F4",
    LINKEDIN: "#0A66C2",
    TWITTER: "#1DA1F2",
    TIKTOK: "#000000",
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Spend Card */}
      <Card variant="default">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Spend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(totalSpend, summary.currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.totalCampaignsAnalyzed} campaigns analyzed
          </p>
          {/* Platform breakdown */}
          <div className="mt-3 space-y-2">
            {Object.entries(platformBreakdown).map(([platform, spend]) => (
              <div
                key={platform}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: platformColors[platform] || "#888",
                    }}
                  />
                  <span className="text-muted-foreground">{platform}</span>
                </div>
                <span>{formatCurrency(spend, summary.currency)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Average ROAS Card */}
      <Card variant="default">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Average ROAS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {summary.averageRoas.toFixed(2)}x
            </span>
            {summary.projectedTotalImpact.estimatedRoasImprovement !== 0 && (
              <span
                className={cn(
                  "flex items-center text-sm",
                  summary.projectedTotalImpact.estimatedRoasImprovement > 0
                    ? "text-emerald-500"
                    : "text-red-500",
                )}
              >
                {summary.projectedTotalImpact.estimatedRoasImprovement > 0
                  ? <TrendingUp className="h-4 w-4 mr-1" />
                  : <TrendingDown className="h-4 w-4 mr-1" />}
                {formatPercent(
                  summary.projectedTotalImpact.estimatedRoasImprovement,
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Return on ad spend
          </p>
        </CardContent>
      </Card>

      {/* Average CPA Card */}
      <Card variant="default">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Average CPA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {formatCurrency(summary.averageCpa, summary.currency)}
            </span>
            {summary.projectedTotalImpact.estimatedCpaSavings !== 0 && (
              <span
                className={cn(
                  "flex items-center text-sm",
                  // For CPA, negative is good (lower cost)
                  summary.projectedTotalImpact.estimatedCpaSavings < 0
                    ? "text-emerald-500"
                    : "text-red-500",
                )}
              >
                {summary.projectedTotalImpact.estimatedCpaSavings < 0
                  ? <TrendingDown className="h-4 w-4 mr-1" />
                  : <TrendingUp className="h-4 w-4 mr-1" />}
                {formatPercent(
                  summary.projectedTotalImpact.estimatedCpaSavings,
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cost per acquisition
          </p>
        </CardContent>
      </Card>

      {/* Data Quality Card */}
      <Card variant="default">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Data Quality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dataQualityScore}%</div>
          <Progress
            value={dataQualityScore}
            className="mt-2 h-2"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {dataQualityScore >= 80
              ? "Excellent data for accurate recommendations"
              : dataQualityScore >= 50
              ? "Good data, recommendations may vary"
              : "Limited data, connect more accounts"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
