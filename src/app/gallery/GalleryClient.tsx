"use client";

import { GalleryFilters } from "@/components/gallery/GalleryFilters";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { Button } from "@/components/ui/button";
import type { EnhancedImage, ImageEnhancementJob, User } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface PublicImage extends EnhancedImage {
  enhancementJobs: ImageEnhancementJob[];
  user: Pick<User, "name" | "image">;
}

interface ApiResponse {
  items: PublicImage[];
  pagination: {
    page: number;
    totalPages: number;
  };
}

export function GalleryClient() {
  const [images, setImages] = useState<PublicImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // Derived from loaded images for now
  const allTags = Array.from(new Set(images.flatMap(img => img.tags))).slice(0, 20);

  const fetchImages = useCallback(async (pageNum: number, tags: string[] = []) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pageNum.toString());
      if (tags.length) params.set("tags", tags.join(","));

      const res = await fetch(`/api/gallery/public?${params.toString()}`);
      const data: ApiResponse = await res.json();

      if (pageNum === 1) {
        setImages(data.items);
      } else {
        setImages(prev => [...prev, ...data.items]);
      }

      setHasMore(pageNum < data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages(1, activeTags);
    setPage(1);
  }, [activeTags, fetchImages]); // Re-fetch when filter changes

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchImages(nextPage, activeTags);
  };

  const toggleTag = (tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  return (
    <div className="space-y-8">
      {/* Filters only show if we have some data or existing filters */}
      {(allTags.length > 0 || activeTags.length > 0) && (
        <GalleryFilters
          tags={allTags.concat(activeTags.filter(t => !allTags.includes(t)))} // Ensure active tags are visible
          activeTags={activeTags}
          onToggleTag={toggleTag}
          onClear={() => setActiveTags([])}
        />
      )}

      <GalleryGrid images={images} />

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && hasMore && images.length > 0 && (
        <div className="flex justify-center py-8">
          <Button onClick={loadMore} variant="secondary" size="lg">
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
