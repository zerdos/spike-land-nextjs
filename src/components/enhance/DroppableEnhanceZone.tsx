"use client";

import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";
import { useCallback, useState } from "react";

/** Data returned when an image file is dropped */
export interface BlendImageData {
  /** Base64-encoded image data */
  base64: string;
  /** MIME type of the image */
  mimeType: string;
  /** Original filename */
  fileName: string;
}

interface DroppableEnhanceZoneProps {
  /** Callback when an image file is dropped onto the zone */
  onImageDrop: (imageData: BlendImageData) => void;
  /** Whether the drop zone is disabled */
  disabled?: boolean;
  /** Child content to render inside the drop zone */
  children: React.ReactNode;
}

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * A drop zone component that wraps content and accepts image file drops.
 * Used on the enhancement page to enable drag-and-drop image blending.
 * The dropped image is converted to base64 and passed to the callback.
 */
export function DroppableEnhanceZone({
  onImageDrop,
  disabled = false,
  children,
}: DroppableEnhanceZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (disabled || isProcessing) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!isDragOver) setIsDragOver(true);
    },
    [disabled, isProcessing, isDragOver],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (disabled || isProcessing) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
    },
    [disabled, isProcessing],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const relatedTarget = e.relatedTarget as Node | null;
      const currentTarget = e.currentTarget as Node;
      // Only set isDragOver to false if we're leaving the entire container
      if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
        setIsDragOver(false);
      }
    },
    [],
  );

  const processFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        alert(
          "Please drop an image file (JPEG, PNG, WebP, or GIF)",
        );
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        alert("Image file is too large. Maximum size is 20MB.");
        return;
      }

      setIsProcessing(true);

      try {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix to get just the base64 data
            const base64Data = result.split(",")[1];
            if (base64Data) {
              resolve(base64Data);
            } else {
              reject(new Error("Failed to read file"));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        onImageDrop({
          base64,
          mimeType: file.type,
          fileName: file.name,
        });
      } catch (error) {
        console.error("Failed to process dropped image:", error);
        alert("Failed to process the image. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [onImageDrop],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled || isProcessing || !e.dataTransfer) return;

      // Check for dropped files
      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((file) => ACCEPTED_IMAGE_TYPES.includes(file.type));

      if (imageFile) {
        await processFile(imageFile);
      }
    },
    [disabled, isProcessing, processFile],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative transition-all duration-200",
        isDragOver && !disabled &&
          "ring-2 ring-primary ring-offset-2 rounded-lg",
      )}
    >
      {children}

      {/* Drop overlay */}
      {isDragOver && !disabled && (
        <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center rounded-lg z-50 pointer-events-none">
          <div className="bg-background/95 rounded-xl p-6 text-center shadow-lg border">
            <Layers className="h-12 w-12 mx-auto mb-3 text-primary" />
            <p className="text-lg font-semibold">Drop to Blend Images</p>
            <p className="text-sm text-muted-foreground">
              Release to mix this photo with the current image
            </p>
          </div>
        </div>
      )}

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-50 pointer-events-none">
          <div className="bg-background/95 rounded-xl p-6 text-center shadow-lg border">
            <div className="h-12 w-12 mx-auto mb-3 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-lg font-semibold">Processing Image...</p>
          </div>
        </div>
      )}
    </div>
  );
}
