"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Album } from "@/hooks/useUserAlbums";
import { FolderOpen, X } from "lucide-react";

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
        value={selectedAlbumId || "none"}
        onValueChange={(value) => onAlbumSelect(value === "none" ? null : value)}
        disabled={disabled}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select album..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">No album (loose images)</span>
          </SelectItem>
          {albums.map((album) => (
            <SelectItem key={album.id} value={album.id}>
              {album.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedAlbumId && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onAlbumSelect(null)}
          disabled={disabled}
          title="Clear album selection"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
