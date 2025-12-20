"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReferenceImage } from "@/lib/ai/pipeline-types";
import { processImageForUpload } from "@/lib/images/browser-image-processor";
import { AlertCircle, Image as ImageIcon, Loader2, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";

const MAX_REFERENCE_IMAGES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface PendingUpload {
  file: File;
  preview: string;
  description: string;
  uploading: boolean;
  error?: string;
}

interface ReferenceImageUploadProps {
  pipelineId: string;
  referenceImages: ReferenceImage[];
  onImagesChange: (images: ReferenceImage[]) => void;
  disabled?: boolean;
}

/**
 * Component for uploading and managing reference images for pipelines
 *
 * @example
 * ```tsx
 * <ReferenceImageUpload
 *   pipelineId="pipeline-123"
 *   referenceImages={promptConfig.referenceImages || []}
 *   onImagesChange={(images) => setPromptConfig({ ...promptConfig, referenceImages: images })}
 * />
 * ```
 */
export function ReferenceImageUpload({
  pipelineId,
  referenceImages,
  onImagesChange,
  disabled = false,
}: ReferenceImageUploadProps) {
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingKeys, setDeletingKeys] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalImages = referenceImages.length + pendingUploads.length;
  const canAddMore = totalImages < MAX_REFERENCE_IMAGES;

  const validateFile = (file: File): { valid: boolean; error?: string; } => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: "Invalid file type. Only JPEG, PNG, and WebP allowed.",
      };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: "File too large. Maximum size is 5MB." };
    }
    return { valid: true };
  };

  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const availableSlots = MAX_REFERENCE_IMAGES - totalImages;

      if (fileArray.length > availableSlots) {
        alert(
          `You can only add ${availableSlots} more reference image${
            availableSlots !== 1 ? "s" : ""
          }`,
        );
        return;
      }

      for (const file of fileArray) {
        const validation = validateFile(file);
        if (!validation.valid) {
          alert(validation.error);
          continue;
        }

        const preview = await createPreview(file);
        setPendingUploads((prev) => [
          ...prev,
          { file, preview, description: "", uploading: false },
        ]);
      }
    },
    [totalImages],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (!canAddMore || disabled) return;

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        handleFiles(droppedFiles);
      }
    },
    [canAddMore, disabled, handleFiles],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
      // Reset input value so same file can be selected again
      e.target.value = "";
    },
    [handleFiles],
  );

  const updatePendingDescription = useCallback(
    (index: number, description: string) => {
      setPendingUploads((prev) => prev.map((p, i) => (i === index ? { ...p, description } : p)));
    },
    [],
  );

  const removePending = useCallback((index: number) => {
    setPendingUploads((prev) => {
      const newPending = [...prev];
      // Revoke object URL to free memory
      const item = newPending[index];
      if (item) {
        URL.revokeObjectURL(item.preview);
      }
      newPending.splice(index, 1);
      return newPending;
    });
  }, []);

  const uploadPending = useCallback(
    async (index: number) => {
      const pending = pendingUploads[index];
      if (!pending || pending.uploading) return;

      setPendingUploads((prev) =>
        prev.map((
          p,
          i,
        ) => (i === index ? { ...p, uploading: true, error: undefined } : p))
      );

      try {
        // Process image: resize to 1024px, crop to aspect ratio, convert to WebP
        const processed = await processImageForUpload(pending.file);

        // Create a new File from the processed blob
        const extension = processed.mimeType === "image/webp" ? ".webp" : ".jpg";
        const baseName = pending.file.name.replace(/\.[^/.]+$/, "");
        const processedFile = new File(
          [processed.blob],
          `${baseName}${extension}`,
          { type: processed.mimeType },
        );

        const formData = new FormData();
        formData.append("file", processedFile);
        formData.append("pipelineId", pipelineId);
        if (pending.description) {
          formData.append("description", pending.description);
        }

        const response = await fetch("/api/pipelines/reference-images", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Upload failed");
        }

        // Add to reference images and remove from pending
        onImagesChange([...referenceImages, data.referenceImage]);
        setPendingUploads((prev) => prev.filter((_, i) => i !== index));
      } catch (error) {
        setPendingUploads((prev) =>
          prev.map((p, i) =>
            i === index
              ? {
                ...p,
                uploading: false,
                error: error instanceof Error ? error.message : "Upload failed",
              }
              : p
          )
        );
      }
    },
    [pendingUploads, pipelineId, referenceImages, onImagesChange],
  );

  const deleteReferenceImage = useCallback(
    async (r2Key: string) => {
      setDeletingKeys((prev) => new Set(prev).add(r2Key));

      try {
        const response = await fetch("/api/pipelines/reference-images", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pipelineId, r2Key }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Delete failed");
        }

        // Remove from reference images
        onImagesChange(referenceImages.filter((img) => img.r2Key !== r2Key));
      } catch (error) {
        alert(
          error instanceof Error ? error.message : "Failed to delete image",
        );
      } finally {
        setDeletingKeys((prev) => {
          const newSet = new Set(prev);
          newSet.delete(r2Key);
          return newSet;
        });
      }
    },
    [pipelineId, referenceImages, onImagesChange],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Reference Images (Style Guidance)</Label>
        <span className="text-xs text-muted-foreground">
          {totalImages}/{MAX_REFERENCE_IMAGES}
        </span>
      </div>

      {/* Existing Reference Images */}
      {referenceImages.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {referenceImages.map((img) => (
            <div key={img.r2Key} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted border">
                <Image
                  src={img.url}
                  alt={img.description || "Reference image"}
                  width={200}
                  height={200}
                  className="w-full h-full object-cover"
                />
              </div>
              {img.description && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {img.description}
                </p>
              )}
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteReferenceImage(img.r2Key)}
                disabled={disabled || deletingKeys.has(img.r2Key)}
              >
                {deletingKeys.has(img.r2Key)
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Trash2 className="h-3 w-3" />}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Pending Uploads */}
      {pendingUploads.length > 0 && (
        <div className="space-y-3">
          {pendingUploads.map((pending, index) => (
            <div
              key={index}
              className="flex gap-3 p-3 bg-muted/50 rounded-lg border"
            >
              <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic preview */}
                <img
                  src={pending.preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <Input
                  placeholder="Description (optional)"
                  value={pending.description}
                  onChange={(e) => updatePendingDescription(index, e.target.value)}
                  disabled={pending.uploading || disabled}
                  className="h-8 text-sm"
                />
                {pending.error && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {pending.error}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => uploadPending(index)}
                    disabled={pending.uploading || disabled}
                  >
                    {pending.uploading
                      ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Uploading...
                        </>
                      )
                      : (
                        <>
                          <Upload className="mr-1 h-3 w-3" />
                          Upload
                        </>
                      )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removePending(index)}
                    disabled={pending.uploading || disabled}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      {canAddMore && (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
            ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {isDragging ? "Drop image here" : "Add reference image"}
              </p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP up to 5MB
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled || !canAddMore}
          />
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-muted-foreground">
        Reference images guide the AI to match a specific style or quality. Upload up to 3 images.
      </p>
    </div>
  );
}
