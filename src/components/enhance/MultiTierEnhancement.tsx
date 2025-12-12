"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  calculateTotalCost,
  canAffordTiers,
  type EnhancementTier,
  type JobStatus,
  TIER_INFO,
} from "@/types/enhancement";
import { AlertTriangle, Coins, Loader2, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

/**
 * Props for the MultiTierEnhancement component
 */
export interface MultiTierEnhancementProps {
  /** ID of the image to enhance */
  imageId: string;
  /** User's current token balance */
  userBalance: number;
  /** Callback fired when enhancement starts */
  onEnhancementStart?: (tiers: EnhancementTier[]) => void;
  /** Callback fired when all enhancements complete */
  onEnhancementComplete?: (jobs: JobStatus[]) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * All available enhancement tiers in order
 */
const ALL_TIERS: EnhancementTier[] = ["TIER_1K", "TIER_2K", "TIER_4K"];

/**
 * MultiTierEnhancement component for selecting and triggering parallel tier enhancements.
 *
 * Allows users to select multiple enhancement tiers via checkboxes and initiates
 * parallel processing for all selected tiers with a single button click.
 *
 * @example
 * ```tsx
 * <MultiTierEnhancement
 *   imageId="img_123"
 *   userBalance={25}
 *   onEnhancementStart={(tiers) => console.log("Started:", tiers)}
 *   onEnhancementComplete={(jobs) => console.log("Completed:", jobs)}
 * />
 * ```
 */
export function MultiTierEnhancement({
  imageId,
  userBalance,
  onEnhancementStart,
  onEnhancementComplete,
  disabled = false,
  className,
}: MultiTierEnhancementProps) {
  const [selectedTiers, setSelectedTiers] = useState<Set<EnhancementTier>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const totalCost = calculateTotalCost(Array.from(selectedTiers));
  const hasEnoughTokens = canAffordTiers(Array.from(selectedTiers), userBalance);
  const hasSelectedTiers = selectedTiers.size > 0;

  /**
   * Toggle a tier's selection state
   */
  const toggleTier = useCallback((tier: EnhancementTier) => {
    setSelectedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) {
        next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  }, []);

  /**
   * Check if a specific tier is affordable given current balance and other selections
   */
  const canAffordTier = useCallback(
    (tier: EnhancementTier): boolean => {
      const otherSelectedTiers = Array.from(selectedTiers).filter((t) => t !== tier);
      const otherCost = calculateTotalCost(otherSelectedTiers);
      const tierCost = TIER_INFO[tier].cost;
      return userBalance >= otherCost + tierCost;
    },
    [selectedTiers, userBalance],
  );

  /**
   * Poll for job statuses until all complete
   */
  const pollJobStatuses = useCallback(
    async (jobIds: string[], tierMap: Map<string, EnhancementTier>) => {
      const initialInterval = 2000;
      const maxInterval = 10000;
      const backoffMultiplier = 1.5;
      const maxAttempts = 60;

      let attempts = 0;
      let currentInterval = initialInterval;
      const jobStatuses: Map<string, JobStatus> = new Map();

      // Initialize job statuses
      for (const [jobId, tier] of tierMap.entries()) {
        jobStatuses.set(jobId, {
          jobId,
          tier,
          status: "PROCESSING",
          tokensCost: TIER_INFO[tier].cost,
        });
      }

      const poll = async () => {
        attempts++;

        try {
          const response = await fetch("/api/jobs/batch-status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ jobIds }),
          });

          if (!response.ok) {
            throw new Error("Failed to fetch batch status");
          }

          const data = await response.json();

          // Update statuses
          for (const job of data.jobs || []) {
            const existingStatus = jobStatuses.get(job.id);
            if (existingStatus) {
              jobStatuses.set(job.id, {
                ...existingStatus,
                status: job.status,
                enhancedUrl: job.enhancedUrl,
                enhancedWidth: job.enhancedWidth,
                enhancedHeight: job.enhancedHeight,
                error: job.errorMessage,
              });
            }
          }

          // Check if all jobs are complete
          const allStatuses = Array.from(jobStatuses.values());
          const allComplete = allStatuses.every(
            (s) => s.status === "COMPLETED" || s.status === "FAILED" || s.status === "CANCELLED",
          );

          if (allComplete || attempts >= maxAttempts) {
            setIsProcessing(false);
            setSelectedTiers(new Set());
            onEnhancementComplete?.(allStatuses);
          } else {
            currentInterval = Math.min(currentInterval * backoffMultiplier, maxInterval);
            setTimeout(poll, currentInterval);
          }
        } catch (error) {
          console.error("Error polling job statuses:", error);
          setIsProcessing(false);
          const failedStatuses = Array.from(jobStatuses.values()).map((s) => ({
            ...s,
            status: "FAILED" as const,
            error: "Failed to check job status",
          }));
          onEnhancementComplete?.(failedStatuses);
        }
      };

      poll();
    },
    [onEnhancementComplete],
  );

  /**
   * Start the parallel enhancement process
   */
  const handleEnhance = useCallback(async () => {
    if (!hasSelectedTiers || !hasEnoughTokens || isProcessing || disabled) {
      return;
    }

    const tiersToEnhance = Array.from(selectedTiers);
    setIsProcessing(true);
    onEnhancementStart?.(tiersToEnhance);

    try {
      const response = await fetch("/api/images/parallel-enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageId,
          tiers: tiersToEnhance,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start enhancement");
      }

      const data = await response.json();

      // Create a map of jobId -> tier for tracking
      const tierMap = new Map<string, EnhancementTier>();
      for (const job of data.jobs || []) {
        // Validate that tier is a valid EnhancementTier
        const tier = job.tier as string;
        if (tier === "TIER_1K" || tier === "TIER_2K" || tier === "TIER_4K") {
          tierMap.set(job.jobId, tier);
        }
      }

      // Start polling for completion
      const jobIds = Array.from(tierMap.keys());
      if (jobIds.length > 0) {
        pollJobStatuses(jobIds, tierMap);
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Enhancement error:", error);
      setIsProcessing(false);

      // Return failed status for all tiers
      const failedJobs: JobStatus[] = tiersToEnhance.map((tier) => ({
        jobId: "",
        tier,
        status: "FAILED",
        error: error instanceof Error ? error.message : "Enhancement failed",
        tokensCost: TIER_INFO[tier].cost,
      }));
      onEnhancementComplete?.(failedJobs);
    }
  }, [
    hasSelectedTiers,
    hasEnoughTokens,
    isProcessing,
    disabled,
    selectedTiers,
    imageId,
    onEnhancementStart,
    onEnhancementComplete,
    pollJobStatuses,
  ]);

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Select Enhancement Tiers</CardTitle>
        <CardDescription>Choose one or more tiers to enhance in parallel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tier Selection Checkboxes */}
        <div className="space-y-3" role="group" aria-label="Enhancement tier selection">
          {ALL_TIERS.map((tier) => {
            const info = TIER_INFO[tier];
            const isSelected = selectedTiers.has(tier);
            const isAffordable = canAffordTier(tier);
            const isDisabled = disabled || isProcessing || (!isSelected && !isAffordable);

            return (
              <div
                key={tier}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                  isSelected && "border-primary bg-primary/5",
                  !isSelected && "border-border hover:border-border/80",
                  isDisabled && "opacity-50",
                )}
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`tier-${tier}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleTier(tier)}
                    disabled={isDisabled}
                    aria-describedby={`tier-${tier}-description`}
                  />
                  <Label
                    htmlFor={`tier-${tier}`}
                    className={cn("cursor-pointer", isDisabled && "cursor-not-allowed")}
                  >
                    <span className="font-medium">
                      {info.name} ({info.resolution})
                    </span>
                    <span
                      id={`tier-${tier}-description`}
                      className="block text-xs text-muted-foreground"
                    >
                      {info.description}
                    </span>
                  </Label>
                </div>
                <span className="text-sm font-medium whitespace-nowrap">{info.cost} tokens</span>
              </div>
            );
          })}
        </div>

        {/* Cost Summary */}
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total cost:</span>
            <span className="font-semibold">{totalCost} tokens</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Coins className="h-4 w-4 text-yellow-500" />
              Your balance:
            </span>
            <span
              className={cn(
                "font-semibold",
                !hasEnoughTokens && hasSelectedTiers && "text-destructive",
              )}
            >
              {userBalance} tokens
            </span>
          </div>
        </div>

        {/* Insufficient Balance Warning */}
        {hasSelectedTiers && !hasEnoughTokens && (
          <div
            className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">
              Insufficient tokens. You need {totalCost} tokens but only have {userBalance}.
            </p>
          </div>
        )}

        {/* Enhance Button */}
        <Button
          onClick={handleEnhance}
          disabled={disabled || isProcessing || !hasSelectedTiers || !hasEnoughTokens}
          className="w-full"
          size="lg"
        >
          {isProcessing
            ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enhancing...
              </>
            )
            : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Enhance Selected Tiers
                {hasSelectedTiers && ` (${totalCost} tokens)`}
              </>
            )}
        </Button>
      </CardContent>
    </Card>
  );
}
