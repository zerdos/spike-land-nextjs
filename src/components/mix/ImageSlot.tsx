"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";

export interface SelectedImage {
  id: string;
  url: string;
  name: string;
  width: number;
  height: number;
}

interface ImageSlotProps {
  label: string;
  image: SelectedImage | null;
  onImageSelect: (image: SelectedImage) => void;
  onImageClear: () => void;
  onOpenSelector: () => void;
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
  onImageClear,
  onOpenSelector,
  disabled = false,
}: ImageSlotProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!isDragOver) setIsDragOver(true);
    },
    [disabled, isDragOver],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
    },
    [disabled],
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

      if (disabled || !e.dataTransfer) return;

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((file) => ACCEPTED_IMAGE_TYPES.includes(file.type));

      if (!imageFile) {
        alert("Please drop an image file (JPEG, PNG, WebP, or GIF)");
        return;
      }

      if (imageFile.size > MAX_FILE_SIZE) {
        alert("Image file is too large. Maximum size is 20MB.");
        return;
      }

      // For file drops, we open the selector instead
      // The PhotoMix page will handle direct uploads differently
      onOpenSelector();
    },
    [disabled, onOpenSelector],
  );

  const handleClick = useCallback(() => {
    if (disabled) return;
    onOpenSelector();
  }, [disabled, onOpenSelector]);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onImageClear();
    },
    [onImageClear],
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <Card
        variant={image ? "default" : "dashed"}
        className={cn(
          "relative overflow-hidden cursor-pointer transition-all",
          "aspect-square",
          isDragOver && !disabled && "ring-2 ring-primary border-primary",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            onOpenSelector();
          }
        }}
        aria-label={image ? `Change ${label}` : `Select ${label}`}
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
              />
              {/* Clear button */}
              <button
                type="button"
                onClick={handleClear}
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
              {/* Image name overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-xs text-white truncate">{image.name}</p>
              </div>
            </>
          )
          : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
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
              <p className="text-sm text-muted-foreground">
                {isDragOver ? "Drop to select" : "Click to select"}
              </p>
            </div>
          )}
      </Card>
    </div>
  );
}
