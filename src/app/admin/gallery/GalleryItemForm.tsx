/**
 * Gallery Item Form
 *
 * Form component for creating and editing gallery items.
 * Handles title, description, and category fields.
 */

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { useState } from "react";

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

interface GalleryItemFormProps {
  item?: GalleryItem | null;
  selectedImageData?: SelectedImageData | null;
  onSubmit: (data: { title: string; description?: string; category: GalleryCategory; }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const CATEGORY_OPTIONS: { value: GalleryCategory; label: string; }[] = [
  { value: "PORTRAIT", label: "Portrait" },
  { value: "LANDSCAPE", label: "Landscape" },
  { value: "PRODUCT", label: "Product" },
  { value: "ARCHITECTURE", label: "Architecture" },
];

export function GalleryItemForm({
  item,
  selectedImageData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: GalleryItemFormProps) {
  const [title, setTitle] = useState(item?.title || "");
  const [description, setDescription] = useState(item?.description || "");
  const [category, setCategory] = useState<GalleryCategory>(item?.category || "PORTRAIT");
  const [errors, setErrors] = useState<{ title?: string; }>({});

  const isEditing = !!item;
  const previewUrl = item?.originalUrl || selectedImageData?.originalUrl;
  const enhancedPreviewUrl = item?.enhancedUrl || selectedImageData?.enhancedUrl;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: { title?: string; } = {};
    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image Preview */}
      {(previewUrl || enhancedPreviewUrl) && (
        <div className="space-y-2">
          <Label>Image Preview</Label>
          <div className="grid gap-4 sm:grid-cols-2">
            {previewUrl && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Original</p>
                <div className="relative aspect-video rounded-md overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  <Image
                    src={previewUrl}
                    alt="Original"
                    fill
                    className="object-cover"
                    sizes="300px"
                  />
                </div>
              </div>
            )}
            {enhancedPreviewUrl && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Enhanced</p>
                <div className="relative aspect-video rounded-md overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  <Image
                    src={enhancedPreviewUrl}
                    alt="Enhanced"
                    fill
                    className="object-cover"
                    sizes="300px"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          type="text"
          placeholder="Enter a title for this gallery item"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={errors.title ? "border-red-500" : ""}
        />
        {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Optional description for this gallery item"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={(value) => setCategory(value as GalleryCategory)}>
          <SelectTrigger id="category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Add to Gallery"}
        </Button>
      </div>
    </form>
  );
}
