'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface ImageComparisonSliderProps {
  leftImage: {
    url: string
    width: number
    height: number
    label: string
  }
  rightImage: {
    url: string
    width: number
    height: number
    label: string
  }
  isLoading?: boolean
  loadingProgress?: number
}

export function ImageComparisonSlider({
  leftImage,
  rightImage,
  isLoading = false,
  loadingProgress = 0,
}: ImageComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
      setSliderPosition(percentage)
    },
    []
  )

  const handleMouseDown = () => setIsDragging(true)
  const handleMouseUp = () => setIsDragging(false)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) handleMove(e.clientX)
    },
    [isDragging, handleMove]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isDragging && e.touches[0]) {
        handleMove(e.touches[0].clientX)
      }
    },
    [isDragging, handleMove]
  )

  const aspectRatio = leftImage.width / leftImage.height
  const blurAmount = isLoading ? Math.min(10, loadingProgress / 10) : 0

  return (
    <Card className="overflow-hidden">
      <div
        ref={containerRef}
        className="relative cursor-ew-resize select-none"
        style={{ aspectRatio }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Right image (enhanced) */}
        <div className="absolute inset-0">
          <Image
            src={rightImage.url}
            alt={rightImage.label}
            fill
            className="object-contain transition-all duration-300"
            style={{
              filter: isLoading ? `blur(${blurAmount}px)` : 'none',
            }}
            priority
          />
          <div className="absolute top-4 right-4 bg-background/90 px-3 py-1 rounded-md text-sm font-medium">
            {rightImage.label}
          </div>

          {/* Loading overlay on enhanced side */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm font-medium bg-background/90 px-3 py-1 rounded-md">
                  Enhancing image...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Left image (original) with clip-path */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          }}
        >
          <Image
            src={leftImage.url}
            alt={leftImage.label}
            fill
            className="object-contain transition-all duration-300"
            style={{
              filter: isLoading ? `blur(${blurAmount}px)` : 'none',
            }}
            priority
          />
          <div className="absolute top-4 left-4 bg-background/90 px-3 py-1 rounded-md text-sm font-medium">
            {leftImage.label}
          </div>
        </div>

        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize"
          style={{ left: `${sliderPosition}%` }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full shadow-lg flex items-center justify-center">
            <div className="w-1 h-4 bg-background rounded-full mr-0.5" />
            <div className="w-1 h-4 bg-background rounded-full ml-0.5" />
          </div>
        </div>
      </div>
    </Card>
  )
}
