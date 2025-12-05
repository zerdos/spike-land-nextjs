"use client";

import { EnhancementSettings } from "@/components/enhance/EnhancementSettings";
import { ExportSelector } from "@/components/enhance/export-selector";
import { ImageComparisonSlider } from "@/components/enhance/ImageComparisonSlider";
import { TokenBalanceDisplay } from "@/components/enhance/TokenBalanceDisplay";
import { VersionGrid } from "@/components/enhance/VersionGrid";
import { PurchaseModal } from "@/components/tokens";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJobPolling } from "@/hooks/useJobPolling";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import type { EnhancedImage, ImageEnhancementJob } from "@prisma/client";
import { AlertTriangle, ArrowLeft, Coins } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type EnhancementTier = "TIER_1K" | "TIER_2K" | "TIER_4K";

interface EnhanceClientProps {
  image: EnhancedImage & {
    enhancementJobs: ImageEnhancementJob[];
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

  const router = useRouter();
  const searchParams = useSearchParams();
  const { balance, isLowBalance, refetch: refetchBalance } = useTokenBalance({
    autoRefreshOnFocus: true,
  });

  // Refresh balance when returning from successful Stripe checkout
  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "true") {
      refetchBalance();
      // Clean up URL without triggering navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams, refetchBalance]);

  // Poll for active job completion
  type ImageWithJobs = EnhancedImage & { enhancementJobs: ImageEnhancementJob[]; };
  useJobPolling({
    jobId: activeJobId,
    onComplete: useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (completedJob: any) => {
        // Update the image with the completed job
        setImage((prev: ImageWithJobs) => ({
          ...prev,
          enhancementJobs: prev.enhancementJobs.map((job: ImageEnhancementJob) =>
            job.id === completedJob.id
              ? { ...job, ...completedJob, status: "COMPLETED" as const }
              : job
          ),
        }));
        setActiveJobId(null);
        setSelectedVersionId(completedJob.id);
        refetchBalance();
      },
      [refetchBalance],
    ),
    onError: useCallback((errorMessage?: string) => {
      console.error("Enhancement failed:", errorMessage);
      setActiveJobId(null);
      alert(`Enhancement failed: ${errorMessage || "Unknown error"}`);
    }, []),
  });

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
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Enhancement failed");
      }

      const result = await response.json();

      // Add the new job to the list
      const newJob: ImageEnhancementJob = {
        id: result.jobId,
        userId: image.userId,
        imageId: image.id,
        tier,
        status: "PROCESSING",
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
        createdAt: new Date(),
        updatedAt: new Date(),
        processingStartedAt: null,
        processingCompletedAt: null,
      };

      setImage((prev: ImageWithJobs) => ({
        ...prev,
        enhancementJobs: [newJob, ...prev.enhancementJobs],
      }));

      setActiveJobId(result.jobId);
      refetchBalance();
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

    // Update local state
    setImage((prev: ImageWithJobs) => ({
      ...prev,
      enhancementJobs: prev.enhancementJobs.map((job: ImageEnhancementJob) =>
        job.id === jobId ? { ...job, status: "CANCELLED" as const } : job
      ),
    }));

    // Refetch balance to show refunded tokens
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

    // Remove job from local state
    setImage((prev: ImageWithJobs) => ({
      ...prev,
      enhancementJobs: prev.enhancementJobs.filter(
        (job: ImageEnhancementJob) => job.id !== jobId,
      ),
    }));

    // Clear selected version if it was deleted
    if (selectedVersionId === jobId) {
      setSelectedVersionId(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Low Balance Banner */}
      {isLowBalance && (
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
          onClick={() => router.push("/enhance")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Images
        </Button>

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Image Enhancement</h1>
          <TokenBalanceDisplay />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Image comparison */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedVersion ? "Before & After Comparison" : "Original Image"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedVersion && selectedVersion.enhancedUrl
                ? (
                  <ImageComparisonSlider
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

          {/* Enhancement versions grid */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Enhancement Versions</CardTitle>
            </CardHeader>
            <CardContent>
              <VersionGrid
                versions={image.enhancementJobs.map((job: ImageEnhancementJob) => ({
                  id: job.id,
                  tier: job.tier,
                  enhancedUrl: job.enhancedUrl || "",
                  width: job.enhancedWidth || 0,
                  height: job.enhancedHeight || 0,
                  createdAt: job.createdAt,
                  status: job.status,
                }))}
                selectedVersionId={selectedVersionId || undefined}
                onVersionSelect={setSelectedVersionId}
                onJobCancel={handleJobCancel}
                onJobDelete={handleJobDelete}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column: Enhancement settings and export */}
        <div className="space-y-6">
          <EnhancementSettings
            onEnhance={handleEnhance}
            currentBalance={balance}
            isProcessing={activeJobId !== null}
            completedVersions={completedVersions.map((job: ImageEnhancementJob) => ({
              tier: job.tier,
              url: job.enhancedUrl || "",
            }))}
            onBalanceRefresh={refetchBalance}
          />

          {/* Export selector - only show when a version is selected */}
          {selectedVersion && selectedVersion.enhancedUrl && (
            <ExportSelector
              imageId={selectedVersion.id}
              fileName={image.name}
              originalSizeBytes={selectedVersion.enhancedSizeBytes || undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
