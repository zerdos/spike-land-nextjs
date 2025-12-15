"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Folder,
  FolderPlus,
  Globe,
  Images,
  Link as LinkIcon,
  Loader2,
  Lock,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface PreviewImage {
  id: string;
  url: string;
  name: string;
}

interface Album {
  id: string;
  name: string;
  description: string | null;
  privacy: "PRIVATE" | "UNLISTED" | "PUBLIC";
  coverImageId: string | null;
  imageCount: number;
  previewImages: PreviewImage[];
  createdAt: string;
  updatedAt: string;
}

export function AlbumsClient() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumPrivacy, setNewAlbumPrivacy] = useState<
    "PRIVATE" | "UNLISTED" | "PUBLIC"
  >("PRIVATE");

  const fetchAlbums = useCallback(async () => {
    try {
      const response = await fetch("/api/albums");
      if (!response.ok) throw new Error("Failed to fetch albums");
      const data = await response.json();
      setAlbums(data.albums);
    } catch (error) {
      console.error("Error fetching albums:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAlbumName,
          privacy: newAlbumPrivacy,
        }),
      });

      if (!response.ok) throw new Error("Failed to create album");

      setShowCreateDialog(false);
      setNewAlbumName("");
      setNewAlbumPrivacy("PRIVATE");
      fetchAlbums();
    } catch (error) {
      console.error("Error creating album:", error);
      alert("Failed to create album. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this album? Images will not be deleted.",
      )
    ) {
      return;
    }

    setIsDeleting(albumId);
    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete album");

      setAlbums((prev) => prev.filter((a) => a.id !== albumId));
    } catch (error) {
      console.error("Error deleting album:", error);
      alert("Failed to delete album. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };

  const getPrivacyIcon = (privacy: Album["privacy"]) => {
    switch (privacy) {
      case "PUBLIC":
        return <Globe className="h-3 w-3" />;
      case "UNLISTED":
        return <LinkIcon className="h-3 w-3" />;
      default:
        return <Lock className="h-3 w-3" />;
    }
  };

  const getPrivacyLabel = (privacy: Album["privacy"]) => {
    switch (privacy) {
      case "PUBLIC":
        return "Public";
      case "UNLISTED":
        return "Unlisted";
      default:
        return "Private";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Albums
          </h1>
          <p className="mt-2 text-muted-foreground">
            Organize your enhanced images into collections
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <FolderPlus className="mr-2 h-4 w-4" />
              New Album
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Album</DialogTitle>
              <DialogDescription>
                Give your album a name and choose who can see it.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Album Name</Label>
                <Input
                  id="name"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="My Album"
                  maxLength={100}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="privacy">Privacy</Label>
                <Select
                  value={newAlbumPrivacy}
                  onValueChange={(value) =>
                    setNewAlbumPrivacy(
                      value as "PRIVATE" | "UNLISTED" | "PUBLIC",
                    )}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Private - Only you can see
                      </div>
                    </SelectItem>
                    <SelectItem value="UNLISTED">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Unlisted - Anyone with the link
                      </div>
                    </SelectItem>
                    <SelectItem value="PUBLIC">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Public - Visible to everyone
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAlbum}
                disabled={!newAlbumName.trim() || isCreating}
              >
                {isCreating &&
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Album
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {albums.length === 0
        ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Folder className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No albums yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first album to organize your enhanced images
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Album
              </Button>
            </CardContent>
          </Card>
        )
        : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
              <Card key={album.id} className="overflow-hidden">
                <div className="relative aspect-video bg-muted">
                  {album.previewImages.length > 0
                    ? (
                      <div className="grid grid-cols-2 gap-0.5 h-full">
                        {album.previewImages.slice(0, 4).map((img, idx) => (
                          <div
                            key={img.id}
                            className={`relative ${
                              album.previewImages.length === 1
                                ? "col-span-2 row-span-2"
                                : album.previewImages.length === 2
                                ? "row-span-2"
                                : album.previewImages.length === 3 && idx === 0
                                ? "row-span-2"
                                : ""
                            }`}
                          >
                            <Image
                              src={img.url}
                              alt={img.name || "Album image"}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 17vw"
                            />
                          </div>
                        ))}
                      </div>
                    )
                    : (
                      <div className="flex h-full items-center justify-center">
                        <Images className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                  <Badge
                    variant="secondary"
                    className="absolute bottom-2 left-2 gap-1"
                  >
                    {getPrivacyIcon(album.privacy)}
                    {getPrivacyLabel(album.privacy)}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-1">{album.name}</CardTitle>
                  <CardDescription>
                    {album.imageCount} {album.imageCount === 1 ? "image" : "images"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button asChild className="flex-1">
                      <Link href={`/albums/${album.id}`}>View Album</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteAlbum(album.id)}
                      disabled={isDeleting === album.id}
                    >
                      {isDeleting === album.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
