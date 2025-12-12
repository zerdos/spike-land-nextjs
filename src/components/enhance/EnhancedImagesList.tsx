"use client";

import { AddToAlbumModal } from "@/components/enhance/AddToAlbumModal";
import { DraggablePhotoCard } from "@/components/enhance/DraggablePhotoCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBestThumbnail } from "@/lib/images/get-best-thumbnail";
import type { EnhancedImage, ImageEnhancementJob } from "@prisma/client";
import { FolderPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface EnhancedImagesListProps {
  images: (EnhancedImage & {
    enhancementJobs: ImageEnhancementJob[];
  })[];
  onDelete?: (imageId: string) => void;
  deletingImageId?: string | null;
  showEnhanced?: boolean;
  onDragStart?: (imageIds: string[]) => void;
  onDragEnd?: () => void;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  // Use UTC methods to ensure consistent output across timezones
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function EnhancedImagesList({
  images,
  onDelete,
  deletingImageId,
  showEnhanced = false,
  onDragStart,
  onDragEnd,
}: EnhancedImagesListProps) {
  const [isClient, setIsClient] = useState(false);
  const [addToAlbumImageId, setAddToAlbumImageId] = useState<string | null>(
    null,
  );
  const [addToAlbumImageName, setAddToAlbumImageName] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          No images uploaded yet. Upload your first image to get started.
        </p>
      </div>
    );
  }

  const getStatusBadge = (
    jobs: ImageEnhancementJob[],
  ): { variant: "default" | "secondary" | "destructive"; text: string; } => {
    if (jobs.length === 0) {
      return { variant: "secondary", text: "Not Enhanced" };
    }

    const hasCompleted = jobs.some((job) => job.status === "COMPLETED");
    const hasProcessing = jobs.some((job) => job.status === "PROCESSING");
    const hasFailed = jobs.every((job) => job.status === "FAILED");

    if (hasCompleted) {
      return {
        variant: "default",
        text: `${jobs.filter((j) => j.status === "COMPLETED").length} Enhanced`,
      };
    }
    if (hasProcessing) {
      return { variant: "secondary", text: "Processing..." };
    }
    if (hasFailed) {
      return { variant: "destructive", text: "Failed" };
    }

    return { variant: "secondary", text: "Pending" };
  };

  const handleOpenAddToAlbum = (imageId: string, imageName?: string) => {
    setAddToAlbumImageId(imageId);
    setAddToAlbumImageName(imageName);
  };

  const handleCloseAddToAlbum = () => {
    setAddToAlbumImageId(null);
    setAddToAlbumImageName(undefined);
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {images.map((image) => {
          const statusBadge = getStatusBadge(image.enhancementJobs);
          const isDeleting = deletingImageId === image.id;

          const imageCard = (
            <div className="group relative">
              <Link href={`/pixel/${image.id}`}>
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted/50 cursor-pointer transition-all duration-300 group-hover:ring-2 group-hover:ring-primary/30">
                  <Image
                    src={getBestThumbnail(image, showEnhanced)}
                    alt="Uploaded image"
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-between">
                      <Badge variant={statusBadge.variant} className="text-xs">
                        {statusBadge.text}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Link>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground truncate" suppressHydrationWarning>
                  {isClient ? formatDate(image.createdAt) : ""}
                </span>
                <div className="flex gap-1">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={isDeleting}
                  >
                    <Link href={`/pixel/${image.id}`}>
                      {image.enhancementJobs.length > 0 ? "View" : "Enhance"}
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleOpenAddToAlbum(image.id, image.name ?? undefined)}
                    disabled={isDeleting}
                    title="Add to Album"
                    aria-label="Add to Album"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                  </Button>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        onDelete(image.id);
                      }}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );

          if (onDragStart && onDragEnd) {
            return (
              <DraggablePhotoCard
                key={image.id}
                imageId={image.id}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              >
                {imageCard}
              </DraggablePhotoCard>
            );
          }

          return <div key={image.id}>{imageCard}</div>;
        })}
      </div>

      <AddToAlbumModal
        imageId={addToAlbumImageId ?? ""}
        imageName={addToAlbumImageName}
        open={addToAlbumImageId !== null}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseAddToAlbum();
          }
        }}
      />
    </>
  );
}
