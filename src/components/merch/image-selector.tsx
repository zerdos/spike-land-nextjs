"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Check, ImageIcon, Upload } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

interface EnhancedImage {
  id: string;
  name: string;
  originalUrl: string;
  originalWidth: number;
  originalHeight: number;
}

interface SelectedImage {
  type: "enhanced" | "upload";
  imageId?: string;
  imageUrl: string;
  width: number;
  height: number;
  r2Key?: string;
}

interface ImageSelectorProps {
  minWidth: number;
  minHeight: number;
  onSelect: (image: SelectedImage | null) => void;
  selectedImage?: SelectedImage | null;
}

export function ImageSelector({
  minWidth,
  minHeight,
  onSelect,
  selectedImage,
}: ImageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<EnhancedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch user's enhanced images
  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch images that meet the minimum size requirements
      const response = await fetch("/api/images?limit=50");
      if (response.ok) {
        const data = await response.json();
        // Filter images that meet size requirements
        const filteredImages = (data.images || []).filter(
          (img: EnhancedImage) => img.originalWidth >= minWidth && img.originalHeight >= minHeight,
        );
        setImages(filteredImages);
      }
    } catch (error) {
      console.error("Failed to fetch images:", error);
    } finally {
      setIsLoading(false);
    }
  }, [minWidth, minHeight]);

  useEffect(() => {
    if (open) {
      fetchImages();
    }
  }, [open, fetchImages]);

  const handleImageSelect = (image: EnhancedImage) => {
    onSelect({
      type: "enhanced",
      imageId: image.id,
      imageUrl: image.originalUrl,
      width: image.originalWidth,
      height: image.originalHeight,
    });
    setOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setUploadError("Image must be less than 20MB");
      return;
    }

    // Check image dimensions
    const img = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      if (img.width < minWidth || img.height < minHeight) {
        setUploadError(
          `Image must be at least ${minWidth}x${minHeight}px. Your image is ${img.width}x${img.height}px.`,
        );
        return;
      }

      // Upload the image
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("purpose", "merch");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const data = await response.json();

        onSelect({
          type: "upload",
          imageUrl: data.url,
          r2Key: data.r2Key,
          width: img.width,
          height: img.height,
        });
        setOpen(false);
      } catch (error) {
        console.error("Upload failed:", error);
        setUploadError("Failed to upload image. Please try again.");
      } finally {
        setIsUploading(false);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setUploadError("Failed to load image");
    };

    img.src = objectUrl;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full h-auto p-4">
          {selectedImage
            ? (
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 rounded overflow-hidden bg-muted">
                  <Image
                    src={selectedImage.imageUrl}
                    alt="Selected image"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="text-left">
                  <p className="font-medium">Image selected</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedImage.width}x{selectedImage.height}px
                  </p>
                </div>
                <Check className="ml-auto h-5 w-5 text-green-600" />
              </div>
            )
            : (
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Select an image</p>
                  <p className="text-sm text-muted-foreground">
                    Min. {minWidth}x{minHeight}px
                  </p>
                </div>
              </div>
            )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Your Image</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="my-images" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-images">My Images</TabsTrigger>
            <TabsTrigger value="upload">Upload New</TabsTrigger>
          </TabsList>

          <TabsContent value="my-images" className="mt-4">
            {isLoading
              ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary">
                  </div>
                </div>
              )
              : images.length === 0
              ? (
                <div className="text-center py-8">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">
                    No images found that meet the size requirements
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Minimum: {minWidth}x{minHeight}px
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      const tab = document.querySelector(
                        '[data-state="inactive"][value="upload"]',
                      ) as HTMLButtonElement;
                      tab?.click();
                    }}
                  >
                    Upload a new image
                  </Button>
                </div>
              )
              : (
                <div className="grid grid-cols-3 gap-3">
                  {images.map((image) => (
                    <button
                      key={image.id}
                      onClick={() => handleImageSelect(image)}
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
                    >
                      <Image
                        src={image.originalUrl}
                        alt={image.name}
                        fill
                        className="object-cover"
                        sizes="150px"
                      />
                      {selectedImage?.imageId === image.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="h-8 w-8 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your image must be at least {minWidth}x{minHeight}px for high-quality printing.
                </AlertDescription>
              </Alert>

              {uploadError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="mt-4">
                  <Label
                    htmlFor="image-upload"
                    className="cursor-pointer text-primary hover:underline"
                  >
                    {isUploading ? "Uploading..." : "Click to upload"}
                  </Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  JPEG or PNG, max 20MB
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
