"use client";

import { PurchaseModal } from "@/components/tokens";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { EnhancementTier, JobStatus, TIER_INFO } from "@/types/enhancement";
import type { EnhancedImage, ImageEnhancementJob } from "@prisma/client";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Coins,
  Download,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useMemo } from "react";

interface EnhancementSidebarProps {
  image: EnhancedImage & {
    enhancementJobs: (ImageEnhancementJob & {
      sourceImage?: { name: string; } | null;
    })[];
  };
  selectedVersionId: string | null;
  onSelectVersion: (id: string | null) => void;
  onEnhance: (tier: EnhancementTier) => Promise<void>;
  isProcessing: boolean;
  balance: number;
  onBalanceRefresh: () => void;
}

export function EnhancementSidebar({
  image,
  selectedVersionId,
  onSelectVersion,
  onEnhance,
  isProcessing,
  balance,
  onBalanceRefresh,
}: EnhancementSidebarProps) {
  // --- 1. PREPARE DATA ---

  // Identify completed/processing jobs
  const jobsByTier = useMemo(() => {
    const map = new Map<EnhancementTier, ImageEnhancementJob>();
    image.enhancementJobs.forEach((job) => {
      if (
        (job.tier === "TIER_1K" || job.tier === "TIER_2K" ||
          job.tier === "TIER_4K")
      ) {
        // If we have multiple jobs for a tier (e.g. one failed, one success), pick the "best" one
        // Priority: COMPLETED > PROCESSING > FAILED
        const existing = map.get(job.tier as EnhancementTier);
        if (!existing) {
          map.set(job.tier as EnhancementTier, job);
        } else {
          const statusPriority = {
            COMPLETED: 3,
            PROCESSING: 2,
            PENDING: 2,
            FAILED: 1,
            CANCELLED: 0,
          };
          const existingP = statusPriority[existing.status as JobStatus["status"]] || 0;
          const newP = statusPriority[job.status as JobStatus["status"]] || 0;
          if (newP > existingP) {
            map.set(job.tier as EnhancementTier, job);
          }
        }
      }
    });
    return map;
  }, [image.enhancementJobs]);

  const allTiers: EnhancementTier[] = ["TIER_1K", "TIER_2K", "TIER_4K"];

  // Selected Version Details
  const isOriginalSelected = selectedVersionId === null;

  // Helpers for display
  const getJobStatusDisplay = (job?: ImageEnhancementJob) => {
    if (!job) return null;
    if (job.status === "PROCESSING" || job.status === "PENDING") {
      return (
        <div className="flex items-center gap-2 text-xs text-blue-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Processing...</span>
          <Progress value={job.currentStage ? 45 : 10} className="w-16 h-1.5" />
        </div>
      );
    }
    if (job.status === "COMPLETED") {
      const sizeMB = job.enhancedSizeBytes
        ? (job.enhancedSizeBytes / (1024 * 1024)).toFixed(1) + " MB"
        : "";
      return (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          <span>Ready</span>
          {sizeMB && <span className="text-muted-foreground">• {sizeMB}</span>}
        </div>
      );
    }
    if (job.status === "FAILED") {
      return (
        <span className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Failed
        </span>
      );
    }
    return null;
  };

  // --- 2. ACTIONS ---

  const handleDownload = async (
    e: React.MouseEvent,
    url: string,
    filename: string,
  ) => {
    e.stopPropagation(); // Prevent row selection
    e.preventDefault();

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.target = "_blank";
      link.click();
    }
  };

  // --- RENDER ---

  return (
    <Card className="h-full border-l-0 rounded-l-none rounded-r-lg shadow-none bg-background/50 backdrop-blur-sm">
      <CardContent className="p-6 space-y-8">
        {/* HEADER: Balance */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            <span className="font-medium text-sm text-muted-foreground">
              Your Balance
            </span>
          </div>
          <span className="text-xl font-bold">{balance}</span>
        </div>

        {/* SECTION A: VIEW & DOWNLOAD VERSIONS */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            View & Download Versions
          </h3>

          <div className="space-y-2">
            {/* 1. Original Image Item */}
            <div
              onClick={() => onSelectVersion(null)}
              className={cn(
                "group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                isOriginalSelected
                  ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(0,0,0,0.1)]"
                  : "bg-card border-border hover:border-primary/50",
              )}
            >
              <div className="flex items-center gap-3">
                {isOriginalSelected
                  ? (
                    <div className="h-4 w-4 rounded-full border-[4px] border-primary bg-background ring-2 ring-primary/20" />
                  )
                  : (
                    <Circle className="h-4 w-4 text-muted-foreground group-hover:text-primary/70 transition-colors" />
                  )}
                <div>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isOriginalSelected
                        ? "text-primary"
                        : "text-foreground",
                    )}
                  >
                    Original Image
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {image.originalWidth} x {image.originalHeight}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={(e) =>
                  handleDownload(
                    e,
                    image.originalUrl,
                    `${image.name}-original.jpg`,
                  )}
                title="Download Original"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>

            {/* 2. Enhanced Versions Items */}
            {allTiers.map((tier) => {
              const job = jobsByTier.get(tier);
              const info = TIER_INFO[tier];

              // Skip if not started yet
              if (!job) return null;

              const isSelected = selectedVersionId === job.id;
              const isProcessingJob = job.status === "PROCESSING" ||
                job.status === "PENDING";
              const isFailed = job.status === "FAILED";
              const isCompleted = job.status === "COMPLETED";

              return (
                <div
                  key={tier}
                  onClick={() => !isProcessingJob && !isFailed && onSelectVersion(job.id)}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-lg border transition-all",
                    isSelected
                      ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(0,0,0,0.1)]"
                      : "bg-card border-border",
                    !isProcessingJob && !isFailed && !isSelected &&
                      "hover:border-primary/50 cursor-pointer",
                    (isProcessingJob || isFailed) && "opacity-80 cursor-default",
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isSelected
                      ? (
                        <div className="h-4 w-4 rounded-full border-[4px] border-primary bg-background ring-2 ring-primary/20" />
                      )
                      : (
                        <Circle
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-colors",
                            !isProcessingJob && !isFailed &&
                              "group-hover:text-primary/70",
                          )}
                        />
                      )}
                    <div>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          isSelected ? "text-primary" : "text-foreground",
                        )}
                      >
                        {info.name} Enhancement
                      </p>
                      {/* Status Line */}
                      <div className="mt-1">
                        {getJobStatusDisplay(job)}
                      </div>
                    </div>
                  </div>

                  {/* Download Button for Enhancement */}
                  {isCompleted && job.enhancedUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={(e) =>
                        handleDownload(
                          e,
                          job.enhancedUrl!,
                          `${image.name}-${info.name}.jpg`,
                        )}
                      title={`Download ${info.name} Version`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* SECTION C: CREATE NEW ENHANCEMENT */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Create New Enhancement
          </h3>

          <div className="space-y-3">
            {allTiers.map((tier) => {
              // Skip if already exists (success or processing)
              // If failed, we might want to allow retry, but let's stick to "if not exists or failed" logic?
              // The logic above used "jobsByTier" which prioritized success/processing.
              // So if we have a job in jobsByTier that is NOT failed, we hide it.
              // IF it is failed, we might show it again to retry?
              // For simplicity: if it's in the list above as Ready or Processing, hide here.
              const existingJob = jobsByTier.get(tier);
              const isDoneOrActive = existingJob &&
                existingJob.status !== "FAILED" &&
                existingJob.status !== "CANCELLED";

              if (isDoneOrActive) return null;

              const info = TIER_INFO[tier];
              const cost = info.cost;
              const canAfford = balance >= cost;

              return (
                <div
                  key={tier}
                  className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {info.name} Tier
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {info.description}
                      </p>
                    </div>
                    <div className="px-2 py-1 rounded bg-background/50 border border-white/10 text-xs font-medium">
                      {cost} Tokens
                    </div>
                  </div>

                  {canAfford
                    ? (
                      <Button
                        onClick={() => onEnhance(tier)}
                        disabled={isProcessing}
                        className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                        variant="secondary"
                      >
                        <Sparkles className="mr-2 h-3 w-3" />
                        Start {info.name} Enhancement
                      </Button>
                    )
                    : (
                      <div className="space-y-2">
                        <Button
                          disabled
                          className="w-full opacity-50"
                          variant="secondary"
                        >
                          Insufficient Tokens
                        </Button>
                        <PurchaseModal
                          trigger={
                            <span className="text-xs text-primary underline cursor-pointer block text-center">
                              Get more tokens
                            </span>
                          }
                          onPurchaseComplete={onBalanceRefresh}
                        />
                      </div>
                    )}
                </div>
              );
            })}

            {/* If all tiers are done, show a message */}
            {Array.from(jobsByTier.values()).filter((j) => j.status === "COMPLETED").length ===
                allTiers.length && (
              <div className="text-center p-4 text-muted-foreground text-sm italic">
                All enhancement tiers completed!
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
