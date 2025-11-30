'use client'

import { useState, useMemo } from 'react'
import { EnhancedImage, ImageEnhancementJob, JobStatus } from '@prisma/client'
import { ImageComparisonSlider } from '@/components/enhance/ImageComparisonSlider'
import { VersionGrid, Version } from '@/components/enhance/VersionGrid'
import { EnhancementSettings } from '@/components/enhance/EnhancementSettings'
import { TokenBalanceDisplay } from '@/components/enhance/TokenBalanceDisplay'
import { ExportButton } from '@/components/enhance/ExportButton'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useJobPolling } from '@/hooks/useJobPolling'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface EnhanceClientProps {
  image: EnhancedImage & {
    enhancementJobs: ImageEnhancementJob[]
  }
}

export function EnhanceClient({ image }: EnhanceClientProps) {
  const router = useRouter()
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [leftVersionId, setLeftVersionId] = useState<string>('original')
  const [rightVersionId, setRightVersionId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { job: activeJob } = useJobPolling(activeJobId)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this image and all its enhancements? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/images/${image.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete image')
      }

      router.push('/apps/images')
    } catch (error) {
      console.error('Error deleting image:', error)
      alert('Failed to delete image. Please try again.')
      setIsDeleting(false)
    }
  }

  const completedJobs = image.enhancementJobs.filter(
    (job) => job.status === JobStatus.COMPLETED
  )

  const hasEnhancedVersions = completedJobs.length > 0

  const versions: Version[] = useMemo(() => {
    const versionList: Version[] = [
      {
        id: 'original',
        url: image.originalUrl,
        width: image.originalWidth,
        height: image.originalHeight,
        label: 'Original',
        isOriginal: true,
      },
    ]

    completedJobs.forEach((job, index) => {
      if (job.enhancedUrl && job.enhancedWidth && job.enhancedHeight) {
        versionList.push({
          id: job.id,
          url: job.enhancedUrl,
          width: job.enhancedWidth,
          height: job.enhancedHeight,
          label: `Enhanced #${completedJobs.length - index}`,
          tier: job.tier,
        })
      }
    })

    return versionList
  }, [image, completedJobs])

  const latestEnhancedVersion = completedJobs[0]

  if (!rightVersionId && latestEnhancedVersion) {
    setRightVersionId(latestEnhancedVersion.id)
  }

  const leftVersion = versions.find((v) => v.id === leftVersionId)
  const rightVersion = versions.find((v) => v.id === rightVersionId)

  const handleEnhancementStart = (jobId: string) => {
    setActiveJobId(jobId)
  }

  const processingJob = image.enhancementJobs.find(
    (job) => job.status === JobStatus.PROCESSING || job.status === JobStatus.PENDING
  )

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/my-apps">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">{image.name}</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Original: {image.originalWidth}x{image.originalHeight} • {completedJobs.length} enhanced version{completedJobs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <TokenBalanceDisplay />
        </div>

        {/* Active Job Status */}
        {(processingJob || activeJob) && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activeJob?.status === JobStatus.COMPLETED ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Enhancement Complete!</p>
                      <p className="text-sm text-muted-foreground">
                        Your enhanced image is ready
                      </p>
                    </div>
                  </>
                ) : activeJob?.status === JobStatus.FAILED ? (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-medium">Enhancement Failed</p>
                      <p className="text-sm text-muted-foreground">
                        {activeJob.errorMessage || 'Unknown error'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <div>
                      <p className="font-medium">Enhancing Image...</p>
                      <p className="text-sm text-muted-foreground">
                        This may take a moment
                      </p>
                    </div>
                  </>
                )}
              </div>
              {activeJob && (
                <Badge variant={
                  activeJob.status === JobStatus.COMPLETED ? 'default' :
                  activeJob.status === JobStatus.FAILED ? 'destructive' :
                  'secondary'
                }>
                  {activeJob.status}
                </Badge>
              )}
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Comparison */}
            {hasEnhancedVersions && leftVersion && rightVersion ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Image Comparison</h2>
                  <ExportButton
                    imageUrl={rightVersion.url}
                    imageName={`enhanced-${image.name}`}
                  />
                </div>
                <ImageComparisonSlider
                  leftImage={leftVersion}
                  rightImage={rightVersion}
                  isLoading={!!activeJob && (activeJob.status === JobStatus.PROCESSING || activeJob.status === JobStatus.PENDING)}
                  loadingProgress={50}
                />
              </div>
            ) : (
              <Card className="p-12 text-center">
                <div className="space-y-4">
                  <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                    <Loader2 className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">No Enhanced Versions Yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Use the enhancement settings to create your first enhanced version
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Version Selection */}
            {hasEnhancedVersions && (
              <Tabs defaultValue="left" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="left">Left Side</TabsTrigger>
                  <TabsTrigger value="right">Right Side</TabsTrigger>
                </TabsList>
                <TabsContent value="left" className="space-y-4">
                  <VersionGrid
                    versions={versions}
                    selectedVersionId={leftVersionId}
                    onSelectVersion={setLeftVersionId}
                    side="left"
                  />
                </TabsContent>
                <TabsContent value="right" className="space-y-4">
                  <VersionGrid
                    versions={versions}
                    selectedVersionId={rightVersionId}
                    onSelectVersion={setRightVersionId}
                    side="right"
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <EnhancementSettings
              imageId={image.id}
              onEnhancementStart={handleEnhancementStart}
              disabled={!!processingJob || !!activeJob}
            />

            {/* Original Image Info */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Original Image</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensions</span>
                  <span className="font-medium">
                    {image.originalWidth}x{image.originalHeight}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-medium uppercase">{image.originalFormat}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size</span>
                  <span className="font-medium">
                    {(image.originalSizeBytes / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
            </Card>

            {/* Delete Image */}
            <Card className="p-4 border-destructive/50">
              <h3 className="font-semibold mb-2 text-destructive">Danger Zone</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Delete this image and all its enhancements permanently
              </p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete Image'}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
