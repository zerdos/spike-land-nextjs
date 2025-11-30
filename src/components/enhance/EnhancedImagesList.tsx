"use client"

import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { EnhancedImage, ImageEnhancementJob } from "@prisma/client"

interface EnhancedImagesListProps {
  images: (EnhancedImage & {
    enhancementJobs: ImageEnhancementJob[]
  })[]
  onDelete?: (imageId: string) => void
}

export function EnhancedImagesList({
  images,
  onDelete,
}: EnhancedImagesListProps) {
  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          No images uploaded yet. Upload your first image to get started.
        </p>
      </div>
    )
  }

  const getStatusBadge = (
    jobs: ImageEnhancementJob[]
  ): { variant: "default" | "secondary" | "destructive"; text: string } => {
    if (jobs.length === 0) {
      return { variant: "secondary", text: "Not Enhanced" }
    }

    const hasCompleted = jobs.some((job) => job.status === "COMPLETED")
    const hasProcessing = jobs.some((job) => job.status === "PROCESSING")
    const hasFailed = jobs.every((job) => job.status === "FAILED")

    if (hasCompleted) {
      return { variant: "default", text: `${jobs.filter(j => j.status === "COMPLETED").length} Enhanced` }
    }
    if (hasProcessing) {
      return { variant: "secondary", text: "Processing..." }
    }
    if (hasFailed) {
      return { variant: "destructive", text: "Failed" }
    }

    return { variant: "secondary", text: "Pending" }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {images.map((image) => {
        const statusBadge = getStatusBadge(image.enhancementJobs)

        return (
          <Card key={image.id} className="overflow-hidden">
            <Link href={`/enhance/${image.id}`}>
              <div className="relative aspect-video bg-muted cursor-pointer hover:opacity-90 transition-opacity">
                <Image
                  src={image.originalUrl}
                  alt="Uploaded image"
                  fill
                  className="object-cover"
                />
              </div>
            </Link>

            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge variant={statusBadge.variant}>{statusBadge.text}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(image.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href={`/enhance/${image.id}`}>
                    {image.enhancementJobs.length > 0 ? "View" : "Enhance"}
                  </Link>
                </Button>

                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      onDelete(image.id)
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
