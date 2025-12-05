/**
 * Admin Photos Gallery Page
 *
 * View all uploaded photos with pagination and filtering.
 * VIEW-ONLY mode - no delete/manage actions.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { useEffect, useState } from "react";

interface PhotoUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface Photo {
  id: string;
  name: string;
  originalUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: string;
  createdAt: string;
  user: PhotoUser;
  enhancementCount: number;
  latestJobStatus?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  // Filters
  const [userSearch, setUserSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchPhotos = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit),
      });

      if (userSearch) params.append("userId", userSearch);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/admin/photos?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch photos");
      }

      const data = await response.json();
      setPhotos(data.images);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getStatusColor = (status?: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "COMPLETED":
        return "default";
      case "PROCESSING":
      case "PENDING":
        return "secondary";
      case "FAILED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Photo Gallery</h1>
        <p className="mt-2 text-muted-foreground">
          View all uploaded photos with pagination and filtering
        </p>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="userSearch" className="mb-2 block text-sm font-medium">
              User ID
            </label>
            <input
              id="userSearch"
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Enter user ID..."
              className="w-full rounded-lg border px-4 py-2 bg-background text-foreground border-input"
            />
          </div>
          <div>
            <label htmlFor="startDate" className="mb-2 block text-sm font-medium">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 bg-background text-foreground border-input"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="mb-2 block text-sm font-medium">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 bg-background text-foreground border-input"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => fetchPhotos(1)}>Apply Filters</Button>
          <Button
            variant="outline"
            onClick={() => {
              setUserSearch("");
              setStartDate("");
              setEndDate("");
              fetchPhotos(1);
            }}
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="p-6">
          <p className="text-red-500">Error: {error}</p>
        </Card>
      )}

      {/* Photo Grid */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">
            Photos ({pagination.total})
          </h2>
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </div>
        </div>

        {loading
          ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading...
            </div>
          )
          : photos.length === 0
          ? (
            <div className="p-8 text-center text-muted-foreground">
              No photos found
            </div>
          )
          : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group cursor-pointer overflow-hidden rounded-lg border border-border transition-shadow hover:shadow-lg"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <div className="relative aspect-square bg-muted">
                      <Image
                        src={photo.thumbnailUrl || photo.originalUrl}
                        alt={photo.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        unoptimized
                      />
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium">{photo.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {photo.user.name || photo.user.email}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {photo.enhancementCount} enhancements
                        </Badge>
                        {photo.latestJobStatus && (
                          <Badge
                            variant={getStatusColor(photo.latestJobStatus)}
                            className="text-xs"
                          >
                            {photo.latestJobStatus}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fetchPhotos(pagination.page - 1)}
                    disabled={pagination.page === 1 || loading}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => fetchPhotos(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages || loading}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
      </Card>

      {/* Photo Details Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Photo Details</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-6">
              {/* Image Preview */}
              <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
                <Image
                  src={selectedPhoto.originalUrl}
                  alt={selectedPhoto.name}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              {/* Metadata Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-3 font-semibold">Image Information</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Name:</span> {selectedPhoto.name}
                    </p>
                    <p>
                      <span className="font-medium">Format:</span> {selectedPhoto.format}
                    </p>
                    <p>
                      <span className="font-medium">Dimensions:</span> {selectedPhoto.width} ×{" "}
                      {selectedPhoto.height}
                    </p>
                    <p>
                      <span className="font-medium">Size:</span>{" "}
                      {formatBytes(selectedPhoto.sizeBytes)}
                    </p>
                    <p>
                      <span className="font-medium">Uploaded:</span>{" "}
                      {new Date(selectedPhoto.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 font-semibold">User Information</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">User ID:</span> {selectedPhoto.user.id}
                    </p>
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedPhoto.user.name || "No name"}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span> {selectedPhoto.user.email}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 font-semibold">Enhancement Statistics</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Total Enhancements:</span>{" "}
                      {selectedPhoto.enhancementCount}
                    </p>
                    {selectedPhoto.latestJobStatus && (
                      <p>
                        <span className="font-medium">Latest Status:</span>{" "}
                        <Badge variant={getStatusColor(selectedPhoto.latestJobStatus)}>
                          {selectedPhoto.latestJobStatus}
                        </Badge>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
