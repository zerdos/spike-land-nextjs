"use client";

/**
 * Gallery Client Component
 * 
 * Handles client-side interactivity for the public gallery including
 * filtering, pagination, and image modal.
 */

import { useState, useEffect } from "react";
import { EnhancementTier } from "@prisma/client";
import { Loader2 } from "lucide-react";

interface PublicGalleryItem {
  id: string;
  name: string;
  description: string | null;
  originalUrl: string;
  enhancedUrl: string;
  width: number;
  height: number;
  tier: EnhancementTier;
  tags: string[];
  createdAt: string;
  userName: string | null;
}

interface GalleryResponse {
  items: PublicGalleryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export default function GalleryClient() {
  const [images, setImages] = useState<PublicGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>("");

  useEffect(() => {
    loadImages();
  }, [page, selectedTags, selectedTier]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (selectedTags.length > 0) {
        params.set("tags", selectedTags.join(","));
      }

      if (selectedTier) {
        params.set("tier", selectedTier);
      }

      const response = await fetch(`/api/gallery/public?${params}`);
      const data: GalleryResponse = await response.json();

      if (page === 1) {
        setImages(data.items);
      } else {
        setImages((prev) => [...prev, ...data.items]);
      }

      setHasMore(data.pagination.hasMore);
    } catch (error) {
      console.error("Failed to load images:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setPage((p) => p + 1);
  };

  if (loading && page === 1) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No public images found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="group relative overflow-hidden rounded-lg border bg-card hover:shadow-lg transition-shadow"
          >
            <div className="aspect-square relative">
              <img
                src={image.enhancedUrl}
                alt={image.name}
                className="object-cover w-full h-full"
                loading="lazy"
              />
            </div>
            <div className="p-3">
              <h3 className="font-medium truncate">{image.name}</h3>
              {image.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {image.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-secondary px-2 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {image.tags.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{image.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
