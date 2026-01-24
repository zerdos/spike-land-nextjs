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
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

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

interface UserEnhancement {
  id: string;
  tier: string;
  status: string;
  tokenCost: number;
  errorMessage: string | null;
  createdAt: string;
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
  resultUrl: string | null;
  image: {
    id: string;
    name: string;
    originalUrl: string;
    width: number;
    height: number;
    format: string;
  } | null;
}

interface UserHistoryData {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    createdAt: string;
  };
  enhancements: UserEnhancement[];
  pagination: Pagination;
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [userHistoryModal, setUserHistoryModal] = useState<{
    isOpen: boolean;
    userId: string | null;
  }>({ isOpen: false, userId: null });
  const [userHistoryData, setUserHistoryData] = useState<
    UserHistoryData | null
  >(null);
  const [userHistoryLoading, setUserHistoryLoading] = useState(false);
  const [userHistoryPage, setUserHistoryPage] = useState(1);

  const fetchPhotos = useCallback(async (page = 1) => {
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
  }, [pagination.limit, userSearch, startDate, endDate]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchPhotos(pagination.page);
    setIsRefreshing(false);
  }, [fetchPhotos, pagination.page]);

  const fetchUserHistory = useCallback(async (userId: string, page = 1) => {
    setUserHistoryLoading(true);
    try {
      const response = await fetch(
        `/api/admin/users/${userId}/enhancements?page=${page}&limit=10`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch user history");
      }
      const data = await response.json();
      setUserHistoryData(data);
      setUserHistoryPage(page);
    } catch (err) {
      console.error("Failed to fetch user history:", err);
    } finally {
      setUserHistoryLoading(false);
    }
  }, []);

  const openUserHistory = useCallback(
    (userId: string) => {
      setUserHistoryModal({ isOpen: true, userId });
      fetchUserHistory(userId);
    },
    [fetchUserHistory],
  );

  const closeUserHistory = useCallback(() => {
    setUserHistoryModal({ isOpen: false, userId: null });
    setUserHistoryData(null);
    setUserHistoryPage(1);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getStatusColor = (
    status?: string,
  ): "default" | "secondary" | "destructive" => {
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

  const formatDuration = (start: string | null, end: string | null): string => {
    if (!start || !end) return "N/A";
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const seconds = Math.round((endTime - startTime) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Photo Gallery</h1>
          <p className="mt-2 text-muted-foreground">
            View all uploaded photos with pagination and filtering
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing || loading}
          aria-label="Refresh photos"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="userSearch"
              className="mb-2 block text-sm font-medium"
            >
              User ID
            </label>
            <Input
              id="userSearch"
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Enter user ID..."
            />
          </div>
          <div>
            <label
              htmlFor="startDate"
              className="mb-2 block text-sm font-medium"
            >
              Start Date
            </label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="endDate" className="mb-2 block text-sm font-medium">
              End Date
            </label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
            <div
              className="p-8 text-center text-muted-foreground"
              data-testid="loading"
            >
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
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") && setSelectedPhoto(photo)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View photo ${photo.name}`}
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
                      <p className="truncate text-sm font-medium">
                        {photo.name}
                      </p>
                      <button
                        type="button"
                        className="mt-1 truncate text-xs text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openUserHistory(photo.user.id);
                        }}
                        aria-label={`View enhancement history for ${
                          photo.user.name || photo.user.email
                        }`}
                      >
                        {photo.user.name || photo.user.email}
                      </button>
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
                    disabled={pagination.page === pagination.totalPages ||
                      loading}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
      </Card>

      {/* Photo Details Modal */}
      <Dialog
        open={!!selectedPhoto}
        onOpenChange={() => setSelectedPhoto(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Photo Details</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-6">
              {/* Large Image Preview */}
              <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
                <Image
                  src={selectedPhoto.originalUrl}
                  alt={selectedPhoto.name}
                  fill
                  className="object-contain"
                  unoptimized
                  priority
                />
              </div>

              {/* Open in New Tab */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedPhoto.originalUrl, "_blank")}
                  aria-label="Open image in new tab"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" x2="21" y1="14" y2="3" />
                  </svg>
                  Open Full Size
                </Button>
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
                    {selectedPhoto.width > 0 && selectedPhoto.height > 0 && (
                      <p>
                        <span className="font-medium">Dimensions:</span> {selectedPhoto.width} x
                        {" "}
                        {selectedPhoto.height}
                      </p>
                    )}
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
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onClick={() => {
                        setSelectedPhoto(null);
                        openUserHistory(selectedPhoto.user.id);
                      }}
                    >
                      View User Enhancement History
                    </Button>
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
                        <Badge
                          variant={getStatusColor(
                            selectedPhoto.latestJobStatus,
                          )}
                        >
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

      {/* User Enhancement History Modal */}
      <Dialog open={userHistoryModal.isOpen} onOpenChange={closeUserHistory}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Enhancement History</DialogTitle>
          </DialogHeader>
          {userHistoryLoading && !userHistoryData
            ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading user history...
              </div>
            )
            : userHistoryData
            ? (
              <div className="space-y-6">
                {/* User Info */}
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {userHistoryData.user.name || "No name"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {userHistoryData.user.email}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        User ID: {userHistoryData.user.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {userHistoryData.pagination.total}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total Enhancements
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Enhancement History */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Recent Enhancements</h3>
                  {userHistoryData.enhancements.length === 0
                    ? (
                      <p className="text-center text-muted-foreground">
                        No enhancements found
                      </p>
                    )
                    : (
                      <>
                        {userHistoryData.enhancements.map((enhancement) => (
                          <Card key={enhancement.id} className="p-4">
                            <div className="flex gap-4">
                              {enhancement.image && (
                                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                                  <Image
                                    src={enhancement.image.originalUrl}
                                    alt={enhancement.image.name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium">
                                      {enhancement.image?.name ||
                                        "Unknown Image"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(enhancement.createdAt)
                                        .toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                      {enhancement.tier}
                                    </Badge>
                                    <Badge
                                      variant={getStatusColor(
                                        enhancement.status,
                                      )}
                                    >
                                      {enhancement.status}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>
                                    Cost: {enhancement.tokenCost} tokens
                                  </span>
                                  <span>
                                    Duration: {formatDuration(
                                      enhancement.processingStartedAt,
                                      enhancement.processingCompletedAt,
                                    )}
                                  </span>
                                </div>
                                {enhancement.errorMessage && (
                                  <p className="mt-2 text-sm text-red-500">
                                    Error: {enhancement.errorMessage}
                                  </p>
                                )}
                                {enhancement.resultUrl && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="mt-2 h-auto p-0"
                                    onClick={() =>
                                      window.open(
                                        enhancement.resultUrl!,
                                        "_blank",
                                      )}
                                  >
                                    View Enhanced Result
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}

                        {/* Pagination */}
                        {userHistoryData.pagination.totalPages > 1 && (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                fetchUserHistory(
                                  userHistoryModal.userId!,
                                  userHistoryPage - 1,
                                )}
                              disabled={userHistoryPage === 1 ||
                                userHistoryLoading}
                            >
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {userHistoryPage} of {userHistoryData.pagination.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                fetchUserHistory(
                                  userHistoryModal.userId!,
                                  userHistoryPage + 1,
                                )}
                              disabled={userHistoryPage ===
                                  userHistoryData.pagination.totalPages ||
                                userHistoryLoading}
                            >
                              Next
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                </div>
              </div>
            )
            : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
