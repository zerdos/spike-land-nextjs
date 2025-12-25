"use client";

import { ComparisonViewToggle } from "@/components/enhance/ComparisonViewToggle";
import { MixShareQRCode } from "@/components/mix/MixShareQRCode";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EnhancementTier, JobStatus } from "@prisma/client";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  ExternalLink,
  Loader2,
  LogIn,
  Sparkles,
} from "lucide-react";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ParentImage {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
}

interface MixJob {
  id: string;
  status: JobStatus;
  tier: EnhancementTier;
  resultUrl: string | null;
  resultWidth: number | null;
  resultHeight: number | null;
  createdAt: string;
  targetImage: ParentImage;
  sourceImage: ParentImage | null;
}

interface MixDetailClientProps {
  job: MixJob;
  /** Whether this job was created by an anonymous user */
  isAnonymousJob?: boolean;
  /** Whether the current user owns this job */
  isOwner?: boolean;
  /** Whether the current user is authenticated */
  isAuthenticated?: boolean;
}

type ComparisonParent = "parent1" | "parent2";

const tierLabels: Record<EnhancementTier, string> = {
  FREE: "Free",
  TIER_1K: "1K",
  TIER_2K: "2K",
  TIER_4K: "4K",
};

export function MixDetailClient({
  job,
  isAnonymousJob = false,
  isOwner = true,
  isAuthenticated = true,
}: MixDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeParent, setActiveParent] = useState<ComparisonParent>("parent1");
  const [shareUrl, setShareUrl] = useState(
    `https://spike.land/apps/pixel/mix/${job.id}`,
  );

  // Update shareUrl after hydration to use actual URL
  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  const handleBack = useCallback(() => {
    const from = searchParams.get("from");
    // Validate: must start with "/" but NOT "//" (protocol-relative URL)
    if (from && from.startsWith("/") && !from.startsWith("//")) {
      router.push(from);
    } else if (typeof window !== "undefined" && window.history.state?.idx > 0) {
      router.back();
    } else {
      router.push("/apps/pixel/mix");
    }
  }, [router, searchParams]);

  const handleDownload = useCallback(async () => {
    if (!job.resultUrl) return;

    try {
      const response = await fetch(`/api/jobs/${job.id}/download`);

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `mix-${job.id}.jpg`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/);
        if (match?.[1]) {
          filename = match[1];
        }
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download image. Please try again.");
    }
  }, [job.resultUrl, job.id]);

  const handleViewParent = useCallback(
    (imageId: string) => {
      router.push(`/apps/pixel/${imageId}?from=/apps/pixel/mix/${job.id}`);
    },
    [router, job.id],
  );

  // Get the current comparison images based on active parent
  const getCurrentComparison = () => {
    if (activeParent === "parent1") {
      return {
        originalUrl: job.targetImage.url,
        originalLabel: "Photo 1",
        width: job.targetImage.width,
        height: job.targetImage.height,
      };
    } else if (job.sourceImage) {
      return {
        originalUrl: job.sourceImage.url,
        originalLabel: "Photo 2",
        width: job.sourceImage.width,
        height: job.sourceImage.height,
      };
    }
    // Fallback to parent1 if no sourceImage
    return {
      originalUrl: job.targetImage.url,
      originalLabel: "Photo 1",
      width: job.targetImage.width,
      height: job.targetImage.height,
    };
  };

  const comparison = getCurrentComparison();

  // Calculate thumbnail dimensions preserving aspect ratio with max 64px
  const getThumbnailDimensions = (width: number, height: number) => {
    const maxSize = 64;
    if (width >= height) {
      return { width: maxSize, height: Math.round((height / width) * maxSize) };
    }
    return { width: Math.round((width / height) * maxSize), height: maxSize };
  };

  const isCompleted = job.status === "COMPLETED" && job.resultUrl;
  const isProcessing = job.status === "PROCESSING" || job.status === "PENDING";

  return (
    <div className="container mx-auto pt-24 pb-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Sign-in prompt for unauthenticated users */}
      {!isAuthenticated && (
        <Alert className="mb-6 border-blue-500/50 bg-blue-500/10">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">
              Love this mix? Sign in to create your own and save them forever!
            </span>
            <Button
              size="sm"
              variant="outline"
              className="ml-4"
              onClick={() => router.push("/auth/signin")}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left Column - Main Content */}
        <div className="space-y-6">
          {/* Comparison View */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-end">
                {/* Parent Toggle */}
                {job.sourceImage && (
                  <Tabs
                    value={activeParent}
                    onValueChange={(v) => setActiveParent(v as ComparisonParent)}
                  >
                    <TabsList className="h-auto p-1">
                      <TabsTrigger value="parent1" className="flex items-center gap-2 px-3 py-2">
                        <Image
                          src={job.targetImage.url}
                          alt="Photo 1"
                          width={getThumbnailDimensions(
                            job.targetImage.width,
                            job.targetImage.height,
                          ).width}
                          height={getThumbnailDimensions(
                            job.targetImage.width,
                            job.targetImage.height,
                          ).height}
                          className="rounded-sm object-contain"
                        />
                        <ArrowRight className="h-4 w-4 flex-shrink-0" />
                        {job.resultUrl && job.resultWidth && job.resultHeight
                          ? (
                            <Image
                              src={job.resultUrl}
                              alt="Result"
                              width={getThumbnailDimensions(job.resultWidth, job.resultHeight)
                                .width}
                              height={getThumbnailDimensions(job.resultWidth, job.resultHeight)
                                .height}
                              className="rounded-sm object-contain"
                            />
                          )
                          : <span className="text-sm">Result</span>}
                      </TabsTrigger>
                      <TabsTrigger value="parent2" className="flex items-center gap-2 px-3 py-2">
                        <Image
                          src={job.sourceImage.url}
                          alt="Photo 2"
                          width={getThumbnailDimensions(
                            job.sourceImage.width,
                            job.sourceImage.height,
                          ).width}
                          height={getThumbnailDimensions(
                            job.sourceImage.width,
                            job.sourceImage.height,
                          ).height}
                          className="rounded-sm object-contain"
                        />
                        <ArrowRight className="h-4 w-4 flex-shrink-0" />
                        {job.resultUrl && job.resultWidth && job.resultHeight
                          ? (
                            <Image
                              src={job.resultUrl}
                              alt="Result"
                              width={getThumbnailDimensions(job.resultWidth, job.resultHeight)
                                .width}
                              height={getThumbnailDimensions(job.resultWidth, job.resultHeight)
                                .height}
                              className="rounded-sm object-contain"
                            />
                          )
                          : <span className="text-sm">Result</span>}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isCompleted && job.resultUrl
                ? (
                  <ComparisonViewToggle
                    originalUrl={comparison.originalUrl}
                    enhancedUrl={job.resultUrl}
                    width={comparison.width || 1024}
                    height={comparison.height || 1024}
                  />
                )
                : isProcessing
                ? (
                  <div className="aspect-video bg-muted rounded-md flex flex-col items-center justify-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Processing your mix...
                    </p>
                  </div>
                )
                : (
                  <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Mix processing failed
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Parent Images */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Parent 1 (Target Image) */}
                {/* Hide "View" link for anonymous jobs or non-owners (they can't access parent images) */}
                {(isAnonymousJob || !isOwner)
                  ? (
                    <div className="relative rounded-lg overflow-hidden border border-border">
                      <div className="aspect-square relative bg-muted">
                        <Image
                          src={job.targetImage.url}
                          alt={job.targetImage.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 300px"
                        />
                      </div>
                    </div>
                  )
                  : (
                    <button
                      type="button"
                      onClick={() => handleViewParent(job.targetImage.id)}
                      className="group relative rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                    >
                      <div className="aspect-square relative bg-muted">
                        <Image
                          src={job.targetImage.url}
                          alt={job.targetImage.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 300px"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>
                    </button>
                  )}

                {/* Parent 2 (Source Image) */}
                {job.sourceImage
                  ? (isAnonymousJob || !isOwner)
                    ? (
                      <div className="relative rounded-lg overflow-hidden border border-border">
                        <div className="aspect-square relative bg-muted">
                          <Image
                            src={job.sourceImage.url}
                            alt={job.sourceImage.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 300px"
                          />
                          <div className="absolute top-2 left-2">
                            <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-md">
                              Photo 2
                            </span>
                          </div>
                        </div>
                        <div className="p-2 bg-card">
                          <p className="text-xs text-muted-foreground truncate">
                            {job.sourceImage.name}
                          </p>
                        </div>
                      </div>
                    )
                    : (
                      <button
                        type="button"
                        onClick={() => handleViewParent(job.sourceImage!.id)}
                        className="group relative rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                      >
                        <div className="aspect-square relative bg-muted">
                          <Image
                            src={job.sourceImage.url}
                            alt={job.sourceImage.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 300px"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          <div className="absolute top-2 left-2">
                            <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-md">
                              Photo 2
                            </span>
                          </div>
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-md flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              View
                            </span>
                          </div>
                        </div>
                        <div className="p-2 bg-card">
                          <p className="text-xs text-muted-foreground truncate">
                            {job.sourceImage.name}
                          </p>
                        </div>
                      </button>
                    )
                  : (
                    <div className="rounded-lg overflow-hidden border border-dashed border-border">
                      <div className="aspect-square relative bg-muted flex items-center justify-center">
                        <p className="text-xs text-muted-foreground text-center px-4">
                          Photo 2 was uploaded directly and not saved to gallery
                        </p>
                      </div>
                      <div className="p-2 bg-card">
                        <p className="text-xs text-muted-foreground truncate">
                          Uploaded file
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div>
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Actions */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Actions</h3>
                {isCompleted && (
                  <Button
                    onClick={handleDownload}
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Mix
                  </Button>
                )}
                <Button
                  onClick={() => router.push("/apps/pixel/mix")}
                  className="w-full"
                >
                  Create New Mix
                </Button>
              </div>

              {/* Mix Result Info */}
              {isCompleted && job.resultWidth && job.resultHeight && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Result Details</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      Dimensions: {job.resultWidth} x {job.resultHeight}
                    </p>
                    <p>Quality: {tierLabels[job.tier]}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Code Overlay - Desktop Only - Only show for owners */}
      {isOwner && <MixShareQRCode shareUrl={shareUrl} />}
    </div>
  );
}
