"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/utils";
import type { EnhancementTier, JobStatus } from "@prisma/client";
import { HardDrive, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export interface EnhancementVersion {
  id: string;
  tier: EnhancementTier;
  enhancedUrl: string;
  width: number;
  height: number;
  createdAt: Date;
  status: JobStatus;
  sizeBytes?: number | null;
}

interface EnhancementHistoryScrollProps {
  versions: EnhancementVersion[];
  onVersionSelect?: (versionId: string) => void;
  selectedVersionId?: string;
  onJobCancel?: (jobId: string) => Promise<void>;
  onJobDelete?: (jobId: string) => Promise<void>;
}

const tierLabels: Record<EnhancementTier, string> = {
  TIER_1K: "1K",
  TIER_2K: "2K",
  TIER_4K: "4K",
};

const tierColors: Record<EnhancementTier, string> = {
  TIER_1K: "bg-green-500/20 text-green-400 border-green-500/30",
  TIER_2K: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  TIER_4K: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export function EnhancementHistoryScroll({
  versions,
  onVersionSelect,
  selectedVersionId,
  onJobCancel,
  onJobDelete,
}: EnhancementHistoryScrollProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);

  const handleImageError = (versionId: string) => {
    setFailedImages((prev) => new Set(prev).add(versionId));
  };

  const handleCancel = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onJobCancel) return;

    if (
      !window.confirm(
        "Are you sure you want to cancel this job? Your tokens will be refunded.",
      )
    ) {
      return;
    }

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
    if (!onJobDelete) return;

    if (
      !window.confirm(
        "Are you sure you want to delete this job? This action cannot be undone.",
      )
    ) {
      return;
    }

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
      <div className="text-center py-4 text-muted-foreground text-sm">
        No enhancement versions yet. Create your first enhancement above.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        <div className="flex gap-4 min-w-max">
          {versions.map((version) => (
            <div
              key={version.id}
              className={`
                flex-shrink-0 w-[180px] rounded-lg overflow-hidden cursor-pointer
                transition-all duration-200 hover:scale-[1.02]
                bg-card border border-border
                ${selectedVersionId === version.id ? "ring-2 ring-cyan-500" : ""}
              `}
              onClick={() => onVersionSelect?.(version.id)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-muted">
                {version.status === "COMPLETED" && !failedImages.has(version.id) && (
                  <Image
                    src={version.enhancedUrl}
                    alt={`Enhanced version ${tierLabels[version.tier]}`}
                    fill
                    className="object-cover"
                    onError={() => handleImageError(version.id)}
                  />
                )}
                {version.status === "COMPLETED" && failedImages.has(version.id) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                    <p className="text-xs text-destructive">Failed to load</p>
                  </div>
                )}
                {(version.status === "PROCESSING" || version.status === "PENDING") && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500 mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">
                        {version.status === "PENDING" ? "Queued" : "Processing"}
                      </p>
                    </div>
                  </div>
                )}
                {version.status === "FAILED" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                    <p className="text-xs text-destructive">Failed</p>
                  </div>
                )}
              </div>

              {/* Info section */}
              <div className="p-3 space-y-2">
                {/* Tier badge and dimensions */}
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium ${tierColors[version.tier]}`}
                  >
                    {tierLabels[version.tier]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {version.width > 0 && version.height > 0
                      ? `${version.width} x ${version.height}`
                      : ""}
                  </span>
                </div>

                {/* File size */}
                {version.status === "COMPLETED" && version.sizeBytes && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <HardDrive className="h-3 w-3" />
                    <span>{formatFileSize(version.sizeBytes)}</span>
                  </div>
                )}

                {/* Date */}
                <p className="text-xs text-muted-foreground">
                  {new Date(version.createdAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

                {/* Action button */}
                <div className="pt-1">
                  {version.status === "COMPLETED" && onJobDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-full text-xs"
                      onClick={(e) => handleDelete(version.id, e)}
                      disabled={processingJobId === version.id}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {processingJobId === version.id ? "..." : "Delete"}
                    </Button>
                  )}

                  {(version.status === "PENDING" || version.status === "PROCESSING") &&
                    onJobCancel && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-full text-xs"
                      onClick={(e) => handleCancel(version.id, e)}
                      disabled={processingJobId === version.id}
                    >
                      <X className="h-3 w-3 mr-1" />
                      {processingJobId === version.id ? "..." : "Cancel"}
                    </Button>
                  )}

                  {version.status === "FAILED" && onJobDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-full text-xs text-destructive"
                      onClick={(e) => handleDelete(version.id, e)}
                      disabled={processingJobId === version.id}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {processingJobId === version.id ? "..." : "Remove"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
