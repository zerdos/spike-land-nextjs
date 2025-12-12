"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn, formatFileSize } from "@/lib/utils";
import { Check, Loader2, RefreshCw, Upload, X } from "lucide-react";

interface FileStatus {
  file: File;
  status: "pending" | "uploading" | "completed" | "failed" | "cancelled";
  progress: number;
  error?: string;
}

interface MultiUploadProgressProps {
  files: FileStatus[];
  onCancel?: () => void;
  onRetry?: (file: File) => void;
  className?: string;
}

/**
 * Truncate filename to specified length while preserving extension
 */
function truncateFilename(filename: string, maxLength: number = 25): string {
  if (filename.length <= maxLength) return filename;

  const extension = filename.includes(".") ? filename.split(".").pop() || "" : "";
  const name = filename.includes(".")
    ? filename.slice(0, filename.lastIndexOf("."))
    : filename;

  const availableLength = maxLength - extension.length - 4; // 4 for "..." and "."
  if (availableLength <= 0) return filename.slice(0, maxLength - 3) + "...";

  return `${name.slice(0, availableLength)}...${extension ? `.${extension}` : ""}`;
}

/**
 * Get status icon based on file upload status
 */
function StatusIcon({ status }: { status: FileStatus["status"]; }) {
  switch (status) {
    case "pending":
      return <Upload className="h-4 w-4 text-muted-foreground" aria-label="Pending" />;
    case "uploading":
      return <Loader2 className="h-4 w-4 text-primary animate-spin" aria-label="Uploading" />;
    case "completed":
      return <Check className="h-4 w-4 text-green-500" aria-label="Completed" />;
    case "failed":
      return <X className="h-4 w-4 text-destructive" aria-label="Failed" />;
    case "cancelled":
      return <X className="h-4 w-4 text-muted-foreground" aria-label="Cancelled" />;
    default:
      return null;
  }
}

export function MultiUploadProgress({
  files,
  onCancel,
  onRetry,
  className,
}: MultiUploadProgressProps) {
  // Calculate overall progress
  const totalProgress = files.length > 0
    ? files.reduce((acc, f) => acc + f.progress, 0) / files.length
    : 0;

  // Count files by status
  const completedCount = files.filter((f) => f.status === "completed").length;
  const failedCount = files.filter((f) => f.status === "failed").length;
  const uploadingCount = files.filter((f) => f.status === "uploading").length;
  const pendingCount = files.filter((f) => f.status === "pending").length;

  // Check if any upload is in progress
  const isUploading = uploadingCount > 0 || pendingCount > 0;

  if (files.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)} data-testid="multi-upload-progress">
      {/* Overall progress section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Upload Progress ({completedCount}/{files.length})
          </span>
          <span className="text-muted-foreground">
            {Math.round(totalProgress)}%
          </span>
        </div>
        <Progress value={totalProgress} className="h-2" aria-label="Overall upload progress" />

        {/* Status summary */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {pendingCount > 0 && <span data-testid="pending-count">{pendingCount} pending</span>}
          {uploadingCount > 0 && (
            <span className="text-primary" data-testid="uploading-count">
              {uploadingCount} uploading
            </span>
          )}
          {completedCount > 0 && (
            <span className="text-green-500" data-testid="completed-count">
              {completedCount} completed
            </span>
          )}
          {failedCount > 0 && (
            <span className="text-destructive" data-testid="failed-count">
              {failedCount} failed
            </span>
          )}
        </div>
      </div>

      {/* File list */}
      <div className="space-y-2 max-h-60 overflow-y-auto" role="list" aria-label="Upload file list">
        {files.map((fileStatus, index) => (
          <div
            key={`${fileStatus.file.name}-${index}`}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg border bg-card",
              fileStatus.status === "failed" && "border-destructive/50 bg-destructive/5",
              fileStatus.status === "completed" && "border-green-500/30 bg-green-500/5",
            )}
            role="listitem"
            data-testid={`file-item-${index}`}
          >
            {/* Status icon */}
            <div className="flex-shrink-0">
              <StatusIcon status={fileStatus.status} />
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-sm font-medium truncate"
                  title={fileStatus.file.name}
                  data-testid={`file-name-${index}`}
                >
                  {truncateFilename(fileStatus.file.name)}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatFileSize(fileStatus.file.size)}
                </span>
              </div>

              {/* Individual progress bar for uploading state */}
              {fileStatus.status === "uploading" && (
                <Progress
                  value={fileStatus.progress}
                  className="h-1"
                  aria-label={`Upload progress for ${fileStatus.file.name}`}
                />
              )}

              {/* Error message for failed state */}
              {fileStatus.status === "failed" && fileStatus.error && (
                <p className="text-xs text-destructive" data-testid={`file-error-${index}`}>
                  {fileStatus.error}
                </p>
              )}
            </div>

            {/* Retry button for failed uploads */}
            {fileStatus.status === "failed" && onRetry && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRetry(fileStatus.file)}
                className="flex-shrink-0 h-7 w-7 p-0"
                aria-label={`Retry upload for ${fileStatus.file.name}`}
                data-testid={`retry-button-${index}`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Cancel button */}
      {isUploading && onCancel && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="w-full"
          data-testid="cancel-button"
        >
          <X className="mr-2 h-4 w-4" />
          Cancel Upload
        </Button>
      )}
    </div>
  );
}
