"use client"

import { useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface Screenshot {
  id: string
  url: string
  alt: string
  title?: string
}

export interface AppScreenshotGalleryProps {
  screenshots: Screenshot[]
  columns?: 2 | 3 | 4
  className?: string
}

export function AppScreenshotGallery({
  screenshots,
  columns = 3,
  className
}: AppScreenshotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0)

  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  }

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? screenshots.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === screenshots.length - 1 ? 0 : prev + 1))
  }

  if (screenshots.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        No screenshots available
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("grid gap-4", gridCols[columns])}>
        {screenshots.map((screenshot, index) => (
          <Dialog key={screenshot.id}>
            <DialogTrigger asChild>
              <button
                onClick={() => setSelectedIndex(index)}
                className="group relative aspect-video overflow-hidden rounded-lg border bg-muted hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <Image
                  src={screenshot.url}
                  alt={screenshot.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {screenshot.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-sm font-medium truncate">
                      {screenshot.title}
                    </p>
                  </div>
                )}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
              <div className="relative w-full h-full flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 z-10"
                  onClick={() => {
                    const dialog = document.querySelector('[role="dialog"]')
                    if (dialog) {
                      const closeButton = dialog.querySelector('[data-state="open"]')
                      if (closeButton instanceof HTMLElement) {
                        closeButton.click()
                      }
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>

                {screenshots.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10"
                      onClick={handlePrevious}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10"
                      onClick={handleNext}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}

                <div className="relative w-full h-full min-h-[400px]">
                  {screenshots[selectedIndex] && (
                    <Image
                      src={screenshots[selectedIndex].url}
                      alt={screenshots[selectedIndex].alt}
                      fill
                      className="object-contain"
                      sizes="90vw"
                      priority
                    />
                  )}
                </div>

                {screenshots[selectedIndex]?.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-4">
                    <p className="text-center font-medium">
                      {screenshots[selectedIndex].title}
                    </p>
                    {screenshots.length > 1 && (
                      <p className="text-center text-sm text-muted-foreground mt-1">
                        {selectedIndex + 1} of {screenshots.length}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  )
}