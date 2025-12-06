"use client";

import { EnhancedImagesList } from "@/components/enhance/EnhancedImagesList";
import { ImageUpload } from "@/components/enhance/ImageUpload";
import { TokenDisplay } from "@/components/tokens/TokenDisplay";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import type { EnhancedImage, ImageEnhancementJob } from "@prisma/client";
import { useState } from "react";

interface EnhancePageClientProps {
  images: (EnhancedImage & {
    enhancementJobs: ImageEnhancementJob[];
  })[];
}

export function EnhancePageClient({ images: initialImages }: EnhancePageClientProps) {
  const [images, setImages] = useState(initialImages);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const { refetch: refetchBalance } = useTokenBalance();

  const handleDelete = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image and all its enhancements?")) {
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

  return (
    <div className="min-h-screen">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-foreground">AI Image Enhancement</h1>
            <TokenDisplay />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ImageUpload />
            <div className="hidden lg:block">
              <div className="text-foreground/80 text-lg font-semibold mb-4">Your Images</div>
              <div className="text-muted-foreground text-sm">
                Upload an image to get started with AI enhancement
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">Your Images</h2>
          <EnhancedImagesList
            images={images}
            onDelete={handleDelete}
            deletingImageId={deletingImageId}
          />
        </div>
      </div>
    </div>
  );
}
