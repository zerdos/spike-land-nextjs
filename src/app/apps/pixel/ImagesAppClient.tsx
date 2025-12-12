"use client";

import { PixelLogo } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EnhancedImage, ImageEnhancementJob } from "@prisma/client";
import { Sparkles, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface ImagesAppClientProps {
  images: (EnhancedImage & { enhancementJobs: ImageEnhancementJob[]; })[];
}

export function ImagesAppClient({ images: initialImages }: ImagesAppClientProps) {
  const [images, setImages] = useState(initialImages);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image and all its enhancements?")) {
      return;
    }

    setIsDeleting(imageId);
    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("Failed to delete image. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };

  const getLatestJob = (image: EnhancedImage & { enhancementJobs: ImageEnhancementJob[]; }) => {
    return image.enhancementJobs[0];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <PixelLogo size="lg" />
            <span className="text-muted-foreground text-lg hidden md:inline">
              AI Image Enhancement
            </span>
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Upload and enhance your images with AI technology
          </p>
        </div>
        <Button asChild>
          <Link href="/apps/pixel">
            <Upload className="mr-2 h-4 w-4" />
            Upload Image
          </Link>
        </Button>
      </div>

      {images.length === 0
        ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No images yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your first image to get started with AI enhancement
              </p>
              <Button asChild>
                <Link href="/apps/pixel">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Image
                </Link>
              </Button>
            </CardContent>
          </Card>
        )
        : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => {
              const latestJob = getLatestJob(image);
              const hasEnhancement = latestJob?.status === "COMPLETED";

              return (
                <Card key={image.id} className="overflow-hidden">
                  <div className="relative aspect-video bg-muted">
                    <Image
                      src={hasEnhancement && latestJob.enhancedUrl
                        ? latestJob.enhancedUrl
                        : image.originalUrl}
                      alt={image.name || "Uploaded image"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    {hasEnhancement && (
                      <Badge className="absolute top-2 right-2 bg-green-500">
                        Enhanced
                      </Badge>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{image.name || "Untitled"}</CardTitle>
                    <CardDescription>
                      {image.originalWidth} × {image.originalHeight} ·{" "}
                      {(image.originalSizeBytes / 1024 / 1024).toFixed(2)} MB
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-2">
                      <Button asChild className="flex-1">
                        <Link href={`/pixel/${image.id}`}>
                          <Sparkles className="mr-2 h-4 w-4" />
                          {hasEnhancement ? "View" : "Enhance"}
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(image.id)}
                        disabled={isDeleting === image.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {latestJob && latestJob.status === "PROCESSING" && (
                      <p className="text-xs text-center text-muted-foreground">
                        Enhancement in progress...
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}
