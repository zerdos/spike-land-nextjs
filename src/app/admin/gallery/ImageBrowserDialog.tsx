/**
 * Image Browser Dialog
 *
 * Dialog component for browsing and selecting user images to add to the gallery.
 * Allows searching by share token or user email.
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useState } from "react";

interface EnhancementJob {
  id: string;
  tier: string;
  enhancedUrl: string;
  createdAt: string;
}

interface BrowseImage {
  id: string;
  originalUrl: string;
  shareToken: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  enhancementJobs: EnhancementJob[];
}

interface ImageBrowserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (
    imageId: string,
    jobId: string,
    originalUrl: string,
    enhancedUrl: string,
  ) => void;
}

export function ImageBrowserDialog({
  open,
  onOpenChange,
  onSelect,
}: ImageBrowserDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"shareToken" | "userId">(
    "shareToken",
  );
  const [images, setImages] = useState<BrowseImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<BrowseImage | null>(null);
  const [selectedJob, setSelectedJob] = useState<EnhancementJob | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a search query");
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedImage(null);
    setSelectedJob(null);

    try {
      const param = searchType === "shareToken" ? "shareToken" : "userId";
      const response = await fetch(
        `/api/admin/gallery/browse?${param}=${encodeURIComponent(searchQuery.trim())}`,
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to search images");
      }

      const data = await response.json() as { images: BrowseImage[]; };
      setImages(data.images || []);

      if (data.images?.length === 0) {
        setError("No images found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (image: BrowseImage) => {
    setSelectedImage(image);
    setSelectedJob(null);
  };

  const handleJobClick = (job: EnhancementJob) => {
    setSelectedJob(job);
  };

  const handleConfirmSelect = () => {
    if (selectedImage && selectedJob) {
      onSelect(
        selectedImage.id,
        selectedJob.id,
        selectedImage.originalUrl,
        selectedJob.enhancedUrl,
      );
      // Reset state for next time
      setSearchQuery("");
      setImages([]);
      setSelectedImage(null);
      setSelectedJob(null);
    }
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      // Reset state when closing
      setSearchQuery("");
      setImages([]);
      setSelectedImage(null);
      setSelectedJob(null);
      setError(null);
    }
    onOpenChange(openState);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Browse Images</DialogTitle>
          <DialogDescription>
            Search for images by share token or user email to add to the featured gallery.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Section */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="search-query">Search Query</Label>
                <Input
                  id="search-query"
                  type="text"
                  placeholder={searchType === "shareToken"
                    ? "Enter share token..."
                    : "Enter user ID or email..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="space-y-2">
                <Label>Search By</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={searchType === "shareToken"
                      ? "default"
                      : "outline"}
                    onClick={() => setSearchType("shareToken")}
                    size="sm"
                  >
                    Share Token
                  </Button>
                  <Button
                    type="button"
                    variant={searchType === "userId" ? "default" : "outline"}
                    onClick={() => setSearchType("userId")}
                    size="sm"
                  >
                    User
                  </Button>
                </div>
              </div>
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>

          {/* Error Message */}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Image Results */}
          {images.length > 0 && !selectedImage && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Select an Image</h3>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {images.map((image) => (
                  <Card
                    key={image.id}
                    className="cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary"
                    onClick={() => handleImageClick(image)}
                  >
                    <div className="relative aspect-video bg-neutral-100 dark:bg-neutral-800">
                      <Image
                        src={image.originalUrl}
                        alt="User image"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-muted-foreground truncate">
                        {image.user?.name || image.user?.email || "Anonymous"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {image.enhancementJobs.length} enhancement(s)
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Enhancement Jobs Selection */}
          {selectedImage && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Select an Enhancement</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedImage(null);
                    setSelectedJob(null);
                  }}
                >
                  Back to images
                </Button>
              </div>

              {/* Selected Image Preview */}
              <div className="relative aspect-video max-w-sm rounded-md overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <Image
                  src={selectedImage.originalUrl}
                  alt="Selected image"
                  fill
                  className="object-cover"
                  sizes="400px"
                />
              </div>

              {selectedImage.enhancementJobs.length === 0
                ? (
                  <p className="text-sm text-muted-foreground">
                    This image has no enhancements. Please select a different image.
                  </p>
                )
                : (
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {selectedImage.enhancementJobs.map((job) => (
                      <Card
                        key={job.id}
                        className={`cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary ${
                          selectedJob?.id === job.id
                            ? "ring-2 ring-primary"
                            : ""
                        }`}
                        onClick={() => handleJobClick(job)}
                      >
                        <div className="relative aspect-video bg-neutral-100 dark:bg-neutral-800">
                          <Image
                            src={job.enhancedUrl}
                            alt={`Enhanced (${job.tier})`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium">{job.tier}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

              {/* Confirm Selection */}
              {selectedJob && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => handleClose(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleConfirmSelect}>
                    Use This Enhancement
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
