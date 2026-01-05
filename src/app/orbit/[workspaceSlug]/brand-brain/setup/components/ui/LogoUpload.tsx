"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";

export interface LogoUploadProps {
  logoUrl: string | undefined;
  onUpload: (url: string, r2Key: string) => void;
  onRemove: () => void;
  workspaceId: string;
  disabled?: boolean;
  className?: string;
}

export function LogoUpload({
  logoUrl,
  onUpload,
  onRemove,
  workspaceId,
  disabled = false,
  className,
}: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setError(null);

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Please upload a JPEG, PNG, GIF, WebP, or SVG image.");
        return;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setError("File too large. Maximum size is 5MB.");
        return;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("workspaceId", workspaceId);
        formData.append("assetType", "logo");

        const response = await fetch("/api/brand-assets/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }

        const data = await response.json();
        onUpload(data.url, data.r2Key);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [workspaceId, onUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled || isUploading) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [disabled, isUploading, handleFileUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [handleFileUpload],
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Logo Preview */}
      {logoUrl && (
        <div className="relative inline-block">
          <div className="relative h-32 w-32 overflow-hidden rounded-lg border bg-muted">
            <Image
              src={logoUrl}
              alt="Brand logo"
              fill
              className="object-contain"
              unoptimized // For external URLs
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={onRemove}
            disabled={disabled}
            className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Upload Area */}
      {!logoUrl && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "relative flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            onChange={handleFileInput}
            disabled={disabled || isUploading}
            className="absolute inset-0 cursor-pointer opacity-0"
          />

          {isUploading
            ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            )
            : (
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-muted p-3">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Drop your logo here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG, GIF, WebP, or SVG (max 5MB)
                  </p>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Upload Button (alternative) */}
      {logoUrl && (
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              onChange={handleFileInput}
              disabled={disabled || isUploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isUploading}
              asChild
            >
              <span>
                {isUploading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Upload className="mr-2 h-4 w-4" />}
                Replace Logo
              </span>
            </Button>
          </label>
        </div>
      )}

      {/* Error Message */}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
