"use client";

import { BulkActions } from "@/components/pixel/library/BulkActions";
import { LibraryGrid } from "@/components/pixel/library/LibraryGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EnhancedImage, ImageEnhancementJob } from "@prisma/client";
import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface LibraryImage extends EnhancedImage {
  enhancementJobs: ImageEnhancementJob[];
}

export function LibraryClient() {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/pixel/library?${params.toString()}`);
      const data = await res.json();
      setImages(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  }, []);

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selectedIds.length} images? This cannot be undone.`)) return;

    try {
      const res = await fetch("/api/pixel/library", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!res.ok) throw new Error("Failed to delete");

      // Optimistic update
      setImages(prev => prev.filter(img => !selectedIds.includes(img.id)));
      setSelectedIds([]);
    } catch (error) {
      console.error(error);
      alert("Failed to delete images.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your library..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSelectedIds(images.map(i => i.id))}>
            Select All
          </Button>
          <Button variant="outline" onClick={() => setSelectedIds([])}>Select None</Button>
        </div>
      </div>

      {loading
        ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )
        : (
          <LibraryGrid
            images={images}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        )}

      <BulkActions
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onDelete={deleteSelected}
      />
    </div>
  );
}
