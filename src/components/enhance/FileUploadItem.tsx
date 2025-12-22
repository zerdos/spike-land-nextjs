"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn, formatFileSize } from "@/lib/utils";
import { AlertCircle, CheckCircle, RefreshCw, Upload, X } from "lucide-react";

interface FileUploadItemProps {
  file: File;
  status: "pending" | "uploading" | "completed" | "failed" | "cancelled";
  progress: number;
  error?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
}

function truncateFilename(filename: string, maxLength: number = 30): string {
  if (filename.length <= maxLength) return filename;

  const extension = filename.includes(".") ? filename.split(".").pop() : "";
  const nameWithoutExt = extension
    ? filename.slice(0, filename.lastIndexOf("."))
    : filename;

  const availableLength = maxLength - (extension ? extension.length + 4 : 3);
  if (availableLength <= 0) return filename.slice(0, maxLength - 3) + "...";

  return `${nameWithoutExt.slice(0, availableLength)}...${extension ? `.${extension}` : ""}`;
}

export function FileUploadItem({
  file,
  status,
  progress,
  error,
  onCancel,
  onRetry,
  className,
}: FileUploadItemProps) {
  const renderStatusIndicator = () => {
    switch (status) {
      case "pending":
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Upload className="h-4 w-4" />
            <span className="text-sm">Pending</span>
          </div>
        );
      case "uploading":
        return (
          <div className="flex items-center gap-2 min-w-[120px]">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-sm text-muted-foreground w-10 text-right">
              {progress}%
            </span>
          </div>
        );
      case "completed":
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Completed</span>
          </div>
        );
      case "failed":
        return (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Failed</span>
          </div>
        );
      case "cancelled":
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="text-sm">Cancelled</span>
          </div>
        );
    }
  };

  const showCancelButton = status === "pending" || status === "uploading";
  const showRetryButton = status === "failed" && onRetry;

  return (
    <div
      className={cn(
        "flex flex-col gap-1 p-3 rounded-lg border bg-card",
        status === "failed" && "border-destructive/50 bg-destructive/5",
        status === "completed" && "border-green-500/50 bg-green-500/5",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span
            className={cn(
              "text-sm font-medium truncate",
              status === "pending" && "text-muted-foreground",
              status === "failed" && "text-destructive",
            )}
            title={file.name}
          >
            {truncateFilename(file.name)}
          </span>
          <span className="text-sm text-muted-foreground flex-shrink-0">
            {formatFileSize(file.size)}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {renderStatusIndicator()}

          {showRetryButton && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRetry}
              aria-label="Retry upload"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          {showCancelButton && onCancel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onCancel}
              aria-label="Cancel upload"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {status === "failed" && error && <p className="text-xs text-destructive pl-0">{error}</p>}
    </div>
  );
}
