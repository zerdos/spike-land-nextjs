/**
 * Gallery Admin Client Component
 *
 * Interactive component for managing featured gallery items with CRUD operations,
 * active toggle, and reordering capabilities.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { GalleryItemForm } from "./GalleryItemForm";
import { ImageBrowserDialog } from "./ImageBrowserDialog";

type GalleryCategory = "PORTRAIT" | "LANDSCAPE" | "PRODUCT" | "ARCHITECTURE";

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  category: GalleryCategory;
  originalUrl: string;
  enhancedUrl: string;
  isActive: boolean;
  displayOrder: number;
  imageId: string;
  jobId: string;
  createdAt: string;
  updatedAt: string;
}

interface SelectedImageData {
  imageId: string;
  jobId: string;
  originalUrl: string;
  enhancedUrl: string;
}

const CATEGORY_COLORS: Record<GalleryCategory, string> = {
  PORTRAIT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  LANDSCAPE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  PRODUCT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  ARCHITECTURE: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

export function GalleryAdminClient() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBrowseDialog, setShowBrowseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<GalleryItem | null>(null);
  const [selectedImageData, setSelectedImageData] = useState<SelectedImageData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/gallery");
      if (!response.ok) throw new Error("Failed to fetch gallery items");
      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleToggleActive = async (item: GalleryItem) => {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/admin/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          isActive: !item.isActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update item");
      }

      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isActive: !i.isActive } : i));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update item");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMoveUp = async (item: GalleryItem) => {
    const currentIndex = items.findIndex((i) => i.id === item.id);
    if (currentIndex <= 0) return;

    const prevItem = items[currentIndex - 1];
    if (!prevItem) return;

    setIsUpdating(true);
    try {
      const response = await fetch("/api/admin/gallery/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          newOrder: prevItem.displayOrder,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reorder item");
      }

      await fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder item");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMoveDown = async (item: GalleryItem) => {
    const currentIndex = items.findIndex((i) => i.id === item.id);
    if (currentIndex >= items.length - 1) return;

    const nextItem = items[currentIndex + 1];
    if (!nextItem) return;

    setIsUpdating(true);
    try {
      const response = await fetch("/api/admin/gallery/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          newOrder: nextItem.displayOrder,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reorder item");
      }

      await fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder item");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = (item: GalleryItem) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/gallery?id=${itemToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete item");
      }

      await fetchItems();
      setShowDeleteDialog(false);
      setItemToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImageSelect = (
    imageId: string,
    jobId: string,
    originalUrl: string,
    enhancedUrl: string,
  ) => {
    setSelectedImageData({ imageId, jobId, originalUrl, enhancedUrl });
    setShowBrowseDialog(false);
    setShowAddDialog(true);
  };

  const handleFormSubmit = async (data: {
    title: string;
    description?: string;
    category: GalleryCategory;
  }) => {
    setIsUpdating(true);
    try {
      if (selectedItem) {
        // Edit existing item
        const response = await fetch("/api/admin/gallery", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedItem.id,
            ...data,
          }),
        });

        if (!response.ok) {
          const responseData = await response.json();
          throw new Error(responseData.error || "Failed to update item");
        }
      } else if (selectedImageData) {
        // Create new item
        const response = await fetch("/api/admin/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            sourceImageId: selectedImageData.imageId,
            sourceJobId: selectedImageData.jobId,
            originalUrl: selectedImageData.originalUrl,
            enhancedUrl: selectedImageData.enhancedUrl,
          }),
        });

        if (!response.ok) {
          const responseData = await response.json();
          throw new Error(responseData.error || "Failed to create item");
        }
      }

      await fetchItems();
      setShowAddDialog(false);
      setSelectedItem(null);
      setSelectedImageData(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditClick = (item: GalleryItem) => {
    setSelectedItem(item);
    setShowAddDialog(true);
  };

  const handleFormCancel = () => {
    setShowAddDialog(false);
    setSelectedItem(null);
    setSelectedImageData(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <div className="h-10 w-32 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="h-64 animate-pulse bg-neutral-100 dark:bg-neutral-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowBrowseDialog(true)}>Add New Item</Button>
      </div>

      {error && (
        <Card className="p-6">
          <p className="text-red-500">Error: {error}</p>
          <Button variant="outline" onClick={fetchItems} className="mt-4">
            Retry
          </Button>
        </Card>
      )}

      {/* Gallery Grid */}
      {items.length === 0
        ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No gallery items yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Click &quot;Add New Item&quot; to add before/after pairs to the featured gallery.
            </p>
          </Card>
        )
        : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{item.title}</CardTitle>
                      <Badge className={`mt-1 ${CATEGORY_COLORS[item.category]}`}>
                        {item.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => handleToggleActive(item)}
                        disabled={isUpdating}
                        aria-label={item.isActive ? "Deactivate item" : "Activate item"}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {/* Thumbnail */}
                  <div className="relative aspect-video mb-3 rounded-md overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    <Image
                      src={item.originalUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {item.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Reorder buttons */}
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMoveUp(item)}
                        disabled={isUpdating || index === 0}
                        title="Move up"
                      >
                        Up
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMoveDown(item)}
                        disabled={isUpdating || index === items.length - 1}
                        title="Move down"
                      >
                        Down
                      </Button>
                    </div>

                    {/* Edit/Delete buttons */}
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClick(item)}
                        disabled={isUpdating}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteClick(item)}
                        disabled={isUpdating}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      {/* Image Browser Dialog */}
      <ImageBrowserDialog
        open={showBrowseDialog}
        onOpenChange={setShowBrowseDialog}
        onSelect={handleImageSelect}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={handleFormCancel}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? "Edit Gallery Item" : "Add Gallery Item"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem
                ? "Update the details for this gallery item."
                : "Fill in the details for the new gallery item."}
            </DialogDescription>
          </DialogHeader>

          <GalleryItemForm
            item={selectedItem}
            selectedImageData={selectedImageData}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isSubmitting={isUpdating}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Gallery Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{itemToDelete?.title}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isUpdating}
            >
              {isUpdating ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
