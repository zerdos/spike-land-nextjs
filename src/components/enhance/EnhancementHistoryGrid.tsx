"use client";

import { PipelineStageLabel } from "@/components/enhance/PipelineProgress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/utils";
import type { EnhancementTier, JobStatus, PipelineStage } from "@prisma/client";
import { Loader2, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

async function logBrokenImage(versionId: string, tier: string, url: string) {
  try {
    await fetch("/api/logs/image-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "ENHANCED_IMAGE_LOAD_ERROR",
        versionId,
        tier,
        url,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.error("[Image Error Logging Failed]", e);
  }
}

export interface EnhancementVersion {
  id: string;
  tier: EnhancementTier;
  enhancedUrl: string;
  width: number;
  height: number;
  createdAt: Date;
  status: JobStatus;
  currentStage?: PipelineStage | null;
  sizeBytes?: number | null;
}

interface EnhancementHistoryGridProps {
  versions: EnhancementVersion[];
  selectedVersionId?: string;
  onVersionSelect: (versionId: string) => void;
  onJobDelete: (jobId: string) => Promise<void>;
  onJobCancel?: (jobId: string) => Promise<void>;
}

const tierLabels: Record<EnhancementTier, string> = {
  TIER_1K: "1K",
  TIER_2K: "2K",
  TIER_4K: "4K",
};

const tierStyles: Record<EnhancementTier, string> = {
  TIER_1K: "bg-green-500/20 text-green-400 border-green-500/30",
  TIER_2K: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  TIER_4K: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export function EnhancementHistoryGrid({
  versions,
  selectedVersionId,
  onVersionSelect,
  onJobDelete,
  onJobCancel,
}: EnhancementHistoryGridProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);

  const handleImageError = (version: EnhancementVersion) => {
    console.error(
      `[Enhanced Image Load Error] Version: ${version.id}, Tier: ${version.tier}, URL: ${version.enhancedUrl}`,
    );
    setFailedImages((prev) => new Set(prev).add(version.id));
    logBrokenImage(version.id, version.tier, version.enhancedUrl);
  };

  const handleCancel = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onJobCancel) return;

    setProcessingJobId(jobId);
    try {
      await onJobCancel(jobId);
    } catch (error) {
      console.error("Failed to cancel job:", error);
      alert(error instanceof Error ? error.message : "Failed to cancel job");
    } finally {
      setProcessingJobId(null);
    }
  };

  const handleDelete = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    setProcessingJobId(jobId);
    try {
      await onJobDelete(jobId);
    } catch (error) {
      console.error("Failed to delete job:", error);
      alert(error instanceof Error ? error.message : "Failed to delete job");
    } finally {
      setProcessingJobId(null);
    }
  };

  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No enhancement versions yet. Create your first enhancement above.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {versions.map((version) => {
        const isSelected = selectedVersionId === version.id;
        const isProcessing = version.status === "PROCESSING" ||
          version.status === "PENDING";
        const isCompleted = version.status === "COMPLETED";
        const isFailed = version.status === "FAILED";
        const isCancelled = version.status === "CANCELLED";
        const isDeletable = isCompleted || isFailed || isCancelled ||
          version.status === "REFUNDED";

        return (
          <div
            key={version.id}
            className={`relative rounded-lg overflow-hidden border bg-card cursor-pointer transition-all hover:shadow-lg ${
              isSelected ? "ring-2 ring-primary" : "border-white/10"
            }`}
            onClick={() => onVersionSelect(version.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onVersionSelect(version.id);
              }
            }}
            aria-label={`Select ${tierLabels[version.tier]} version`}
            aria-pressed={isSelected}
          >
            {/* Thumbnail */}
            <div className="relative aspect-square bg-muted">
              {isCompleted && !failedImages.has(version.id) && (
                <Image
                  src={version.enhancedUrl}
                  alt={`Enhanced version ${tierLabels[version.tier]}`}
                  fill
                  className="object-cover"
                  onError={() => handleImageError(version)}
                />
              )}

              {isCompleted && failedImages.has(version.id) && (
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                  <p className="text-xs text-destructive text-center px-2">
                    Image failed to load
                  </p>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1 text-primary" />
                    {version.status === "PENDING"
                      ? <p className="text-xs text-muted-foreground">Queued</p>
                      : version.currentStage
                      ? (
                        <PipelineStageLabel
                          currentStage={version.currentStage}
                        />
                      )
                      : (
                        <p className="text-xs text-muted-foreground">
                          Processing
                        </p>
                      )}
                  </div>
                </div>
              )}

              {isFailed && (
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                  <p className="text-xs text-destructive">Failed</p>
                </div>
              )}

              {isCancelled && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <p className="text-xs text-muted-foreground">Cancelled</p>
                </div>
              )}

              {/* Tier Badge */}
              <Badge
                variant="outline"
                className={`absolute top-2 left-2 text-xs font-semibold ${
                  tierStyles[version.tier]
                }`}
              >
                {tierLabels[version.tier]}
              </Badge>

              {/* Delete/Cancel Button */}
              {isDeletable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 bg-black/50 hover:bg-black/70"
                  onClick={(e) => handleDelete(version.id, e)}
                  disabled={processingJobId === version.id}
                  aria-label={`Delete ${tierLabels[version.tier]} version`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}

              {isProcessing && onJobCancel && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 bg-black/50 hover:bg-black/70"
                  onClick={(e) => handleCancel(version.id, e)}
                  disabled={processingJobId === version.id}
                  aria-label={`Cancel ${tierLabels[version.tier]} job`}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Info */}
            <div className="p-2 space-y-0.5">
              {/* Dimensions */}
              <p className="text-xs text-muted-foreground">
                {version.width > 0 && version.height > 0
                  ? `${version.width} x ${version.height}`
                  : "—"}
              </p>

              {/* File Size */}
              <p className="text-xs text-muted-foreground">
                {version.sizeBytes ? formatFileSize(version.sizeBytes) : "—"}
              </p>

              {/* Date */}
              <p className="text-xs text-muted-foreground">
                {new Date(version.createdAt).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
