"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Camera, FolderOpen, Plus, Upload, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";

/** Image selected from gallery (stored image) */
export interface GalleryImage {
  type: "gallery";
  id: string;
  url: string;
  name: string;
  width: number;
  height: number;
}

/** Image uploaded from device (file) */
export interface UploadedImage {
  type: "upload";
  id: string; // Generated unique ID
  url: string; // Object URL for preview
  name: string;
  width: number;
  height: number;
  base64: string;
  mimeType: string;
}

export type SelectedImage = GalleryImage | UploadedImage;

interface ImageSlotProps {
  label: string;
  image: SelectedImage | null;
  onImageSelect: (image: SelectedImage) => void;
  onImageClear: () => void;
  onOpenGallery: () => void;
  disabled?: boolean;
}

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function ImageSlot({
  label,
  image,
  onImageSelect,
  onImageClear,
  onOpenGallery,
  disabled = false,
}: ImageSlotProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        alert("Please use an image file (JPEG, PNG, WebP, or GIF)");
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        alert("Image file is too large. Maximum size is 20MB.");
        return;
      }

      setIsProcessing(true);

      try {
        // Read file as base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
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

        // Get image dimensions
        const dimensions = await new Promise<{ width: number; height: number; }>(
          (resolve, reject) => {
            const img = new window.Image();
            img.onload = () => {
              resolve({ width: img.naturalWidth, height: img.naturalHeight });
              URL.revokeObjectURL(img.src);
            };
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = URL.createObjectURL(file);
          },
        );

        // Create object URL for preview
        const previewUrl = URL.createObjectURL(file);

        const uploadedImage: UploadedImage = {
          type: "upload",
          id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          url: previewUrl,
          name: file.name,
          width: dimensions.width,
          height: dimensions.height,
          base64,
          mimeType: file.type,
        };

        onImageSelect(uploadedImage);
      } catch (error) {
        console.error("Failed to process image:", error);
        alert("Failed to process the image. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [onImageSelect],
  );

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
      if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
        setIsDragOver(false);
      }
    },
    [],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled || isProcessing || !e.dataTransfer) return;

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((file) => ACCEPTED_IMAGE_TYPES.includes(file.type));

      if (imageFile) {
        await processFile(imageFile);
      } else {
        alert("Please drop an image file (JPEG, PNG, WebP, or GIF)");
      }
    },
    [disabled, isProcessing, processFile],
  );

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await processFile(file);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [processFile],
  );

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // Revoke object URL if it was an upload
      if (image?.type === "upload") {
        URL.revokeObjectURL(image.url);
      }
      onImageClear();
    },
    [image, onImageClear],
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        onChange={handleFileInputChange}
        className="hidden"
        aria-label={`Upload ${label}`}
      />

      <Card
        variant={image ? "default" : "dashed"}
        className={cn(
          "relative overflow-hidden transition-all",
          "aspect-square",
          isDragOver && !disabled && "ring-2 ring-primary border-primary",
          disabled && "opacity-50 cursor-not-allowed",
          isProcessing && "pointer-events-none",
        )}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {image
          ? (
            <>
              <Image
                src={image.url}
                alt={image.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 300px"
                unoptimized={image.type === "upload"} // Don't optimize blob URLs
              />
              {/* Clear button */}
              <button
                type="button"
                onClick={handleClear}
                disabled={disabled}
                className={cn(
                  "absolute top-2 right-2 z-10",
                  "h-8 w-8 rounded-full",
                  "bg-black/60 hover:bg-black/80",
                  "flex items-center justify-center",
                  "text-white transition-colors",
                )}
                aria-label={`Clear ${label}`}
              >
                <X className="h-4 w-4" />
              </button>
              {/* Image info overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                <div className="flex items-center gap-1">
                  {image.type === "upload"
                    ? <Upload className="h-3 w-3 text-white/70" />
                    : <FolderOpen className="h-3 w-3 text-white/70" />}
                  <p className="text-xs text-white truncate">{image.name}</p>
                </div>
              </div>
            </>
          )
          : isProcessing
          ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Processing...</p>
            </div>
          )
          : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
              <div
                className={cn(
                  "h-12 w-12 rounded-full",
                  "bg-muted/50 flex items-center justify-center",
                  "transition-colors",
                  isDragOver && "bg-primary/20",
                )}
              >
                <Plus
                  className={cn(
                    "h-6 w-6 text-muted-foreground",
                    isDragOver && "text-primary",
                  )}
                />
              </div>

              {isDragOver ? <p className="text-sm text-primary font-medium">Drop image here</p> : (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    Drag & drop an image
                  </p>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={disabled}
                          className="text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Select
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center">
                        <DropdownMenuItem onClick={handleUploadClick}>
                          <Camera className="h-4 w-4 mr-2" />
                          Upload from device
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onOpenGallery}>
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Choose from gallery
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              )}
            </div>
          )}
      </Card>
    </div>
  );
}
