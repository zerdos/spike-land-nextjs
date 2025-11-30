'use client'

import { EnhancedImage, ImageEnhancementJob } from '@prisma/client'
import { TokenBalanceDisplay } from '@/components/enhance/TokenBalanceDisplay'
import { ImageUpload } from '@/components/enhance/ImageUpload'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Image as ImageIcon, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface ImagesAppClientProps {
  images: (EnhancedImage & {
    enhancementJobs: ImageEnhancementJob[]
  })[]
}

export function ImagesAppClient({ images }: ImagesAppClientProps) {
  const router = useRouter()

  const handleImageClick = (imageId: string) => {
    router.push(`/enhance/${imageId}`)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/apps">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Apps
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Image Enhancement</h1>
              </div>
            </div>
            <p className="text-sm text-muted-foreground ml-12">
              Upload and enhance your images with AI-powered quality improvements
            </p>
          </div>
          <TokenBalanceDisplay />
        </div>

        {/* Upload Section */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Upload New Image</h2>
          <ImageUpload />
        </Card>

        {/* Images Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Your Images ({images.length})
            </h2>
          </div>

          {images.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">No images yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload your first image to get started
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => {
                const completedJobs = image.enhancementJobs.filter(
                  (job) => job.status === 'COMPLETED'
                )
                const processingJobs = image.enhancementJobs.filter(
                  (job) => job.status === 'PROCESSING' || job.status === 'PENDING'
                )

                return (
                  <Card
                    key={image.id}
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleImageClick(image.id)}
                  >
                    <div className="relative aspect-square bg-muted">
                      <Image
                        src={image.originalUrl}
                        alt={image.name}
                        fill
                        className="object-cover"
                      />
                      {processingJobs.length > 0 && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                          <Badge variant="secondary">Processing...</Badge>
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <h3 className="font-medium text-sm truncate">{image.name}</h3>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{image.originalWidth}x{image.originalHeight}</span>
                        <Badge variant="outline" className="text-xs">
                          {completedJobs.length} enhanced
                        </Badge>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
