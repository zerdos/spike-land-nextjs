"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Globe, Images, Link as LinkIcon, Lock } from "lucide-react";
import Image from "next/image";

interface PreviewImage {
  id: string;
  url: string;
  name: string;
}

type AlbumPrivacy = "PRIVATE" | "UNLISTED" | "PUBLIC";

interface Album {
  id: string;
  name: string;
  description: string | null;
  privacy: AlbumPrivacy;
  coverImageId: string | null;
  imageCount: number;
  previewImages: PreviewImage[];
  createdAt: Date;
}

export interface AlbumsGridProps {
  albums: Album[];
  onAlbumClick?: (albumId: string) => void;
  onDragOver?: (albumId: string) => void;
  onDragLeave?: () => void;
  onDrop?: (albumId: string) => void;
  onFileDrop?: (albumId: string, files: File[]) => void;
  dragOverAlbumId?: string | null;
}

function getPrivacyIcon(privacy: AlbumPrivacy) {
  switch (privacy) {
    case "PUBLIC":
      return <Globe className="h-3 w-3" />;
    case "UNLISTED":
      return <LinkIcon className="h-3 w-3" />;
    default:
      return <Lock className="h-3 w-3" />;
  }
}

function getPrivacyLabel(privacy: AlbumPrivacy) {
  switch (privacy) {
    case "PUBLIC":
      return "Public";
    case "UNLISTED":
      return "Unlisted";
    default:
      return "Private";
  }
}

function AlbumMosaic({ images }: { images: PreviewImage[]; }) {
  if (images.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Images className="h-12 w-12 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-0.5 h-full">
      {images.slice(0, 4).map((img, idx) => (
        <div
          key={img.id}
          className={cn(
            "relative",
            images.length === 1 && "col-span-2 row-span-2",
            images.length === 2 && "row-span-2",
            images.length === 3 && idx === 0 && "row-span-2",
          )}
        >
          <Image
            src={img.url}
            alt={img.name || "Album image"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          />
        </div>
      ))}
    </div>
  );
}

interface AlbumCardContentProps {
  album: Album;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

function AlbumCardContent({
  album,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: AlbumCardContentProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden cursor-pointer transition-all duration-200",
        isDragOver && "ring-2 ring-primary border-primary bg-primary/10",
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="relative aspect-square bg-muted">
        <AlbumMosaic images={album.previewImages} />
        <Badge
          variant="overlay"
          className="absolute bottom-2 left-2 gap-1"
        >
          {getPrivacyIcon(album.privacy)}
          {getPrivacyLabel(album.privacy)}
        </Badge>
      </div>
      <div className="p-3 space-y-1">
        <h3 className="font-medium text-sm line-clamp-1">{album.name}</h3>
        <p className="text-xs text-muted-foreground">
          {album.imageCount} {album.imageCount === 1 ? "image" : "images"}
        </p>
      </div>
    </Card>
  );
}

export function AlbumsGrid({
  albums,
  onAlbumClick,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileDrop,
  dragOverAlbumId,
}: AlbumsGridProps) {
  if (albums.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No albums yet. Create your first album to organize your images.
      </div>
    );
  }

  const handleClick = (albumId: string, e: React.MouseEvent) => {
    if (onAlbumClick) {
      e.preventDefault();
      onAlbumClick(albumId);
    }
  };

  const handleDragOver = (albumId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDragOver) {
      onDragOver(albumId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDragLeave) {
      onDragLeave();
    }
  };

  const handleDrop = (albumId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if files are being dropped (native file drop from desktop)
    const files = e.dataTransfer?.files;
    if (files && files.length > 0 && onFileDrop) {
      // Filter to only image files
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length > 0) {
        onFileDrop(albumId, imageFiles);
        return;
      }
    }

    // Otherwise, this is an internal image drag (existing images being moved)
    if (onDrop) {
      onDrop(albumId);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {albums.map((album) => {
        const isDragOver = dragOverAlbumId === album.id;
        const cardContent = (
          <AlbumCardContent
            album={album}
            isDragOver={isDragOver}
            onDragOver={(e) => handleDragOver(album.id, e)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(album.id, e)}
          />
        );

        return (
          <div
            key={album.id}
            className={cn("block", onAlbumClick && "cursor-pointer")}
            onClick={onAlbumClick
              ? (e) => handleClick(album.id, e)
              : undefined}
          >
            {cardContent}
          </div>
        );
      })}
    </div>
  );
}
