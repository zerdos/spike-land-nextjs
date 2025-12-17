"use client";

import { QRCodePanel } from "@/components/canvas";
import { type DisplayType, DisplayTypeSwitcher } from "@/components/enhance/display-type-switcher";
import { ImagePlaceholder } from "@/components/enhance/ImagePlaceholder";
import { PipelineSelector } from "@/components/enhance/PipelineSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MasonryGridUniform } from "@/components/ui/masonry-grid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useZoomLevel, ZoomSlider } from "@/components/ui/zoom-slider";
import { useMultiFileUpload } from "@/hooks/useMultiFileUpload";
import { ROUTES } from "@/lib/routes";
import {
  ArrowLeft,
  Check,
  CheckSquare,
  Copy,
  FolderInput,
  Globe,
  GripVertical,
  ImageIcon,
  Link as LinkIcon,
  Loader2,
  Lock,
  QrCode,
  Settings,
  Sparkles,
  Square,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface AlbumImage {
  id: string;
  name: string;
  description: string | null;
  originalUrl: string;
  enhancedUrl?: string;
  enhancementTier?: string;
  width: number;
  height: number;
  sortOrder: number;
  createdAt: string;
}

interface Album {
  id: string;
  name: string;
  description: string | null;
  privacy: "PRIVATE" | "UNLISTED" | "PUBLIC";
  coverImageId: string | null;
  pipelineId: string | null;
  shareToken?: string;
  imageCount: number;
  isOwner: boolean;
  images: AlbumImage[];
  createdAt: string;
  updatedAt: string;
}

interface AlbumListItem {
  id: string;
  name: string;
  imageCount: number;
}

interface AlbumDetailClientProps {
  albumId: string;
}

export function AlbumDetailClient({ albumId }: AlbumDetailClientProps) {
  const router = useRouter();
  const [album, setAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrivacy, setEditPrivacy] = useState<
    "PRIVATE" | "UNLISTED" | "PUBLIC"
  >("PRIVATE");
  const [editPipelineId, setEditPipelineId] = useState<string | null>(null);

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  // Drag and drop state
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Move to album dialog state
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [allAlbums, setAllAlbums] = useState<AlbumListItem[]>([]);
  const [selectedTargetAlbum, setSelectedTargetAlbum] = useState<string>("");
  const [isMoving, setIsMoving] = useState(false);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);

  const [showQRSheet, setShowQRSheet] = useState(false);

  // File upload state
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // View controls
  const [zoomLevel, setZoomLevel] = useZoomLevel();
  const [displayType, setDisplayType] = useState<DisplayType>("auto");

  // Multi-file upload hook
  const {
    upload,
    files: uploadingFiles,
    isUploading,
    reset: resetUpload,
  } = useMultiFileUpload({
    albumId,
    maxFiles: 20,
    parallel: false,
    onUploadComplete: () => {
      // Refresh album to show new images
      fetchAlbum();
      // Reset upload state after a delay
      setTimeout(() => resetUpload(), 2000);
    },
  });

  // Ref for tracking original order
  const originalOrderRef = useRef<string[]>([]);

  const fetchAlbum = useCallback(async () => {
    try {
      const response = await fetch(`/api/albums/${albumId}`);
      if (response.status === 404) {
        setError("Album not found");
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch album");
      const data = await response.json();
      setAlbum(data.album);
      setEditName(data.album.name);
      setEditDescription(data.album.description || "");
      setEditPrivacy(data.album.privacy);
      setEditPipelineId(data.album.pipelineId || null);
      originalOrderRef.current = data.album.images.map((img: AlbumImage) => img.id);
    } catch (err) {
      console.error("Error fetching album:", err);
      setError("Failed to load album");
    } finally {
      setIsLoading(false);
    }
  }, [albumId]);

  const fetchAllAlbums = useCallback(async () => {
    setIsLoadingAlbums(true);
    try {
      const response = await fetch("/api/albums");
      if (!response.ok) throw new Error("Failed to fetch albums");
      const data = await response.json();
      setAllAlbums(
        data.albums
          .filter((a: AlbumListItem) => a.id !== albumId)
          .map((a: AlbumListItem) => ({
            id: a.id,
            name: a.name,
            imageCount: a.imageCount,
          })),
      );
    } catch (err) {
      console.error("Error fetching albums:", err);
    } finally {
      setIsLoadingAlbums(false);
    }
  }, [albumId]);

  useEffect(() => {
    fetchAlbum();
  }, [fetchAlbum]);

  const handleSaveSettings = async () => {
    if (!editName.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription || null,
          privacy: editPrivacy,
          pipelineId: editPipelineId,
        }),
      });

      if (!response.ok) throw new Error("Failed to update album");

      const data = await response.json();
      setAlbum((prev) =>
        prev
          ? {
            ...prev,
            name: data.album.name,
            description: data.album.description,
            privacy: data.album.privacy,
            pipelineId: data.album.pipelineId,
            shareToken: data.album.shareToken,
          }
          : null
      );
      setShowSettings(false);
    } catch (err) {
      console.error("Error updating album:", err);
      alert("Failed to update album. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAlbum = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this album? Images will not be deleted.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete album");

      router.push(ROUTES.albums);
    } catch (err) {
      console.error("Error deleting album:", err);
      alert("Failed to delete album. Please try again.");
    }
  };

  const handleRemoveSelectedImages = async () => {
    if (selectedImages.size === 0) return;

    const imageCount = selectedImages.size;
    if (
      !confirm(
        `Remove ${imageCount} image${imageCount > 1 ? "s" : ""} from the album?`,
      )
    ) return;

    try {
      const response = await fetch(`/api/albums/${albumId}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: Array.from(selectedImages) }),
      });

      if (!response.ok) throw new Error("Failed to remove images");

      setAlbum((prev) =>
        prev
          ? {
            ...prev,
            images: prev.images.filter((img) => !selectedImages.has(img.id)),
            imageCount: prev.imageCount - selectedImages.size,
            coverImageId: selectedImages.has(prev.coverImageId || "")
              ? null
              : prev.coverImageId,
          }
          : null
      );
      setSelectedImages(new Set());
      setIsSelectionMode(false);
    } catch (err) {
      console.error("Error removing images:", err);
      alert("Failed to remove images. Please try again.");
    }
  };

  const copyShareLink = () => {
    if (!album?.shareToken) return;

    const url = `${window.location.origin}/albums/${album.id}?token=${album.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPrivacyIcon = (privacy: Album["privacy"]) => {
    switch (privacy) {
      case "PUBLIC":
        return <Globe className="h-4 w-4" />;
      case "UNLISTED":
        return <LinkIcon className="h-4 w-4" />;
      default:
        return <Lock className="h-4 w-4" />;
    }
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (!album) return;
    if (selectedImages.size === album.images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(album.images.map((img) => img.id)));
    }
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedImages(new Set());
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    if (isSelectionMode) return;
    e.dataTransfer.effectAllowed = "move";
    setDraggedImageId(imageId);
  };

  const handleDragOver = (e: React.DragEvent, imageId: string) => {
    e.preventDefault();
    if (draggedImageId && draggedImageId !== imageId) {
      setDragOverImageId(imageId);
    }
  };

  const handleDragLeave = () => {
    setDragOverImageId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetImageId: string) => {
    e.preventDefault();
    setDragOverImageId(null);

    if (!draggedImageId || !album || draggedImageId === targetImageId) {
      setDraggedImageId(null);
      return;
    }

    const images = [...album.images];
    const draggedIndex = images.findIndex((img) => img.id === draggedImageId);
    const targetIndex = images.findIndex((img) => img.id === targetImageId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedImageId(null);
      return;
    }

    // Reorder the array
    const draggedImage = images.splice(draggedIndex, 1)[0];
    if (!draggedImage) {
      setDraggedImageId(null);
      return;
    }
    images.splice(targetIndex, 0, draggedImage);

    // Update local state immediately for optimistic UI
    setAlbum((prev) =>
      prev
        ? {
          ...prev,
          images: images.map((img, idx) => ({ ...img, sortOrder: idx })),
        }
        : null
    );

    setDraggedImageId(null);

    // Save the new order to the backend
    await saveImageOrder(images.map((img) => img.id));
  };

  const handleDragEnd = () => {
    setDraggedImageId(null);
    setDragOverImageId(null);
  };

  // File drag and drop handlers
  const handleFileDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingFiles(true);
    }
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDraggingFiles(false);
    }
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
    dragCounterRef.current = 0;

    // Early return if dataTransfer is not available (can happen in some test environments)
    if (!e.dataTransfer?.files) {
      return;
    }

    const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith("image/"));

    if (files.length > 0 && album?.isOwner) {
      await upload(files);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      await upload(files);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const saveImageOrder = async (imageOrder: string[]) => {
    setIsSavingOrder(true);
    try {
      const response = await fetch(`/api/albums/${albumId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageOrder }),
      });

      if (!response.ok) {
        throw new Error("Failed to save image order");
      }

      originalOrderRef.current = imageOrder;
    } catch (err) {
      console.error("Error saving order:", err);
      // Revert to original order on error
      if (album) {
        const revertedImages = [...album.images].sort((a, b) => {
          const aIdx = originalOrderRef.current.indexOf(a.id);
          const bIdx = originalOrderRef.current.indexOf(b.id);
          return aIdx - bIdx;
        });
        setAlbum((prev) => (prev ? { ...prev, images: revertedImages } : null));
      }
      alert("Failed to save image order. Please try again.");
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Move to album handlers
  const openMoveDialog = () => {
    if (selectedImages.size === 0) return;
    setShowMoveDialog(true);
    setSelectedTargetAlbum("");
    fetchAllAlbums();
  };

  const handleMoveImages = async () => {
    if (!selectedTargetAlbum || selectedImages.size === 0) return;

    setIsMoving(true);
    try {
      // First add images to the target album
      const addResponse = await fetch(
        `/api/albums/${selectedTargetAlbum}/images`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageIds: Array.from(selectedImages) }),
        },
      );

      if (!addResponse.ok) {
        throw new Error("Failed to add images to target album");
      }

      // Then remove from current album
      const removeResponse = await fetch(`/api/albums/${albumId}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: Array.from(selectedImages) }),
      });

      if (!removeResponse.ok) {
        throw new Error("Failed to remove images from current album");
      }

      // Update local state
      setAlbum((prev) =>
        prev
          ? {
            ...prev,
            images: prev.images.filter((img) => !selectedImages.has(img.id)),
            imageCount: prev.imageCount - selectedImages.size,
            coverImageId: selectedImages.has(prev.coverImageId || "")
              ? null
              : prev.coverImageId,
          }
          : null
      );

      setShowMoveDialog(false);
      setSelectedImages(new Set());
      setIsSelectionMode(false);
    } catch (err) {
      console.error("Error moving images:", err);
      alert("Failed to move images. Please try again.");
    } finally {
      setIsMoving(false);
    }
  };

  // Get image URL based on display type
  const getImageUrl = useCallback((image: AlbumImage): string => {
    switch (displayType) {
      case "original":
        return image.originalUrl;
      case "enhanced":
        return image.enhancedUrl || image.originalUrl;
      case "auto":
      default:
        return image.enhancedUrl || image.originalUrl;
    }
  }, [displayType]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {error || "Album not found"}
            </h3>
            <Button asChild>
              <Link href={ROUTES.albums}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Pixel
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="container mx-auto px-4 pt-24 pb-8 relative"
      onDragEnter={album?.isOwner ? handleFileDragEnter : undefined}
      onDragLeave={album?.isOwner ? handleFileDragLeave : undefined}
      onDragOver={album?.isOwner ? handleFileDragOver : undefined}
      onDrop={album?.isOwner ? handleFileDrop : undefined}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleFileInputChange}
      />

      {/* Drag overlay */}
      {isDraggingFiles && album?.isOwner && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="rounded-lg border-2 border-dashed border-primary bg-primary/10 p-12 text-center">
            <Upload className="mx-auto h-16 w-16 text-primary mb-4" />
            <h3 className="text-2xl font-semibold">Drop images here</h3>
            <p className="text-muted-foreground mt-2">
              Images will be uploaded to {album.name}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* QR Panel Sidebar - only for shareable albums */}
        {album.shareToken && album.privacy !== "PRIVATE" && album.isOwner && (
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-4">
              <QRCodePanel
                albumId={album.id}
                shareToken={album.shareToken}
                albumName={album.name}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href={ROUTES.albums}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {album.name}
                  </h1>
                  <Badge variant="secondary" className="gap-1">
                    {getPrivacyIcon(album.privacy)}
                    {album.privacy === "PRIVATE"
                      ? "Private"
                      : album.privacy === "UNLISTED"
                      ? "Unlisted"
                      : "Public"}
                  </Badge>
                </div>
                {album.description && (
                  <p className="mt-2 text-muted-foreground">
                    {album.description}
                  </p>
                )}
              </div>
              {album.isOwner && (
                <div className="flex gap-2">
                  {album.shareToken && album.privacy !== "PRIVATE" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyShareLink}
                      >
                        {copied
                          ? <Check className="mr-2 h-4 w-4" />
                          : <Copy className="mr-2 h-4 w-4" />}
                        {copied ? "Copied!" : "Copy Link"}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setShowQRSheet(true)}
                        aria-label="Show QR code for Canvas display"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleUploadClick}
                    disabled={isUploading}
                  >
                    {isUploading
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <Upload className="mr-2 h-4 w-4" />}
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSettings(true)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  {album.imageCount} {album.imageCount === 1 ? "image" : "images"}
                  {isSavingOrder && (
                    <span className="ml-2 text-muted-foreground">
                      <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                      Saving order...
                    </span>
                  )}
                </p>
                {/* View controls */}
                <div className="hidden sm:flex items-center gap-4 border-l pl-4">
                  <DisplayTypeSwitcher
                    value={displayType}
                    onChange={setDisplayType}
                  />
                  <ZoomSlider
                    value={zoomLevel}
                    onChange={setZoomLevel}
                  />
                </div>
              </div>
              {album.isOwner && album.images.length > 0 && (
                <div className="flex gap-2">
                  {isSelectionMode
                    ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={toggleSelectAll}
                        >
                          {selectedImages.size === album.images.length
                            ? (
                              <>
                                <Square className="mr-2 h-4 w-4" />
                                Deselect All
                              </>
                            )
                            : (
                              <>
                                <CheckSquare className="mr-2 h-4 w-4" />
                                Select All
                              </>
                            )}
                        </Button>
                        {selectedImages.size > 0 && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={openMoveDialog}
                            >
                              <FolderInput className="mr-2 h-4 w-4" />
                              Move ({selectedImages.size})
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleRemoveSelectedImages}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove ({selectedImages.size})
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={exitSelectionMode}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      </>
                    )
                    : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSelectionMode(true)}
                      >
                        <CheckSquare className="mr-2 h-4 w-4" />
                        Select
                      </Button>
                    )}
                </div>
              )}
            </div>
          </div>

          {album.images.length === 0 && uploadingFiles.length === 0
            ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No images yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {album.isOwner
                      ? "Drag and drop images here or click Upload"
                      : "This album has no images yet"}
                  </p>
                  {album.isOwner && (
                    <Button onClick={handleUploadClick}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Images
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
            : (
              <MasonryGridUniform zoomLevel={zoomLevel}>
                {/* Show uploading placeholders first */}
                {uploadingFiles.map((fileStatus) => (
                  <ImagePlaceholder
                    key={fileStatus.id}
                    file={fileStatus.file}
                    progress={fileStatus.progress}
                    status={fileStatus.status === "completed"
                      ? "completed"
                      : fileStatus.status === "failed"
                      ? "failed"
                      : "uploading"}
                    error={fileStatus.error}
                  />
                ))}
                {album.images.map((image) => (
                  <Card
                    key={image.id}
                    className={`overflow-hidden group relative transition-all cursor-pointer ${
                      draggedImageId === image.id ? "opacity-50" : ""
                    } ${dragOverImageId === image.id ? "ring-2 ring-primary" : ""} ${
                      selectedImages.has(image.id) ? "ring-2 ring-primary" : ""
                    }`}
                    draggable={album.isOwner && !isSelectionMode}
                    onDragStart={(e) => handleDragStart(e, image.id)}
                    onDragOver={(e) => handleDragOver(e, image.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, image.id)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                      if (!isSelectionMode && !draggedImageId) {
                        e.stopPropagation();
                        router.push(ROUTES.imageDetail(image.id));
                      }
                    }}
                  >
                    <div className="relative aspect-square bg-muted">
                      <Image
                        src={getImageUrl(image)}
                        alt={image.name || "Album image"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                      {image.enhancedUrl && displayType !== "original" && (
                        <Badge className="absolute top-2 right-2 bg-green-500">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Enhanced
                        </Badge>
                      )}
                      {album.coverImageId === image.id && (
                        <Badge
                          className="absolute top-2 left-2"
                          variant="secondary"
                        >
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Cover
                        </Badge>
                      )}
                      {album.isOwner && !isSelectionMode && (
                        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                          <GripVertical className="h-5 w-5 text-white drop-shadow-lg" />
                        </div>
                      )}
                      {isSelectionMode && (
                        <div
                          className="absolute inset-0 bg-black/20 flex items-start justify-start p-3 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleImageSelection(image.id);
                          }}
                        >
                          <Checkbox
                            checked={selectedImages.has(image.id)}
                            onCheckedChange={() => toggleImageSelection(image.id)}
                            className="h-5 w-5 bg-white border-white"
                            aria-label={`Select ${image.name || "image"}`}
                          />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="text-sm font-medium truncate">
                        {image.name || "Untitled"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {image.width} x {image.height}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </MasonryGridUniform>
            )}
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Album Settings</DialogTitle>
            <DialogDescription>
              Update your album details and privacy settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Album Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-privacy">Privacy</Label>
              <Select
                value={editPrivacy}
                onValueChange={(value) =>
                  setEditPrivacy(value as "PRIVATE" | "UNLISTED" | "PUBLIC")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Private
                    </div>
                  </SelectItem>
                  <SelectItem value="UNLISTED">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Unlisted
                    </div>
                  </SelectItem>
                  <SelectItem value="PUBLIC">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Public
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Enhancement Pipeline</Label>
              <PipelineSelector
                value={editPipelineId}
                onChange={setEditPipelineId}
                showManageLink
              />
              <p className="text-xs text-muted-foreground">
                Select a pipeline to use for enhancing images in this album.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              onClick={handleDeleteAlbum}
              className="sm:mr-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Album
            </Button>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={!editName.trim() || isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to Album Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Images to Album</DialogTitle>
            <DialogDescription>
              Select an album to move {selectedImages.size} image
              {selectedImages.size > 1 ? "s" : ""} to.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {isLoadingAlbums
              ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )
              : allAlbums.length === 0
              ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No other albums available. Create a new album first.
                </p>
              )
              : (
                <div className="grid gap-2">
                  <Label htmlFor="target-album">Target Album</Label>
                  <Select
                    value={selectedTargetAlbum}
                    onValueChange={setSelectedTargetAlbum}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an album..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allAlbums.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a.imageCount} images)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMoveImages}
              disabled={!selectedTargetAlbum || isMoving}
            >
              {isMoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Move Images
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile QR Sheet */}
      {album?.shareToken && album.privacy !== "PRIVATE" && album.isOwner && (
        <Sheet open={showQRSheet} onOpenChange={setShowQRSheet}>
          <SheetContent side="bottom" className="h-auto max-h-[80vh]">
            <SheetHeader>
              <SheetTitle>Canvas Display</SheetTitle>
            </SheetHeader>
            <div className="pt-4">
              <QRCodePanel
                albumId={album.id}
                shareToken={album.shareToken}
                albumName={album.name}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
