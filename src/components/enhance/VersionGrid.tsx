"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatFileSize } from "@/lib/utils";
import type { EnhancementTier, JobStatus } from "@prisma/client";
import { HardDrive, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { BulkDeleteDialog } from "./BulkDeleteDialog";
import { ExportButton } from "./ExportButton";

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
  sizeBytes?: number | null;
}

interface VersionGridProps {
  versions: EnhancementVersion[];
  onVersionSelect?: (versionId: string) => void;
  selectedVersionId?: string;
  onJobCancel?: (jobId: string) => Promise<void>;
  onJobDelete?: (jobId: string) => Promise<void>;
  onBulkDelete?: (jobIds: string[]) => Promise<void>;
  enableBulkSelect?: boolean;
}

const tierLabels: Record<EnhancementTier, string> = {
  TIER_1K: "1K",
  TIER_2K: "2K",
  TIER_4K: "4K",
};

export function VersionGrid({
  versions,
  onVersionSelect,
  selectedVersionId,
  onJobCancel,
  onJobDelete,
  onBulkDelete,
  enableBulkSelect = false,
}: VersionGridProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());

  const deletableVersions = versions.filter(
    (v) =>
      v.status === "COMPLETED" || v.status === "FAILED" || v.status === "CANCELLED" ||
      v.status === "REFUNDED",
  );

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

  const handleBulkDelete = async (versionIds: string[]) => {
    if (!onBulkDelete) return;
    await onBulkDelete(versionIds);
    setSelectedForDelete(new Set());
  };

  const toggleSelection = (versionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(versionId)) {
        next.delete(versionId);
      } else {
        next.add(versionId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedForDelete.size === deletableVersions.length) {
      setSelectedForDelete(new Set());
    } else {
      setSelectedForDelete(new Set(deletableVersions.map((v) => v.id)));
    }
  };

  const clearSelection = () => {
    setSelectedForDelete(new Set());
  };

  const totalStorageUsed = versions
    .filter((v) => v.status === "COMPLETED")
    .reduce((sum, v) => sum + (v.sizeBytes || 0), 0);

  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No enhancement versions yet. Create your first enhancement above.
      </div>
    );
  }

  const selectedVersionsData = deletableVersions
    .filter((v) => selectedForDelete.has(v.id))
    .map((v) => ({
      id: v.id,
      tier: tierLabels[v.tier],
      sizeBytes: v.sizeBytes,
    }));

  return (
    <div className="space-y-4">
      {/* Storage summary and bulk actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HardDrive className="h-4 w-4" />
          <span>Total storage: {formatFileSize(totalStorageUsed)}</span>
        </div>

        {enableBulkSelect && onBulkDelete && deletableVersions.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
            >
              {selectedForDelete.size === deletableVersions.length ? "Deselect All" : "Select All"}
            </Button>
            <BulkDeleteDialog
              selectedVersions={selectedVersionsData}
              onDelete={handleBulkDelete}
              onCancel={clearSelection}
              disabled={processingJobId !== null}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {versions.map((version) => {
          const isDeletable = version.status === "COMPLETED" ||
            version.status === "FAILED" ||
            version.status === "CANCELLED" ||
            version.status === "REFUNDED";

          return (
            <Card
              key={version.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedVersionId === version.id
                  ? "ring-2 ring-primary"
                  : ""
              } ${selectedForDelete.has(version.id) ? "ring-2 ring-destructive" : ""}`}
              onClick={() => onVersionSelect?.(version.id)}
            >
              <CardContent className="p-4">
                <div className="relative aspect-video mb-3 bg-muted rounded-md overflow-hidden">
                  {/* Bulk selection checkbox */}
                  {enableBulkSelect && isDeletable && onBulkDelete && (
                    <div
                      className="absolute top-2 left-2 z-10"
                      onClick={(e) => toggleSelection(version.id, e)}
                    >
                      <Checkbox
                        checked={selectedForDelete.has(version.id)}
                        className="bg-background"
                        aria-label={`Select ${tierLabels[version.tier]} version for deletion`}
                      />
                    </div>
                  )}

                  {version.status === "COMPLETED" && !failedImages.has(version.id) && (
                    <Image
                      src={version.enhancedUrl}
                      alt={`Enhanced version ${tierLabels[version.tier]}`}
                      fill
                      className="object-contain"
                      onError={() => handleImageError(version)}
                    />
                  )}
                  {version.status === "COMPLETED" && failedImages.has(version.id) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                      <p className="text-sm text-destructive text-center px-2">
                        Image failed to load
                      </p>
                    </div>
                  )}
                  {(version.status === "PROCESSING" || version.status === "PENDING") && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {version.status === "PENDING" ? "Queued..." : "Processing..."}
                        </p>
                      </div>
                    </div>
                  )}
                  {version.status === "FAILED" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                      <p className="text-sm text-destructive">Enhancement Failed</p>
                    </div>
                  )}
                  {version.status === "CANCELLED" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <p className="text-sm text-muted-foreground">Cancelled</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{tierLabels[version.tier]}</Badge>
                    {version.status === "CANCELLED" && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Cancelled
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {version.width > 0 && version.height > 0
                      ? `${version.width} x ${version.height}`
                      : ""}
                  </span>
                </div>

                {/* Size indicator */}
                {version.status === "COMPLETED" && version.sizeBytes && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <HardDrive className="h-3 w-3" />
                    <span>{formatFileSize(version.sizeBytes)}</span>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mb-3">
                  {new Date(version.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {version.status === "COMPLETED" && (
                    <>
                      <ExportButton
                        imageUrl={version.enhancedUrl}
                        fileName={`enhanced-${tierLabels[version.tier]}-${version.id}.jpg`}
                      />
                      {onJobDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(version.id, e)}
                          disabled={processingJobId === version.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}

                  {(version.status === "PENDING" || version.status === "PROCESSING") &&
                    onJobCancel && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => handleCancel(version.id, e)}
                      disabled={processingJobId === version.id}
                    >
                      <X className="mr-2 h-4 w-4" />
                      {processingJobId === version.id ? "Cancelling..." : "Cancel"}
                    </Button>
                  )}

                  {(version.status === "FAILED" ||
                    version.status === "CANCELLED" ||
                    version.status === "REFUNDED") &&
                    onJobDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={(e) => handleDelete(version.id, e)}
                      disabled={processingJobId === version.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {processingJobId === version.id ? "Deleting..." : "Delete"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
