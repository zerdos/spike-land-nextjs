"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Coins, Loader2, Sparkles, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type EnhancementTier = "TIER_1K" | "TIER_2K" | "TIER_4K";

interface EnhancementJob {
  tier: EnhancementTier;
  status: string;
}

interface AlbumImage {
  id: string;
  enhancementJobs: EnhancementJob[];
}

export interface AlbumBatchEnhanceProps {
  albumId: string;
  albumName: string;
  images: AlbumImage[];
  onEnhancementComplete?: () => void;
  className?: string;
}

interface EnhancingImage {
  id: string;
  status: "pending" | "enhancing" | "completed" | "error";
  jobId?: string;
  error?: string;
}

const TIER_INFO: Record<
  EnhancementTier,
  { label: string; cost: number; description: string; }
> = {
  TIER_1K: {
    label: "1K (1024px)",
    cost: 2,
    description: "Fast, good for previews",
  },
  TIER_2K: {
    label: "2K (2048px)",
    cost: 5,
    description: "Balanced quality and speed",
  },
  TIER_4K: { label: "4K (4096px)", cost: 10, description: "Maximum quality" },
};

const TIER_ORDER: EnhancementTier[] = ["TIER_1K", "TIER_2K", "TIER_4K"];

export function countEnhancedByTier(
  images: AlbumImage[],
): Record<EnhancementTier, number> {
  return {
    TIER_1K: images.filter((i) =>
      i.enhancementJobs.some(
        (j) => j.tier === "TIER_1K" && j.status === "COMPLETED",
      )
    ).length,
    TIER_2K: images.filter((i) =>
      i.enhancementJobs.some(
        (j) => j.tier === "TIER_2K" && j.status === "COMPLETED",
      )
    ).length,
    TIER_4K: images.filter((i) =>
      i.enhancementJobs.some(
        (j) => j.tier === "TIER_4K" && j.status === "COMPLETED",
      )
    ).length,
  };
}

