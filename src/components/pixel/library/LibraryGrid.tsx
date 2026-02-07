"use client";

import { MasonryGridUniform } from "@/components/ui/masonry-grid";
import { type LibraryImage, LibraryItem } from "./LibraryItem";

interface LibraryGridProps {
  images: LibraryImage[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
}

export function LibraryGrid({
  images,
  selectedIds,
  onToggleSelect,
}: LibraryGridProps) {
  if (images.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-lg">Your library is empty.</p>
      </div>
    );
  }

  return (
    <MasonryGridUniform zoomLevel={3}>
      {images.map((image) => (
        <LibraryItem
          key={image.id}
          image={image}
          isSelected={selectedIds.includes(image.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </MasonryGridUniform>
  );
}
