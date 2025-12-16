"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Album } from "@/hooks/useUserAlbums";
import { FolderOpen } from "lucide-react";

interface AlbumSelectorProps {
  albums: Album[];
  selectedAlbumId: string | null;
  onAlbumSelect: (albumId: string | null) => void;
  disabled?: boolean;
}

export function AlbumSelector({
  albums,
  selectedAlbumId,
  onAlbumSelect,
  disabled = false,
}: AlbumSelectorProps) {
  if (albums.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <FolderOpen className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Upload to:</span>
      <Select
        value={selectedAlbumId || ""}
        onValueChange={(value) => onAlbumSelect(value || null)}
        disabled={disabled}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select album..." />
        </SelectTrigger>
        <SelectContent>
          {albums.map((album) => (
            <SelectItem key={album.id} value={album.id}>
              {album.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