export function AlbumBatchEnhance({
  albumId,
  albumName,
  images,
  onEnhancementComplete,
  className,
}: AlbumBatchEnhanceProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<EnhancementTier>("TIER_2K");
  const [isProcessing, setIsProcessing] = useState(false);
  const [enhancingImages, setEnhancingImages] = useState<EnhancingImage[]>([]);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const enhancedCounts = countEnhancedByTier(images);
  const notEnhancedForTier = images.filter(
    (i) =>
      !i.enhancementJobs.some(
        (j) => j.tier === selectedTier && j.status === "COMPLETED",
      ),
  );
  const imagesToEnhance = notEnhancedForTier.length;
  const tierCost = TIER_INFO[selectedTier].cost;
  const totalCost = imagesToEnhance * tierCost;
  const hasEnoughTokens = userBalance !== null && userBalance >= totalCost;

  const pendingCount = enhancingImages.filter(
    (img) => img.status === "pending",
  ).length;
  const enhancingCount = enhancingImages.filter(
    (img) => img.status === "enhancing",
  ).length;
  const completedCount = enhancingImages.filter(
    (img) => img.status === "completed",
  ).length;
  const errorCount = enhancingImages.filter(
    (img) => img.status === "error",
  ).length;
  const progressPercent = enhancingImages.length > 0
    ? Math.round(
      ((completedCount + errorCount) / enhancingImages.length) * 100,
    )
    : 0;

  const fetchBalance = useCallback(async () => {
    setIsLoadingBalance(true);
    try {
      const response = await fetch("/api/tokens/balance");
      if (response.ok) {
        const data = await response.json();
        setUserBalance(data.balance ?? 0);
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    if (isDialogOpen && userBalance === null) {
      fetchBalance();
    }
  }, [isDialogOpen, userBalance, fetchBalance]);

  const pollJobStatuses = useCallback(
    async (jobIds: string[]) => {
      const initialInterval = 2000;
      const maxInterval = 10000;
      const backoffMultiplier = 1.5;
      const maxAttempts = 60;

      let attempts = 0;
      let currentInterval = initialInterval;

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
          const statusChecks = (data.jobs || []).map(
            (
              job: { id: string; status: string; errorMessage: string | null; },
            ) => ({
              jobId: job.id,
              status: job.status,
              error: job.errorMessage,
            }),
          );

          setEnhancingImages((prev) =>
            prev.map((img) => {
              const statusCheck = statusChecks.find(
                (s: { jobId: string; }) => s.jobId === img.jobId,
              );
              if (statusCheck) {
                if (statusCheck.status === "COMPLETED") {
                  return { ...img, status: "completed" as const };
                } else if (statusCheck.status === "FAILED") {
                  return {
                    ...img,
                    status: "error" as const,
                    error: statusCheck.error,
                  };
                }
              }
              return img;
            })
          );

          const allComplete = statusChecks.every(
            (s: { status: string; }) => s.status === "COMPLETED" || s.status === "FAILED",
          );

          if (allComplete || attempts >= maxAttempts) {
            setIsProcessing(false);
            const finalCompleted = statusChecks.filter(
              (s: { status: string; }) => s.status === "COMPLETED",
            ).length;
            const finalFailed = statusChecks.filter(
              (s: { status: string; }) => s.status === "FAILED",
            ).length;

            if (finalCompleted > 0 && finalFailed === 0) {
              toast.success(
                `Successfully enhanced ${finalCompleted} image${finalCompleted !== 1 ? "s" : ""}`,
              );
            } else if (finalCompleted > 0 && finalFailed > 0) {
              toast.warning(
                `Enhanced ${finalCompleted} image${
                  finalCompleted !== 1 ? "s" : ""
                }, ${finalFailed} failed`,
              );
            } else if (finalFailed > 0) {
              toast.error(
                `Enhancement failed for ${finalFailed} image${finalFailed !== 1 ? "s" : ""}`,
              );
            }

            if (onEnhancementComplete) {
              onEnhancementComplete();
            }
          } else {
            currentInterval = Math.min(
              currentInterval * backoffMultiplier,
              maxInterval,
            );
            setTimeout(poll, currentInterval);
          }
        } catch (error) {
          console.error("Error polling job statuses:", error);
          setIsProcessing(false);
          toast.error("Failed to check enhancement status");
        }
      };

      poll();
    },
    [onEnhancementComplete],
  );

  const startBatchEnhancement = useCallback(async () => {
    if (imagesToEnhance === 0 || !hasEnoughTokens) {
      return;
    }

    setIsProcessing(true);

    const imagesToEnhanceList: EnhancingImage[] = notEnhancedForTier.map(
      (img) => ({
        id: img.id,
        status: "pending" as const,
      }),
    );

    setEnhancingImages(imagesToEnhanceList);

    try {
      const response = await fetch("/api/images/batch-enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageIds: notEnhancedForTier.map((img) => img.id),
          tier: selectedTier,
          albumId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Batch enhancement failed");
      }

      const data = await response.json();

      setEnhancingImages((prev) =>
        prev.map((img) => {
          const result = data.results?.find(
            (r: { imageId: string; }) => r.imageId === img.id,
          );
          if (result) {
            return {
              ...img,
              status: result.success
                ? ("enhancing" as const)
                : ("error" as const),
              jobId: result.jobId,
              error: result.error,
            };
          }
          return img;
        })
      );

      fetchBalance();

      const successfulJobs = data.results?.filter((r: { success: boolean; }) => r.success) || [];
      if (successfulJobs.length > 0) {
        pollJobStatuses(successfulJobs.map((r: { jobId: string; }) => r.jobId));
      } else {
        setIsProcessing(false);
        toast.error("Failed to start enhancement for all images");
      }
    } catch (error) {
      setEnhancingImages((prev) =>
        prev.map((img) => ({
          ...img,
          status: "error" as const,
          error: error instanceof Error ? error.message : "Enhancement failed",
        }))
      );
      setIsProcessing(false);
      toast.error(
        error instanceof Error ? error.message : "Batch enhancement failed",
      );
    }
  }, [
    albumId,
    imagesToEnhance,
    hasEnoughTokens,
    notEnhancedForTier,
    selectedTier,
    fetchBalance,
    pollJobStatuses,
  ]);

  const handleDialogClose = useCallback(() => {
    if (!isProcessing) {
      setIsDialogOpen(false);
      setEnhancingImages([]);
    }
  }, [isProcessing]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && isProcessing) {
        return;
      }
      setIsDialogOpen(open);
      if (!open) {
        setEnhancingImages([]);
      }
    },
    [isProcessing],
  );

  if (images.length === 0) {
    return null;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="gradient"
          size="sm"
          className={cn("flex items-center gap-2", className)}
          data-testid="enhance-all-button"
        >
          <Sparkles className="h-4 w-4" />
          Enhance All
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Enhance Album: {albumName}
          </DialogTitle>
          <DialogDescription>
            Batch enhance all images in this album that haven&apos;t been enhanced yet at the
            selected tier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Enhanced counts summary */}
          <div
            className="rounded-md bg-muted p-3 space-y-2"
            data-testid="enhancement-summary"
          >
            <p className="text-sm font-medium">Already enhanced:</p>
            <div className="flex flex-wrap gap-2">
              {TIER_ORDER.map((tier) => (
                <Badge
                  key={tier}
                  variant={enhancedCounts[tier] > 0 ? "default" : "outline"}
                  className="text-xs"
                  data-testid={`enhanced-count-${tier}`}
                >
                  {TIER_INFO[tier].label}: {enhancedCounts[tier]}/{images.length}
                </Badge>
              ))}
            </div>
          </div>

          {/* Balance display */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium">Your Balance</span>
            </div>
            {isLoadingBalance
              ? (
                <Loader2
                  className="h-4 w-4 animate-spin"
                  data-testid="balance-loader"
                />
              )
              : (
                <span className="text-lg font-bold" data-testid="user-balance">
                  {userBalance ?? 0} tokens
                </span>
              )}
          </div>

          {/* Tier selection */}
          {enhancingImages.length === 0 && (
            <div className="space-y-2">
              <Label>Enhancement Tier</Label>
              <RadioGroup
                value={selectedTier}
                onValueChange={(value) => setSelectedTier(value as EnhancementTier)}
                disabled={isProcessing}
                data-testid="tier-selection"
              >
                {TIER_ORDER.map((tier) => {
                  const info = TIER_INFO[tier];
                  const alreadyEnhanced = enhancedCounts[tier];
                  const remaining = images.length - alreadyEnhanced;

                  return (
                    <div key={tier} className="flex items-center space-x-2">
                      <RadioGroupItem value={tier} id={`album-batch-${tier}`} />
                      <Label
                        htmlFor={`album-batch-${tier}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{info.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {info.description}
                            </p>
                            {alreadyEnhanced > 0 && (
                              <p className="text-xs text-green-600">
                                {alreadyEnhanced} already enhanced, {remaining} remaining
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {info.cost} tokens
                            </p>
                            <p className="text-xs text-muted-foreground">
                              per image
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          {/* Cost summary */}
          {enhancingImages.length === 0 && imagesToEnhance > 0 && (
            <div
              className="p-3 bg-muted rounded-lg space-y-2"
              data-testid="cost-summary"
            >
              <div className="flex justify-between text-sm">
                <span>Images to enhance:</span>
                <span className="font-medium">{imagesToEnhance}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cost per image:</span>
                <span className="font-medium">{tierCost} tokens</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span>Total cost:</span>
                <span data-testid="total-cost">{totalCost} tokens</span>
              </div>
              {!hasEnoughTokens && userBalance !== null && (
                <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <p
                    className="text-sm text-destructive"
                    data-testid="insufficient-balance-warning"
                  >
                    Insufficient tokens. You need {totalCost} but only have {userBalance}.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* All images already enhanced at selected tier */}
          {enhancingImages.length === 0 && imagesToEnhance === 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p
                  className="text-sm text-green-700 dark:text-green-400"
                  data-testid="all-enhanced-message"
                >
                  All images in this album are already enhanced at {TIER_INFO[selectedTier].label}!
                </p>
              </div>
            </div>
          )}

          {/* Enhancement progress */}
          {enhancingImages.length > 0 && (
            <div className="space-y-3" data-testid="enhancement-progress">
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <Badge variant="secondary">
                  {enhancingImages.length} images
                </Badge>
                {pendingCount > 0 && <Badge variant="outline">{pendingCount} pending</Badge>}
                {enhancingCount > 0 && <Badge variant="default">{enhancingCount} enhancing</Badge>}
                {completedCount > 0 && (
                  <Badge variant="default" className="bg-green-500">
                    {completedCount} completed
                  </Badge>
                )}
                {errorCount > 0 && <Badge variant="destructive">{errorCount} failed</Badge>}
              </div>

              {isProcessing && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Overall Progress</span>
                    <span data-testid="progress-percent">
                      {progressPercent}%
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
              )}

              {/* Status icons */}
              <div className="flex items-center gap-4 justify-center py-4">
                {isProcessing
                  ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Enhancing images...
                      </p>
                    </div>
                  )
                  : completedCount === enhancingImages.length
                  ? (
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <p className="text-sm text-green-600">
                        All enhancements complete!
                      </p>
                    </div>
                  )
                  : errorCount > 0
                  ? (
                    <div className="flex flex-col items-center gap-2">
                      <XCircle className="h-8 w-8 text-destructive" />
                      <p className="text-sm text-destructive">
                        Some enhancements failed
                      </p>
                    </div>
                  )
                  : null}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {enhancingImages.length === 0
            ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleDialogClose}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={startBatchEnhancement}
                  disabled={isProcessing ||
                    imagesToEnhance === 0 ||
                    !hasEnoughTokens ||
                    isLoadingBalance}
                  data-testid="confirm-enhance-button"
                >
                  {isProcessing
                    ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    )
                    : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Enhance {imagesToEnhance} Image
                        {imagesToEnhance !== 1 ? "s" : ""} ({totalCost} tokens)
                      </>
                    )}
                </Button>
              </>
            )
            : (
              <Button
                onClick={handleDialogClose}
                disabled={isProcessing}
                data-testid="done-button"
              >
                {isProcessing ? "Processing..." : "Done"}
              </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
