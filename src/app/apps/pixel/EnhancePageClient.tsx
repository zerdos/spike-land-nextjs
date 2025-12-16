"use client";

import { PixelLogo } from "@/components/brand";
import { AlbumSelector } from "@/components/enhance/AlbumSelector";
import { AlbumsGrid } from "@/components/enhance/AlbumsGrid";
import { AlbumsGridSkeleton } from "@/components/enhance/AlbumsGridSkeleton";
import { CreateAlbumDialog } from "@/components/enhance/CreateAlbumDialog";
import { DragDropProvider, useDragDrop } from "@/components/enhance/DragDropContext";
import { DragPreview, useDragPreview } from "@/components/enhance/DragPreview";
import { EnhancedImagesList } from "@/components/enhance/EnhancedImagesList";
import { ImageUpload } from "@/components/enhance/ImageUpload";
import { MultiUploadProgress } from "@/components/enhance/MultiUploadProgress";
import { ThumbnailViewToggle } from "@/components/enhance/ThumbnailViewToggle";
import { TokenDisplay } from "@/components/tokens/TokenDisplay";
import { Button } from "@/components/ui/button";
import { useZoomLevel, ZoomSlider } from "@/components/ui/zoom-slider";
import { useMultiFileUpload } from "@/hooks/useMultiFileUpload";
import { useThumbnailPreference } from "@/hooks/useThumbnailPreference";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useUserAlbums } from "@/hooks/useUserAlbums";
import type { EnhancedImage, ImageEnhancementJob } from "@prisma/client";
import { Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface EnhancePageClientProps {
  images: (EnhancedImage & {
    enhancementJobs: ImageEnhancementJob[];
  })[];
}

function EnhancePageContent({ images: initialImages }: EnhancePageClientProps) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const { refetch: refetchBalance } = useTokenBalance();
  const { showEnhanced, setShowEnhanced } = useThumbnailPreference();
  const [zoomLevel, setZoomLevel] = useZoomLevel();
  const { albums, isLoading: albumsLoading, refetch: refetchAlbums } = useUserAlbums();
  const { dragOverAlbumId, setDragOver } = useDragDrop();
  const { previewState, showPreview, updatePosition, clearPreview } = useDragPreview();

  const {
    upload,
    files,
    isUploading,
    cancel,
    reset,
  } = useMultiFileUpload({
    maxFiles: 20,
    parallel: false,
    albumId: selectedAlbumId || undefined,
    onFileComplete: (_imageId) => {
      // Refresh the page to show the newly uploaded image
      router.refresh();
    },
    onUploadComplete: (_results) => {
      // Reset the upload state after a brief delay to show completion
      setTimeout(() => {
        reset();
        router.refresh();
        // Refetch albums to update image counts
        if (selectedAlbumId) {
          refetchAlbums();
        }
      }, 2000);
    },
  });

  const handleAlbumCreated = () => {
    refetchAlbums();
  };

  const handleDelete = async (imageId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this image and all its enhancements?",
      )
    ) {
      return;
    }

    setDeletingImageId(imageId);

    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete image");
      }

      // Remove from local state
      setImages((prev) => prev.filter((img) => img.id !== imageId));

      // Refetch balance in case tokens were refunded
      await refetchBalance();
    } catch (error) {
      console.error("Delete failed:", error);
      alert(error instanceof Error ? error.message : "Failed to delete image");
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleDragStart = (imageIds: string[]) => {
    const draggedImages = images
      .filter((img) => imageIds.includes(img.id))
      .map((img) => ({
        id: img.id,
        url: img.originalUrl,
      }));

    if (draggedImages.length > 0) {
      showPreview(draggedImages, 0, 0);
    }
  };

  const handleDragMove = (e: React.DragEvent) => {
    updatePosition(e.clientX, e.clientY);
  };

  const handleDragEnd = () => {
    clearPreview();
  };

  return (
    <div className="min-h-screen" onDragOver={handleDragMove}>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <PixelLogo size="lg" />
              <span className="text-muted-foreground text-lg hidden sm:inline">
                AI Image Enhancement
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/apps/pixel/pipelines">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Pipelines
                </Link>
              </Button>
              <TokenDisplay />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <ImageUpload onFilesSelected={upload} isUploading={isUploading} />
              {!albumsLoading && albums.length > 0 && (
                <AlbumSelector
                  albums={albums}
                  selectedAlbumId={selectedAlbumId}
                  onAlbumSelect={setSelectedAlbumId}
                  disabled={isUploading}
                />
              )}
              {files.length > 0 && (
                <MultiUploadProgress
                  files={files}
                  onCancel={cancel}
                />
              )}
            </div>
            <div className="hidden lg:block">
              <div className="text-foreground/80 text-lg font-semibold mb-4">
                Your Images
              </div>
              <div className="text-muted-foreground text-sm">
                Upload one or multiple images to get started with AI enhancement.
                {albums.length > 0 &&
                  " Select an album below to upload directly to it."}
              </div>
            </div>
          </div>
        </div>

        {/* Albums Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-foreground">
              Your Albums
            </h2>
            <CreateAlbumDialog onAlbumCreated={handleAlbumCreated} />
          </div>
          {albumsLoading
            ? <AlbumsGridSkeleton count={3} />
            : albums.length === 0
            ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No albums yet. Create one to organize your images!</p>
              </div>
            )
            : (
              <AlbumsGrid
                albums={albums.map((album) => ({
                  ...album,
                  createdAt: new Date(album.createdAt),
                }))}
                onAlbumClick={(albumId) => router.push(`/albums/${albumId}`)}
                onDragOver={(albumId) => setDragOver(albumId)}
                onDragLeave={() => setDragOver(null)}
                dragOverAlbumId={dragOverAlbumId}
              />
            )}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-foreground">
              Your Images
            </h2>
            <div className="flex items-center gap-4">
              <ThumbnailViewToggle
                showEnhanced={showEnhanced}
                onToggle={setShowEnhanced}
                hasEnhancedImages={images.some((img) =>
                  img.enhancementJobs.some((job) => job.status === "COMPLETED")
                )}
              />
              <ZoomSlider value={zoomLevel} onChange={setZoomLevel} />
            </div>
          </div>
          <EnhancedImagesList
            images={images}
            onDelete={handleDelete}
            deletingImageId={deletingImageId}
            showEnhanced={showEnhanced}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            zoomLevel={zoomLevel}
          />
        </div>
      </div>

      <DragPreview
        images={previewState.images}
        position={previewState.position}
        visible={previewState.visible}
      />
    </div>
  );
}

export function EnhancePageClient(props: EnhancePageClientProps) {
  const router = useRouter();

  const handleMoveComplete = (targetAlbumId: string, imageIds: string[]) => {
    console.log(
      `Successfully moved ${imageIds.length} images to album ${targetAlbumId}`,
    );
    router.refresh();
  };

  const handleMoveError = (error: Error) => {
    console.error("Failed to move images:", error);
    alert(`Failed to move images: ${error.message}`);
  };

  return (
    <DragDropProvider
      onMoveComplete={handleMoveComplete}
      onMoveError={handleMoveError}
    >
      <EnhancePageContent {...props} />
    </DragDropProvider>
  );
}
