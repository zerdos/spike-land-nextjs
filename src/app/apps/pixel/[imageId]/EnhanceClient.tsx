"use client";

import { ComparisonViewToggle } from "@/components/enhance/ComparisonViewToggle";
import {
  type BlendImageData,
  DroppableEnhanceZone,
} from "@/components/enhance/DroppableEnhanceZone";
import { EnhancementHistoryGrid } from "@/components/enhance/EnhancementHistoryGrid";
import { EnhancementSettings } from "@/components/enhance/EnhancementSettings";
import { ExportSelector } from "@/components/enhance/export-selector";
import { ShareButton } from "@/components/enhance/ShareButton";
import { PurchaseModal } from "@/components/tokens";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useInterval } from "@/hooks/useInterval";
import { useJobStream } from "@/hooks/useJobStream";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import type { EnhancedImage, ImageEnhancementJob } from "@prisma/client";
import type { EnhancementTier } from "@prisma/client";
import { AlertTriangle, ArrowLeft, Coins, ExternalLink, Layers } from "lucide-react";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface EnhanceClientProps {
  image: EnhancedImage & {
    enhancementJobs: (ImageEnhancementJob & {
      sourceImage?: {
        id: string;
        originalUrl: string;
        name: string;
      } | null;
    })[];
  };
}

