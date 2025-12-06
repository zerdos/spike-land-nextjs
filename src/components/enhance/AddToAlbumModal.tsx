"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderPlus, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Album {
  id: string;
  name: string;
  imageCount: number;
}

interface AddToAlbumModalProps {
  imageId: string;
  imageName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddToAlbumModal({
  imageId,
  imageName,
  open,
  onOpenChange,
  onSuccess,
}: AddToAlbumModalProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const fetchAlbums = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await fetch("/api/albums");
      if (!response.ok) {
        throw new Error("Failed to fetch albums");
      }
      const data = await response.json();
      setAlbums(data.albums || []);
    } catch (error) {
      console.error("Error fetching albums:", error);
      toast.error("Failed to load albums");
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchAlbums();
      setSelectedAlbumId("");
    }
  }, [open, fetchAlbums]);

  const handleAddToAlbum = async () => {
    if (!selectedAlbumId) {
      toast.error("Please select an album");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/albums/${selectedAlbumId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: [imageId] }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add image to album");
      }

      if (data.added === 0) {
        toast.info("Image is already in this album");
      } else {
        const albumName = albums.find((a) => a.id === selectedAlbumId)?.name;
        toast.success(`Added to "${albumName}"`);
        onSuccess?.();
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error adding image to album:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add image to album",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Add to Album
          </DialogTitle>
          <DialogDescription>
            {imageName
              ? `Add "${imageName}" to an album`
              : "Select an album to add this image to"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isFetching
            ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )
            : albums.length === 0
            ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  You don&apos;t have any albums yet
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/albums">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Album
                  </Link>
                </Button>
              </div>
            )
            : (
              <Select value={selectedAlbumId} onValueChange={setSelectedAlbumId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an album" />
                </SelectTrigger>
                <SelectContent>
                  {albums.map((album) => (
                    <SelectItem key={album.id} value={album.id}>
                      <span className="flex items-center gap-2">
                        {album.name}
                        <span className="text-xs text-muted-foreground">
                          ({album.imageCount} {album.imageCount === 1 ? "image" : "images"})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddToAlbum}
            disabled={isLoading || !selectedAlbumId || albums.length === 0}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add to Album
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
