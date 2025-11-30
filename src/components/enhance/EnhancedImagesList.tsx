'use client'

import Link from 'next/link'
import Image from 'next/image'
import { EnhancedImage, ImageEnhancementJob } from '@prisma/client'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, Sparkles } from 'lucide-react'

interface EnhancedImagesListProps {
  images: (EnhancedImage & {
    enhancementJobs: ImageEnhancementJob[]
  })[]
}

export function EnhancedImagesList({ images }: EnhancedImagesListProps) {
  if (images.length === 0) {
    return null
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((image) => {
        const completedJobs = image.enhancementJobs.filter(
          (job) => job.status === 'COMPLETED'
        )

        return (
          <Card key={image.id} className="flex flex-col overflow-hidden">
            <div className="relative aspect-square">
              <Image
                src={image.originalUrl}
                alt={image.name}
                fill
                className="object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle className="text-lg truncate">{image.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Dimensions:</span>{' '}
                {image.originalWidth}x{image.originalHeight}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {completedJobs.length} enhanced
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Uploaded {new Date(image.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/enhance/${image.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View & Enhance
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
