"use client";

import { Button } from "@/components/ui/button";
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
import { FolderPlus, Globe, Link as LinkIcon, Loader2, Lock } from "lucide-react";
import { useState } from "react";

type AlbumPrivacy = "PRIVATE" | "UNLISTED" | "PUBLIC";

interface CreateAlbumDialogProps {
  onAlbumCreated?: (
    album: { id: string; name: string; privacy: AlbumPrivacy; },
  ) => void;
  trigger?: React.ReactNode;
}

export function CreateAlbumDialog(
  { onAlbumCreated, trigger }: CreateAlbumDialogProps,
) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [privacy, setPrivacy] = useState<AlbumPrivacy>("PRIVATE");
  const [defaultTier, setDefaultTier] = useState<string>("TIER_1K");
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setPrivacy("PRIVATE");
    setDefaultTier("TIER_1K");
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Album name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), privacy, defaultTier }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create album");
      }

      const data = await response.json();
      setOpen(false);
      resetForm();
      onAlbumCreated?.(data.album);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create album");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating && name.trim()) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FolderPlus className="mr-2 h-4 w-4" />
            New Album
          </Button>
        )}
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
            <Label htmlFor="album-name">Album Name</Label>
            <Input
              id="album-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="My Album"
              maxLength={100}
              disabled={isCreating}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="album-privacy">Privacy</Label>
            <Select
              value={privacy}
              onValueChange={(value) => setPrivacy(value as AlbumPrivacy)}
              disabled={isCreating}
            >
              <SelectTrigger id="album-privacy">
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
          <div className="grid gap-2">
            <Label htmlFor="album-tier">Default Upload Tier</Label>
            <Select
              value={defaultTier}
              onValueChange={(value) => setDefaultTier(value)}
              disabled={isCreating}
            >
              <SelectTrigger id="album-tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TIER_1K">
                  <div className="flex items-center gap-2">
                    <span>1K (1024px) - 2 tokens</span>
                  </div>
                </SelectItem>
                <SelectItem value="TIER_2K">
                  <div className="flex items-center gap-2">
                    <span>2K (2048px) - 5 tokens</span>
                  </div>
                </SelectItem>
                <SelectItem value="TIER_4K">
                  <div className="flex items-center gap-2">
                    <span>4K (4096px) - 10 tokens</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Album
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
