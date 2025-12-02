"use client"

import { useState } from "react"
import Image from "next/image"
import { Slider } from "@/components/ui/slider"

// Log broken images to server for monitoring
async function logBrokenImage(imageType: string, url: string) {
  try {
    await fetch("/api/logs/image-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: `COMPARISON_${imageType}_LOAD_ERROR`,
        versionId: "comparison-slider",
        tier: imageType,
        url,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch (e) {
    console.error("[Image Error Logging Failed]", e)
  }
}

interface ImageComparisonSliderProps {
  originalUrl: string
  enhancedUrl: string
  originalLabel?: string
  enhancedLabel?: string
  /** Width of the original image. Used to calculate aspect ratio. Defaults to 16. */
  width?: number
  /** Height of the original image. Used to calculate aspect ratio. Defaults to 9. */
  height?: number
}

/**
 * A slider component to compare original and enhanced images.
 * Uses object-cover to ensure images fill the container, and dynamic aspect ratio
 * to match the original image dimensions.
 */
export function ImageComparisonSlider({
  originalUrl,
  enhancedUrl,
  originalLabel = "Original",
  enhancedLabel = "Enhanced",
  width = 16,
  height = 9,
}: ImageComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState([50])
  const [enhancedError, setEnhancedError] = useState(false)
  const [originalError, setOriginalError] = useState(false)

  // Ensure valid dimensions to prevent CSS errors
  const safeWidth = Math.max(1, Number(width) || 16)
  const safeHeight = Math.max(1, Number(height) || 9)

  const handleEnhancedError = () => {
    console.error(`[Enhanced Image Load Error] URL: ${enhancedUrl}`)
    setEnhancedError(true)
    logBrokenImage("ENHANCED", enhancedUrl)
  }

  const handleOriginalError = () => {
    console.error(`[Original Image Load Error] URL: ${originalUrl}`)
    setOriginalError(true)
    logBrokenImage("ORIGINAL", originalUrl)
  }

  return (
    <div className="space-y-4">
      <div
        className="relative bg-muted rounded-lg overflow-hidden w-full"
        style={{ aspectRatio: `${safeWidth} / ${safeHeight}` }}
      >
        {/* Enhanced image (background) */}
        {!enhancedError ? (
          <Image
            src={enhancedUrl}
            alt={enhancedLabel}
            fill
            className="object-cover"
            priority
            onError={handleEnhancedError}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
            <p className="text-sm text-destructive">Enhanced image failed to load</p>
          </div>
        )}

        {/* Original image (clipped overlay) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - (sliderPosition[0] ?? 50)}% 0 0)` }}
        >
          {!originalError ? (
            <Image
              src={originalUrl}
              alt={originalLabel}
              fill
              className="object-cover"
              priority
              onError={handleOriginalError}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
              <p className="text-sm text-destructive">Original image failed to load</p>
            </div>
          )}
        </div>

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
          style={{ left: `${sliderPosition[0] ?? 50}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-4 bg-gray-600" />
              <div className="w-0.5 h-4 bg-gray-600" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
          {originalLabel}
        </div>
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
          {enhancedLabel}
        </div>
      </div>

      {/* Slider control */}
      <Slider
        value={sliderPosition}
        onValueChange={setSliderPosition}
        min={0}
        max={100}
        step={1}
        className="w-full"
      />
    </div>
  )
}
