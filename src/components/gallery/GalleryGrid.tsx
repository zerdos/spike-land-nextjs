"use client";

import { Badge } from "@/components/ui/badge";
import { MasonryGridUniform } from "@/components/ui/masonry-grid";
import { getBestThumbnail } from "@/lib/images/get-best-thumbnail";
import type { EnhancedImage, ImageEnhancementJob, User } from "@prisma/client";
import Image from "next/image";
import { useState } from "react";
import { ImageModal } from "./ImageModal";

interface PublicImage extends EnhancedImage {
  enhancementJobs: ImageEnhancementJob[];
  user: Pick<User, "name" | "image">;
}

interface GalleryGridProps {
  images: PublicImage[];
}

export function GalleryGrid({ images }: GalleryGridProps) {
  const [selectedImage, setSelectedImage] = useState<PublicImage | null>(null);

  if (images.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-lg">No public images found.</p>
      </div>
    );
  }

  return (
    <>
      <MasonryGridUniform zoomLevel={3}>
        {images.map((image) => {
          const job = image.enhancementJobs[0];
          return (
            <div
              key={image.id}
              className="group relative cursor-pointer"
              onClick={() => setSelectedImage(image)}
            >
              <div className="relative aspect-square rounded-xl overflow-hidden bg-muted/30 transition-all duration-300 hover:ring-2 hover:ring-primary/20">
                <Image
                  src={getBestThumbnail(image, true)}
                  alt={image.description || "Gallery Image"}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        {image.user.image ? (
                            <Image
                                src={image.user.image}
                                width={20}
                                height={20}
                                className="rounded-full border border-white/20"
                                alt={image.user.name || "User"}
                            />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-white/20" />
                        )}
                        <span className="text-xs text-white/90 font-medium truncate">
                            {image.user.name || "Anonymous"}
                        </span>
                    </div>
                    {job?.tier && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-5 bg-black/40 text-white border-white/20 backdrop-blur-sm">
                          {job.tier.replace("TIER_", "")}
                        </Badge>
                        {image.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px] h-5 bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-transparent">
                                {tag}
                            </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </MasonryGridUniform>

      <ImageModal
        image={selectedImage}
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
      />
    </>
  );
}
