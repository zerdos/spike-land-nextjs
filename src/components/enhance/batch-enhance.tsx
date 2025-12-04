"use client"

import { useState, useCallback } from "react"
import { Sparkles, Loader2, CheckCircle, XCircle, AlertTriangle, Coins } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { EnhancementTier } from "@prisma/client"

const TIER_INFO = {
  TIER_1K: { label: "1K (1024px)", cost: 2, description: "Fast, good for previews" },
  TIER_2K: { label: "2K (2048px)", cost: 5, description: "Balanced quality and speed" },
  TIER_4K: { label: "4K (4096px)", cost: 10, description: "Maximum quality" },
}

interface ImageToEnhance {
  id: string
  name: string
  url: string
  status: 'pending' | 'enhancing' | 'completed' | 'error'
  jobId?: string
  error?: string
}

interface BatchEnhanceProps {
  images: Array<{ id: string; name: string; url: string }>
  currentBalance: number
  onEnhanceComplete?: () => void
  onBalanceRefresh?: () => void
}

export function BatchEnhance({
  images,
  currentBalance,
  onEnhanceComplete,
  onBalanceRefresh,
}: BatchEnhanceProps) {
  const [selectedTier, setSelectedTier] = useState<EnhancementTier>("TIER_2K")
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [enhancingImages, setEnhancingImages] = useState<ImageToEnhance[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const tierCost = TIER_INFO[selectedTier].cost
  const totalCost = selectedImages.size * tierCost
  const hasEnoughTokens = currentBalance >= totalCost

  const toggleImageSelection = useCallback((imageId: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev)
      if (next.has(imageId)) {
        next.delete(imageId)
      } else {
        next.add(imageId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedImages(new Set(images.map((img) => img.id)))
  }, [images])

  const deselectAll = useCallback(() => {
    setSelectedImages(new Set())
  }, [])

  const startBatchEnhancement = useCallback(async () => {
    if (selectedImages.size === 0 || !hasEnoughTokens) {
      return
    }

    setIsProcessing(true)

    // Initialize enhancing images with pending status
    const imagesToEnhance: ImageToEnhance[] = Array.from(selectedImages).map((imageId) => {
      const image = images.find((img) => img.id === imageId)!
      return {
        id: imageId,
        name: image.name,
        url: image.url,
        status: 'pending' as const,
      }
    })

    setEnhancingImages(imagesToEnhance)

    try {
      // Call batch enhancement API
      const response = await fetch('/api/images/batch-enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageIds: Array.from(selectedImages),
          tier: selectedTier,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Batch enhancement failed')
      }

      const data = await response.json()

      // Update statuses with job IDs
      setEnhancingImages((prev) =>
        prev.map((img) => {
          const result = data.results?.find((r: { imageId: string }) => r.imageId === img.id)
          if (result) {
            return {
              ...img,
              status: result.success ? 'enhancing' as const : 'error' as const,
              jobId: result.jobId,
              error: result.error,
            }
          }
          return img
        })
      )

      // Refresh balance
      if (onBalanceRefresh) {
        onBalanceRefresh()
      }

      // Poll for completion
      const successfulJobs = data.results?.filter((r: { success: boolean }) => r.success) || []
      if (successfulJobs.length > 0) {
        pollJobStatuses(successfulJobs.map((r: { jobId: string }) => r.jobId))
      }
    } catch (error) {
      // Mark all as error
      setEnhancingImages((prev) =>
        prev.map((img) => ({
          ...img,
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Enhancement failed',
        }))
      )
      setIsProcessing(false)
    }
  }, [selectedImages, selectedTier, hasEnoughTokens, images, onBalanceRefresh])

  const pollJobStatuses = useCallback(async (jobIds: string[]) => {
    // Exponential backoff configuration
    const initialInterval = 2000 // Start at 2 seconds
    const maxInterval = 10000 // Cap at 10 seconds
    const backoffMultiplier = 1.5 // Increase by 50% each time
    const maxAttempts = 60 // Maximum polling attempts

    let attempts = 0
    let currentInterval = initialInterval

    const poll = async () => {
      attempts++

      try {
        // Check status of all jobs
        const statusChecks = await Promise.all(
          jobIds.map(async (jobId) => {
            const response = await fetch(`/api/images/jobs/${jobId}`)
            if (!response.ok) {
              return { jobId, status: 'FAILED', error: 'Failed to fetch status' }
            }
            const data = await response.json()
            return { jobId, status: data.status, error: data.errorMessage }
          })
        )

        // Update statuses
        setEnhancingImages((prev) =>
          prev.map((img) => {
            const statusCheck = statusChecks.find((s) => s.jobId === img.jobId)
            if (statusCheck) {
              if (statusCheck.status === 'COMPLETED') {
                return { ...img, status: 'completed' as const }
              } else if (statusCheck.status === 'FAILED') {
                return { ...img, status: 'error' as const, error: statusCheck.error }
              }
            }
            return img
          })
        )

        // Check if all jobs are complete
        const allComplete = statusChecks.every(
          (s) => s.status === 'COMPLETED' || s.status === 'FAILED'
        )

        if (allComplete || attempts >= maxAttempts) {
          setIsProcessing(false)
          if (onEnhanceComplete) {
            onEnhanceComplete()
          }
        } else {
          // Apply exponential backoff with cap
          currentInterval = Math.min(currentInterval * backoffMultiplier, maxInterval)
          setTimeout(poll, currentInterval)
        }
      } catch (error) {
        console.error('Error polling job statuses:', error)
        setIsProcessing(false)
      }
    }

    poll()
  }, [onEnhanceComplete])

  const clearCompleted = useCallback(() => {
    setEnhancingImages((prev) => prev.filter((img) => img.status !== 'completed'))
  }, [])

  const clearAll = useCallback(() => {
    setEnhancingImages([])
    setSelectedImages(new Set())
  }, [])

  const pendingCount = enhancingImages.filter((img) => img.status === 'pending').length
  const enhancingCount = enhancingImages.filter((img) => img.status === 'enhancing').length
  const completedCount = enhancingImages.filter((img) => img.status === 'completed').length
  const errorCount = enhancingImages.filter((img) => img.status === 'error').length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Enhancement</CardTitle>
        <CardDescription>
          Select multiple images and enhance them all at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium">Your Balance</span>
          </div>
          <span className="text-lg font-bold">{currentBalance} tokens</span>
        </div>

        {/* Tier Selection */}
        <div className="space-y-2">
          <Label>Enhancement Tier</Label>
          <RadioGroup
            value={selectedTier}
            onValueChange={(value) => setSelectedTier(value as EnhancementTier)}
            disabled={isProcessing}
          >
            {(Object.keys(TIER_INFO) as EnhancementTier[]).map((tier) => {
              const info = TIER_INFO[tier]
              return (
                <div key={tier} className="flex items-center space-x-2">
                  <RadioGroupItem value={tier} id={`batch-${tier}`} />
                  <Label htmlFor={`batch-${tier}`} className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{info.label}</p>
                        <p className="text-sm text-muted-foreground">{info.description}</p>
                      </div>
                      <p className="text-sm font-medium">{info.cost} tokens</p>
                    </div>
                  </Label>
                </div>
              )
            })}
          </RadioGroup>
        </div>

        {/* Image Selection */}
        {images.length > 0 && enhancingImages.length === 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Images</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} disabled={isProcessing}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll} disabled={isProcessing}>
                  Deselect All
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {images.map((image) => {
                const isSelected = selectedImages.has(image.id)
                return (
                  <div
                    key={image.id}
                    onClick={() => !isProcessing && toggleImageSelection(image.id)}
                    className={`
                      relative cursor-pointer rounded-lg border-2 transition-all overflow-hidden
                      ${isSelected ? 'border-primary' : 'border-transparent'}
                      ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
                    `}
                  >
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-24 object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-primary" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                      {image.name}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Cost Summary */}
        {selectedImages.size > 0 && enhancingImages.length === 0 && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Selected Images:</span>
              <span className="font-medium">{selectedImages.size}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Cost per Image:</span>
              <span className="font-medium">{tierCost} tokens</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Total Cost:</span>
              <span>{totalCost} tokens</span>
            </div>
            {!hasEnoughTokens && (
              <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">
                  Insufficient tokens. You need {totalCost} but only have {currentBalance}.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Enhancement Progress */}
        {enhancingImages.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="secondary">{enhancingImages.length} images</Badge>
              {pendingCount > 0 && <Badge variant="outline">{pendingCount} pending</Badge>}
              {enhancingCount > 0 && <Badge variant="default">{enhancingCount} enhancing</Badge>}
              {completedCount > 0 && <Badge variant="default" className="bg-green-500">{completedCount} completed</Badge>}
              {errorCount > 0 && <Badge variant="destructive">{errorCount} failed</Badge>}
            </div>

            {/* Overall Progress */}
            {isProcessing && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Overall Progress</span>
                  <span>{Math.round((completedCount + errorCount) / enhancingImages.length * 100)}%</span>
                </div>
                <Progress
                  value={(completedCount + errorCount) / enhancingImages.length * 100}
                  className="h-2"
                />
              </div>
            )}

            {/* Image List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {enhancingImages.map((image) => (
                <div key={image.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="relative w-12 h-12 flex-shrink-0 bg-muted rounded overflow-hidden">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{image.name}</p>
                    {image.error && (
                      <p className="text-xs text-destructive mt-1">{image.error}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {image.status === 'pending' && (
                      <Badge variant="outline">Pending</Badge>
                    )}
                    {image.status === 'enhancing' && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {image.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {image.status === 'error' && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {enhancingImages.length === 0 ? (
            <Button
              onClick={startBatchEnhancement}
              disabled={isProcessing || selectedImages.size === 0 || !hasEnoughTokens}
              className="flex-1"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Enhance {selectedImages.size} Image{selectedImages.size !== 1 ? 's' : ''} ({totalCost} tokens)
            </Button>
          ) : (
            <>
              {!isProcessing && completedCount > 0 && (
                <Button variant="outline" onClick={clearCompleted} className="flex-1">
                  Clear Completed
                </Button>
              )}
              {!isProcessing && (
                <Button variant="outline" onClick={clearAll} className="flex-1">
                  Clear All
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
