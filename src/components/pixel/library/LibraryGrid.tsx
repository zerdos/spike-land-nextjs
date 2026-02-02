"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@/components/ui/link";
import { MasonryGridUniform } from "@/components/ui/masonry-grid";
import { getBestThumbnail } from "@/lib/images/get-best-thumbnail";
import type { EnhancedImage, ImageEnhancementJob } from "@prisma/client";
import Image from "next/image";

interface LibraryImage extends EnhancedImage {
  enhancementJobs: ImageEnhancementJob[];
}

interface LibraryGridProps {
  images: LibraryImage[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
}

export function LibraryGrid({ images, selectedIds, onToggleSelect }: LibraryGridProps) {
  if (images.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-lg">Your library is empty.</p>
      </div>
    );
  }

  return (
    <MasonryGridUniform zoomLevel={3}>
      {images.map((image) => {
        const isSelected = selectedIds.includes(image.id);

        return (
          <div key={image.id} className="group relative">
            <div
              className={`relative aspect-square rounded-xl overflow-hidden bg-muted/30 transition-all duration-200 border-2 ${
                isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent"
              }`}
            >
              <Image
                src={getBestThumbnail(image, true)}
                alt={image.name || "Library Image"}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover"
              />

              {/* Overlay with checkbox */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />

              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelect(image.id)}
                  className={`data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground ${
                    !isSelected ? "opacity-0 group-hover:opacity-100 bg-white/80" : ""
                  }`}
                />
              </div>

              {/* Link to details */}
              <Link
                href={`/apps/pixel/${image.id}`}
                className="absolute inset-0 z-0"
              />
            </div>

            <div className="mt-1 px-1">
              <p className="text-xs font-medium truncate">{image.name || "Untitled"}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(image.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
      })}
    </MasonryGridUniform>
  );
}