export function EnhanceClient({ image: initialImage }: EnhanceClientProps) {
  const [image, setImage] = useState(initialImage);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    initialImage.enhancementJobs.find((job: ImageEnhancementJob) => job.status === "COMPLETED")
      ?.id || null,
  );
  const [activeJobId, setActiveJobId] = useState<string | null>(
    initialImage.enhancementJobs.find(
      (job: ImageEnhancementJob) => job.status === "PROCESSING" || job.status === "PENDING",
    )?.id || null,
  );

  // Blend mode state (file upload - not stored)
  const [blendImageData, setBlendImageData] = useState<BlendImageData | null>(
    null,
  );
  const [showBlendDialog, setShowBlendDialog] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { balance, isLowBalance, isLoading, refetch: refetchBalance } = useTokenBalance({
    autoRefreshOnFocus: true,
  });

  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "true") {
      refetchBalance();
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams, refetchBalance]);

  type ImageWithJobs = EnhancedImage & {
    enhancementJobs: ImageEnhancementJob[];
  };

  // Update image state when props change (e.g. after router.refresh())
  // This ensures specific job updates from server are reflected in UI
  useEffect(() => {
    // We only merge if we're not currently streaming an active job to avoid overwriting smooth progress
    // Or strictly sync: server is source of truth, except for currentStage which might be transient
    // Let's merge: take server jobs, but preserve currentStage from local state if active
    setImage((prev) => {
      // If no change in ID/updatedAt, maybe skip? But let's be safe and sync.
      // Actually, we want to respect optimistic updates too.
      // But router.refresh() returns confirmed data.
      return {
        ...initialImage,
        enhancementJobs: initialImage.enhancementJobs.map(serverJob => {
          const localJob = prev.enhancementJobs.find(j => j.id === serverJob.id);
          // Preserve currentStage from local state if it exists and status is still processing
          if (
            localJob?.currentStage &&
            (serverJob.status === "PROCESSING" || serverJob.status === "PENDING")
          ) {
            return { ...serverJob, currentStage: localJob.currentStage };
          }
          return serverJob;
        }),
      };
    });
  }, [initialImage]);

  // Use SSE for real-time job status updates (replaces polling)
  const { job: streamJob } = useJobStream({
    jobId: activeJobId,
    onComplete: useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (completedJob: any) => {
        // SSE complete - update local state immediately
        setImage((prev: ImageWithJobs) => ({
          ...prev,
          enhancementJobs: prev.enhancementJobs.map((
            job: ImageEnhancementJob,
          ) =>
            job.id === completedJob.id
              ? {
                ...job,
                status: "COMPLETED" as const,
                currentStage: null,
                enhancedUrl: completedJob.enhancedUrl,
                enhancedWidth: completedJob.enhancedWidth,
                enhancedHeight: completedJob.enhancedHeight,
              }
              : job
          ),
        }));
        setActiveJobId(null);
        setSelectedVersionId(completedJob.id);
        refetchBalance();
        // Trigger server refresh to ensure consistency
        router.refresh();
      },
      [refetchBalance, router],
    ),
    onError: useCallback((errorMessage?: string) => {
      console.error("Enhancement failed:", errorMessage);
      setActiveJobId(null);
      alert(`Enhancement failed: ${errorMessage || "Unknown error"}`);
    }, []),
  });

  // Update image state when stream job updates (for currentStage tracking)
  useEffect(() => {
    if (streamJob && activeJobId) {
      setImage((prev: ImageWithJobs) => ({
        ...prev,
        enhancementJobs: prev.enhancementJobs.map((job: ImageEnhancementJob) =>
          job.id === activeJobId
            ? {
              ...job,
              currentStage: streamJob.currentStage,
            }
            : job
        ),
      }));
    }
  }, [streamJob, activeJobId]);

  // Poll for updates if ANY job is processing
  // This handles parallel jobs that aren't the "active" one being streamed
  const hasProcessingJobs = image.enhancementJobs.some(
    j => j.status === "PROCESSING" || j.status === "PENDING",
  );

  useInterval(() => {
    // Only refresh if we have processing jobs
    if (hasProcessingJobs) {
      router.refresh();
    }
  }, hasProcessingJobs ? 3000 : null);

  // Handle image drop for blending (file upload)
  const handleImageDrop = useCallback(
    (imageData: BlendImageData) => {
      setBlendImageData(imageData);
      // Don't show dialog - auto-enhance will handle it
    },
    [],
  );

  // Auto-enhance on drop with TIER_1K (2 tokens)
  const handleAutoEnhance = useCallback(
    async (imageData: BlendImageData) => {
      // Set blend data first
      setBlendImageData(imageData);

      try {
        const response = await fetch("/api/images/enhance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageId: image.id,
            tier: "TIER_1K", // Always use 2 tokens for drag-drop enhancement
            blendSource: {
              base64: imageData.base64,
              mimeType: imageData.mimeType,
            },
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Enhancement failed");
        }

        const result = await response.json();

        const newJob: ImageEnhancementJob = {
          id: result.jobId,
          userId: image.userId,
          imageId: image.id,
          tier: "TIER_1K",
          status: "PROCESSING",
          currentStage: null,
          tokensCost: result.tokensCost || 2,
          enhancedUrl: null,
          enhancedR2Key: null,
          enhancedWidth: null,
          enhancedHeight: null,
          enhancedSizeBytes: null,
          errorMessage: null,
          retryCount: 0,
          maxRetries: 3,
          geminiPrompt: null,
          geminiModel: null,
          geminiTemp: null,
          workflowRunId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          processingStartedAt: null,
          processingCompletedAt: null,
          analysisResult: null,
          analysisSource: null,
          wasCropped: false,
          cropDimensions: null,
          pipelineId: null,
          sourceImageId: null,
          isBlend: true, // Auto-enhance is always a blend (file upload)
          isAnonymous: false, // This is an authenticated user's job
        };

        setImage((prev: ImageWithJobs) => ({
          ...prev,
          enhancementJobs: [newJob, ...prev.enhancementJobs],
        }));

        setActiveJobId(result.jobId);
        refetchBalance();

        // Reset blend state after triggering enhancement
        setBlendImageData(null);
      } catch (error) {
        console.error("Auto-enhancement request failed:", error);
        alert(error instanceof Error ? error.message : "Enhancement failed");
        setBlendImageData(null);
      }
    },
    [image.id, image.userId, refetchBalance],
  );

  const handleEnhance = async (tier: EnhancementTier) => {
    try {
      const response = await fetch("/api/images/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageId: image.id,
          tier,
          // For blend enhancement: pass base64 image data (not stored)
          blendSource: blendImageData
            ? {
              base64: blendImageData.base64,
              mimeType: blendImageData.mimeType,
            }
            : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Enhancement failed");
      }

      const result = await response.json();

      const newJob: ImageEnhancementJob = {
        id: result.jobId,
        userId: image.userId,
        imageId: image.id,
        tier,
        status: "PROCESSING",
        currentStage: null,
        tokensCost: result.tokensCost || 0,
        enhancedUrl: null,
        enhancedR2Key: null,
        enhancedWidth: null,
        enhancedHeight: null,
        enhancedSizeBytes: null,
        errorMessage: null,
        retryCount: 0,
        maxRetries: 3,
        geminiPrompt: null,
        geminiModel: null,
        geminiTemp: null,
        workflowRunId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        processingStartedAt: null,
        processingCompletedAt: null,
        // Analysis and cropping fields (new in 4-stage pipeline)
        analysisResult: null,
        analysisSource: null,
        wasCropped: false,
        cropDimensions: null,
        // Pipeline reference
        pipelineId: null,
        // Blend source (file upload - not stored, no sourceImageId)
        sourceImageId: null,
        // Track blend jobs
        isBlend: !!blendImageData,
        isAnonymous: false, // This is an authenticated user's job
      };

      setImage((prev: ImageWithJobs) => ({
        ...prev,
        enhancementJobs: [newJob, ...prev.enhancementJobs],
      }));

      setActiveJobId(result.jobId);
      refetchBalance();

      // Reset blend state after triggering enhancement
      setBlendImageData(null);
      setShowBlendDialog(false);
    } catch (error) {
      console.error("Enhancement request failed:", error);
      alert(error instanceof Error ? error.message : "Enhancement failed");
    }
  };

  const selectedVersion = selectedVersionId
    ? image.enhancementJobs.find((job: ImageEnhancementJob) => job.id === selectedVersionId)
    : null;

  const completedVersions = image.enhancementJobs.filter(
    (job: ImageEnhancementJob) => job.status === "COMPLETED" && job.enhancedUrl,
  );

  const handleJobCancel = async (jobId: string) => {
    const response = await fetch(`/api/jobs/${jobId}/cancel`, {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to cancel job");
    }

    // Remove the cancelled job from the UI (since users don't see cancelled jobs)
    setImage((prev: ImageWithJobs) => ({
      ...prev,
      enhancementJobs: prev.enhancementJobs.filter(
        (job: ImageEnhancementJob) => job.id !== jobId,
      ),
    }));

    refetchBalance();
  };

  const handleJobDelete = async (jobId: string) => {
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete job");
    }

    setImage((prev: ImageWithJobs) => ({
      ...prev,
      enhancementJobs: prev.enhancementJobs.filter(
        (job: ImageEnhancementJob) => job.id !== jobId,
      ),
    }));

    if (selectedVersionId === jobId) {
      setSelectedVersionId(null);
    }
  };

  return (
    <div className="container mx-auto pt-24 pb-8 px-4">
      {!isLoading && isLowBalance && (
        <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">
              Your token balance is running low ({balance} tokens remaining).
            </span>
            <PurchaseModal
              trigger={
                <Button size="sm" variant="outline" className="ml-4">
                  <Coins className="mr-2 h-4 w-4" />
                  Get Tokens
                </Button>
              }
              onPurchaseComplete={refetchBalance}
            />
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const from = searchParams.get("from");
            // Priority 1: Use explicit referrer from URL (most reliable)
            // Security: only allow internal paths starting with /
            if (from && from.startsWith("/")) {
              router.push(from);
            } else if (
              typeof window !== "undefined" && window.history.state?.idx > 0
            ) {
              // Priority 2: Use browser history if available
              router.back();
            } else {
              // Priority 3: Fallback to main pixel page
              router.push("/apps/pixel");
            }
          }}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <h1 className="text-3xl font-bold">Pixel Image Enhancement</h1>
      </div>

      {/* Blend tip */}
      <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 shrink-0" />
          <span>
            <strong>Tip:</strong>{" "}
            Drag a photo from your computer and drop it here to create a blended enhancement
          </span>
        </p>
      </div>

      <DroppableEnhanceZone
        onImageDrop={handleImageDrop}
        onAutoEnhance={handleAutoEnhance}
        disabled={activeJobId !== null}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left Column - Main Content */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedVersion
                    ? "Before & After Comparison"
                    : "Original Image"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedVersion && selectedVersion.enhancedUrl
                  ? (
                    <ComparisonViewToggle
                      originalUrl={image.originalUrl}
                      enhancedUrl={selectedVersion.enhancedUrl}
                      width={image.originalWidth || 1024}
                      height={image.originalHeight || 1024}
                    />
                  )
                  : (
                    <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                      <Image
                        src={image.originalUrl}
                        alt="Original image"
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Enhancement History</CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancementHistoryGrid
                  versions={image.enhancementJobs.map((job) => ({
                    id: job.id,
                    tier: job.tier,
                    enhancedUrl: job.enhancedUrl || "",
                    width: job.enhancedWidth || 0,
                    height: job.enhancedHeight || 0,
                    createdAt: job.createdAt,
                    status: job.status,
                    currentStage: job.currentStage,
                    sizeBytes: job.enhancedSizeBytes,
                    sourceImageId: job.sourceImageId,
                    isBlend: job.isBlend,
                    sourceImage: job.sourceImage
                      ? {
                        id: job.sourceImage.id,
                        url: job.sourceImage.originalUrl,
                        name: job.sourceImage.name,
                      }
                      : null,
                  }))}
                  selectedVersionId={selectedVersionId || undefined}
                  onVersionSelect={setSelectedVersionId}
                  onJobCancel={handleJobCancel}
                  onJobDelete={handleJobDelete}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div>
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Balance Display */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Coins className="h-5 w-5 text-yellow-500" />
                    Your Balance
                  </span>
                  <span className="text-lg font-bold">
                    {isLoading ? "..." : `${balance} tokens`}
                  </span>
                </div>

                <Separator />

                {/* Enhancement Settings */}
                <EnhancementSettings
                  onEnhance={handleEnhance}
                  currentBalance={balance}
                  isProcessing={activeJobId !== null}
                  completedVersions={completedVersions.map((
                    job: ImageEnhancementJob,
                  ) => ({
                    tier: job.tier,
                    url: job.enhancedUrl || "",
                  }))}
                  onBalanceRefresh={refetchBalance}
                  asCard={false}
                />

                <Separator />

                {/* Actions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Actions</h3>
                  {selectedVersion && selectedVersion.enhancedUrl && (
                    <ExportSelector
                      imageId={selectedVersion.id}
                      fileName={image.name}
                      originalSizeBytes={selectedVersion.enhancedSizeBytes ||
                        undefined}
                    />
                  )}
                  {/* Only show Share when there's a successful enhancement */}
                  {selectedVersion && selectedVersion.enhancedUrl && (
                    <ShareButton
                      imageId={image.id}
                      shareToken={image.shareToken}
                      imageName={image.name}
                      className="w-full"
                    />
                  )}
                  {/* Show View Mix Details button for blend jobs */}
                  {selectedVersion && (selectedVersion.isBlend || selectedVersion.sourceImageId) &&
                    (
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/apps/pixel/mix/${selectedVersion.id}`)}
                        className="w-full"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Mix Details
                      </Button>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DroppableEnhanceZone>

      {/* Blend Enhancement Dialog */}
      {blendImageData && (
        <EnhancementSettings
          open={showBlendDialog}
          onOpenChange={(open) => {
            setShowBlendDialog(open);
            if (!open) {
              setBlendImageData(null);
            }
          }}
          onEnhance={handleEnhance}
          currentBalance={balance}
          isProcessing={activeJobId !== null}
          completedVersions={completedVersions.map((
            job: ImageEnhancementJob,
          ) => ({
            tier: job.tier,
            url: job.enhancedUrl || "",
          }))}
          onBalanceRefresh={refetchBalance}
          imageUrl={image.originalUrl}
          imageName={`Blend: ${image.name} + ${blendImageData.fileName}`}
          trigger={null}
        />
      )}
    </div>
  );
}
