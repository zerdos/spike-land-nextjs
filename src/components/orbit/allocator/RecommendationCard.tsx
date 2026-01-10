/**
 * Recommendation Card
 *
 * Displays a single budget recommendation with impact projections
 * and an action button to apply the change.
 *
 * Resolves #552
 */

"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { BudgetRecommendation, RecommendationType } from "@/lib/allocator/allocator-types";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

interface RecommendationCardProps {
  recommendation: BudgetRecommendation;
  onApply: () => Promise<void>;
}

const recommendationTypeConfig: Record<
  RecommendationType,
  { icon: LucideIcon; label: string; color: string; }
> = {
  INCREASE_BUDGET: {
    icon: TrendingUp,
    label: "Increase Budget",
    color: "text-emerald-500",
  },
  DECREASE_BUDGET: {
    icon: TrendingDown,
    label: "Decrease Budget",
    color: "text-amber-500",
  },
  REALLOCATE: {
    icon: RefreshCw,
    label: "Reallocate",
    color: "text-blue-500",
  },
  PAUSE_CAMPAIGN: {
    icon: Pause,
    label: "Pause Campaign",
    color: "text-red-500",
  },
  RESUME_CAMPAIGN: {
    icon: Play,
    label: "Resume Campaign",
    color: "text-emerald-500",
  },
  SCALE_WINNER: {
    icon: Zap,
    label: "Scale Winner",
    color: "text-purple-500",
  },
};

const confidenceConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline"; }
> = {
  high: { label: "High Confidence", variant: "default" },
  medium: { label: "Medium Confidence", variant: "secondary" },
  low: { label: "Low Confidence", variant: "outline" },
};

function formatCurrency(cents: number, currency = "USD"): string {
  const value = cents / 100;
  const sign = value >= 0 ? "+" : "";
  return `${sign}${
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function RecommendationCard({
  recommendation,
  onApply,
}: RecommendationCardProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  const typeConfig = recommendationTypeConfig[recommendation.type] ?? {
    icon: TrendingUp,
    label: "Unknown",
    color: "text-muted-foreground",
  };
  const TypeIcon = typeConfig.icon;
  const confConfig = confidenceConfig[recommendation.confidence] ?? {
    label: "Unknown",
    variant: "outline" as const,
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApply();
      setIsApplied(true);
    } finally {
      setIsApplying(false);
    }
  };

  const isExpired = new Date(recommendation.expiresAt) < new Date();

  return (
    <Card variant="default" className={cn(isExpired && "opacity-60")}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <TypeIcon className={cn("h-5 w-5", typeConfig.color)} />
            <CardTitle className="text-base">{typeConfig.label}</CardTitle>
          </div>
          <Badge variant={confConfig.variant} className="text-xs">
            {confConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Campaign info */}
        <div className="space-y-2">
          {recommendation.sourceCampaign && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">From:</span>
              <span className="font-medium">{recommendation.sourceCampaign.name}</span>
              <Badge variant="outline" className="text-xs">
                {recommendation.sourceCampaign.platform}
              </Badge>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {recommendation.sourceCampaign ? "To:" : "Campaign:"}
            </span>
            <span className="font-medium">{recommendation.targetCampaign.name}</span>
            <Badge variant="outline" className="text-xs">
              {recommendation.targetCampaign.platform}
            </Badge>
          </div>
        </div>

        {/* Budget change */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
          <div>
            <p className="text-xs text-muted-foreground">Budget Change</p>
            <p
              className={cn(
                "text-xl font-bold",
                recommendation.suggestedBudgetChange >= 0
                  ? "text-emerald-500"
                  : "text-red-500",
              )}
            >
              {formatCurrency(recommendation.suggestedBudgetChange, recommendation.currency)}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <div className="text-right">
            <p className="text-xs text-muted-foreground">New Budget</p>
            <p className="text-xl font-bold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: recommendation.currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(recommendation.suggestedNewBudget / 100)}
            </p>
          </div>
        </div>

        {/* Projected impact */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Projected Impact</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded bg-white/5">
              <p
                className={cn(
                  "text-sm font-bold",
                  recommendation.projectedImpact.estimatedRoasChange >= 0
                    ? "text-emerald-500"
                    : "text-red-500",
                )}
              >
                {formatPercent(recommendation.projectedImpact.estimatedRoasChange)}
              </p>
              <p className="text-xs text-muted-foreground">ROAS</p>
            </div>
            <div className="text-center p-2 rounded bg-white/5">
              <p
                className={cn(
                  "text-sm font-bold",
                  // For CPA, negative is good
                  recommendation.projectedImpact.estimatedCpaChange <= 0
                    ? "text-emerald-500"
                    : "text-red-500",
                )}
              >
                {formatPercent(recommendation.projectedImpact.estimatedCpaChange)}
              </p>
              <p className="text-xs text-muted-foreground">CPA</p>
            </div>
            <div className="text-center p-2 rounded bg-white/5">
              <p
                className={cn(
                  "text-sm font-bold",
                  recommendation.projectedImpact.estimatedConversionChange >= 0
                    ? "text-emerald-500"
                    : "text-red-500",
                )}
              >
                {formatPercent(recommendation.projectedImpact.estimatedConversionChange)}
              </p>
              <p className="text-xs text-muted-foreground">Conv.</p>
            </div>
          </div>
        </div>

        {/* Reason */}
        <p className="text-sm text-muted-foreground">{recommendation.reason}</p>

        {/* Supporting data */}
        {recommendation.supportingData.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recommendation.supportingData.map((data, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {data}
              </Badge>
            ))}
          </div>
        )}

        {/* Expiration warning */}
        {isExpired && (
          <div className="flex items-center gap-2 text-amber-500 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>This recommendation has expired</span>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleApply}
          disabled={isApplying || isApplied || isExpired}
          className="w-full"
          variant={isApplied ? "outline" : "default"}
        >
          {isApplying
            ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            )
            : isApplied
            ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Applied
              </>
            )
            : (
              "Apply Recommendation"
            )}
        </Button>
      </CardFooter>
    </Card>
  );
}
