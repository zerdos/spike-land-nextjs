"use client";

import {
  type GalleryImage,
  ImageSelectorDialog,
  ImageSlot,
  MixHistory,
  type MixResult,
  MixResultCard,
  type SelectedImage,
} from "@/components/mix";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { Separator } from "@/components/ui/separator";
import { type MixHistoryItem, useMixHistory } from "@/hooks/useMixHistory";
import { useWorkspaceCredits } from "@/hooks/useWorkspaceCredits";
import { ENHANCEMENT_COSTS } from "@/lib/credits/costs";
import { cn } from "@/lib/utils";
import type { EnhancementTier } from "@prisma/client";
import { AlertTriangle, ArrowLeft, Check, Crown, Sparkles, Upload, Zap } from "lucide-react";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { useCallback, useState } from "react";

type SelectorTarget = "image1" | "image2" | null;

interface PhotoMixClientProps {
  /** Whether the user is anonymous (not logged in) */
  isAnonymous?: boolean;
}

export function PhotoMixClient({ isAnonymous = false }: PhotoMixClientProps) {
  const router = useRouter();
  // Only fetch credit balance for authenticated users
  const {
    remaining,
    isLowCredits,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useWorkspaceCredits({
    autoRefreshOnFocus: !isAnonymous,
  });
  // Only fetch history for authenticated users
  const { refetch: refetchHistory } = useMixHistory();

  // Image selection state
  const [image1, setImage1] = useState<SelectedImage | null>(null);
  const [image2, setImage2] = useState<SelectedImage | null>(null);
  const [selectorTarget, setSelectorTarget] = useState<SelectorTarget>(null);

  // Processing state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isCreatingMix, setIsCreatingMix] = useState(false);
  const [needsUpload, setNeedsUpload] = useState(false);

  // Tier selection - anonymous users are forced to FREE tier
  const [selectedTier, setSelectedTier] = useState<EnhancementTier>("FREE");
  // Force FREE tier for anonymous users
  const effectiveTier = isAnonymous ? "FREE" : selectedTier;
  const creditCost = ENHANCEMENT_COSTS[effectiveTier];

  const canCreateMix = image1 !== null && image2 !== null && !activeJobId &&
    !isCreatingMix;
  // FREE tier always has enough credits (costs 0), anonymous users always have enough
  const hasEnoughCredits = isAnonymous || creditCost === 0 ||
    remaining >= creditCost;

  // Check if we need to upload images first (both must be gallery images OR we handle uploads)
  // For anonymous users, we always need to upload
  const hasUploadedImages = isAnonymous || image1?.type === "upload" ||
    image2?.type === "upload";

  const handleImage1Select = useCallback((image: SelectedImage) => {
    setImage1(image);
  }, []);

  const handleImage2Select = useCallback((image: SelectedImage) => {
    setImage2(image);
  }, []);

  const handleOpenGallery = useCallback((target: SelectorTarget) => {
    setSelectorTarget(target);
  }, []);

  const handleSelectorSelect = useCallback(
    (
      selectedImg: {
        id: string;
        url: string;
        name: string;
        width: number;
        height: number;
      },
    ) => {
      // Convert to GalleryImage type
      const galleryImage: GalleryImage = {
        type: "gallery",
        id: selectedImg.id,
        url: selectedImg.url,
        name: selectedImg.name,
        width: selectedImg.width,
        height: selectedImg.height,
      };

      if (selectorTarget === "image1") {
        handleImage1Select(galleryImage);
      } else if (selectorTarget === "image2") {
        handleImage2Select(galleryImage);
      }
      setSelectorTarget(null);
    },
    [selectorTarget, handleImage1Select, handleImage2Select],
  );

  const uploadImageAndGetId = async (
    image: SelectedImage,
    useAnonymousUpload: boolean,
  ): Promise<string> => {
    if (image.type === "gallery") {
      return image.id;
    }

    // Upload the image first
    const formData = new FormData();
    // Convert base64 back to blob
    const byteCharacters = atob(image.base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: image.mimeType });
    const file = new File([blob], image.name, { type: image.mimeType });

    formData.append("file", file);

    // Use anonymous upload endpoint for anonymous users
    const uploadEndpoint = useAnonymousUpload
      ? "/api/images/anonymous-upload"
      : "/api/images/upload";

    const uploadResponse = await fetch(uploadEndpoint, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(error.error || "Failed to upload image");
    }

    const uploadResult = await uploadResponse.json();
    return uploadResult.image.id;
  };

  const handleCreateMix = useCallback(async () => {
    if (!image1 || !image2) return;

    setIsCreatingMix(true);
    setNeedsUpload(hasUploadedImages);

    try {
      // If either image is an upload, we need to upload it first
      let targetImageId: string;
      let blendSource: { imageId?: string; base64?: string; mimeType?: string; };

      if (image1.type === "upload") {
        // Upload image1 first to use as target
        targetImageId = await uploadImageAndGetId(image1, isAnonymous);
      } else {
        targetImageId = image1.id;
      }

      if (image2.type === "upload") {
        // For image2, we can either upload it or send as base64
        // Sending as base64 is simpler for blending
        blendSource = {
          base64: image2.base64,
          mimeType: image2.mimeType,
        };
      } else {
        blendSource = {
          imageId: image2.id,
        };
      }

      setNeedsUpload(false);

      // Use anonymous enhance endpoint for anonymous users
      const enhanceEndpoint = isAnonymous
        ? "/api/images/anonymous-enhance"
        : "/api/images/enhance";

      const response = await fetch(enhanceEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageId: targetImageId,
          tier: effectiveTier,
          blendSource,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create mix");
      }

      const result = await response.json();
      setActiveJobId(result.jobId);
      if (!isAnonymous) {
        refetchBalance();
      }
    } catch (error) {
      console.error("Failed to create mix:", error);
      alert(error instanceof Error ? error.message : "Failed to create mix");
    } finally {
      setIsCreatingMix(false);
      setNeedsUpload(false);
    }
  }, [
    image1,
    image2,
    effectiveTier,
    isAnonymous,
    refetchBalance,
    hasUploadedImages,
  ]);

  const handleMixComplete = useCallback(
    (_result: MixResult) => {
      // Refresh history to show the new mix
      refetchHistory();
      refetchBalance();
    },
    [refetchHistory, refetchBalance],
  );

  const handleMixError = useCallback((error: string) => {
    console.error("Mix failed:", error);
    setActiveJobId(null);
  }, []);

  const handleRetry = useCallback(() => {
    setActiveJobId(null);
    handleCreateMix();
  }, [handleCreateMix]);

  const handleHistoryClick = useCallback(
    (mix: MixHistoryItem) => {
      // Navigate to the mix detail page using job ID
      router.push(`/apps/pixel/mix/${mix.id}`);
    },
    [router],
  );

  const handleClearImage1 = useCallback(() => {
    if (image1?.type === "upload") {
      URL.revokeObjectURL(image1.url);
    }
    setImage1(null);
  }, [image1]);

  const handleClearImage2 = useCallback(() => {
    if (image2?.type === "upload") {
      URL.revokeObjectURL(image2.url);
    }
    setImage2(null);
  }, [image2]);

  return (
    <div className="container mx-auto pt-24 pb-8 px-4 max-w-4xl">
      {/* Low balance warning - only for authenticated users */}
      {!isAnonymous && !isBalanceLoading && isLowCredits && (
        <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">
              Your AI credit balance is running low ({remaining} credits remaining).
            </span>
            <Button size="sm" variant="outline" className="ml-4" asChild>
              <Link href="/settings/billing">View Plans</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Anonymous user notice */}
      {isAnonymous && (
        <Alert className="mb-6 border-blue-500/50 bg-blue-500/10">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">
              Try PhotoMix for free with <strong>Nano Banana</strong>! Sign in to unlock <strong>Nano Banana Pro</strong> and save your creations.
            </span>
            <Button
              size="sm"
              variant="outline"
              className="ml-4"
              onClick={() => router.push("/auth/signin")}
            >
              Sign In
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/apps/pixel")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <h1 className="text-3xl font-bold">PhotoMix AI</h1>
        <p className="text-muted-foreground mt-1">
          Blend two images together using AI
        </p>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left column - Image selection and result */}
        <div className="space-y-6">
          {/* Input images */}
          <div className="grid grid-cols-2 gap-4">
            <ImageSlot
              label="Input Photo 1"
              image={image1}
              onImageSelect={handleImage1Select}
              onImageClear={handleClearImage1}
              onOpenGallery={isAnonymous
                ? undefined
                : () => handleOpenGallery("image1")}
              disabled={activeJobId !== null}
            />
            <ImageSlot
              label="Input Photo 2"
              image={image2}
              onImageSelect={handleImage2Select}
              onImageClear={handleClearImage2}
              onOpenGallery={isAnonymous
                ? undefined
                : () => handleOpenGallery("image2")}
              disabled={activeJobId !== null}
            />
          </div>

          {/* Tier selector - only show for authenticated users */}
          {!isAnonymous && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedTier("FREE")}
                disabled={activeJobId !== null}
                className={cn(
                  "relative flex items-center justify-center gap-2 rounded-full py-3 px-4 text-sm font-medium transition-all",
                  effectiveTier === "FREE"
                    ? "bg-gradient-to-r from-yellow-300 to-yellow-400 border-2 border-yellow-500 text-yellow-900 shadow-sm"
                    : "bg-muted/50 border border-border hover:bg-muted text-muted-foreground hover:text-foreground",
                  activeJobId !== null && "opacity-50 cursor-not-allowed",
                )}
              >
                {effectiveTier === "FREE" && <Check className="h-4 w-4" />}
                Nano Banana
              </button>
              <button
                type="button"
                onClick={() => setSelectedTier("TIER_1K")}
                disabled={activeJobId !== null}
                className={cn(
                  "relative flex items-center justify-center gap-2 rounded-full py-3 px-4 text-sm font-medium transition-all",
                  effectiveTier === "TIER_1K"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 border-2 border-violet-500 text-white shadow-md shadow-violet-500/20"
                    : "bg-muted/50 border border-border hover:bg-muted text-muted-foreground hover:text-foreground",
                  activeJobId !== null && "opacity-50 cursor-not-allowed",
                )}
              >
                <Zap className="h-4 w-4 fill-current" />
                Nano Banana Pro
              </button>
            </div>
          )}

          {/* Create Mix button */}
          <Button
            size="lg"
            className={cn(
              "w-full",
              effectiveTier === "FREE"
                ? "bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-yellow-950 font-bold"
                : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25",
            )}
            onClick={handleCreateMix}
            disabled={!canCreateMix || !hasEnoughCredits}
          >
            {isCreatingMix
              ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {needsUpload ? "Uploading images..." : "Creating Mix..."}
                </>
              )
              : (
                <>
                  {hasUploadedImages && <Upload className="mr-2 h-4 w-4" />}
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Mix {creditCost > 0 ? `(${creditCost} AI credits)` : "(Free)"}
                </>
              )}
          </Button>

          {/* Result */}
          <MixResultCard
            activeJobId={activeJobId}
            hasImages={image1 !== null && image2 !== null}
            onComplete={handleMixComplete}
            onError={handleMixError}
            onRetry={handleRetry}
          />
        </div>

        {/* Right column - Sidebar */}
        <div>
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Balance Display - only for authenticated users */}
              {!isAnonymous && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="h-5 w-5 text-indigo-500" />
                      Your Credits
                    </span>
                    <span className="text-lg font-bold">
                      {isBalanceLoading ? "..." : `${remaining} AI credits`}
                    </span>
                  </div>

                  <Separator />
                </>
              )}

              {/* Quality options */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Mix Quality Options</h3>
                <div
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    effectiveTier === "FREE"
                      ? "border-yellow-400/50 bg-yellow-400/10"
                      : "border-border bg-muted/30",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {effectiveTier === "FREE" && <Check className="h-4 w-4 text-yellow-500" />}
                    <span
                      className={cn(
                        "text-sm font-medium",
                        effectiveTier === "FREE"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-muted-foreground",
                      )}
                    >
                      Nano Banana
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Nano Quality
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      effectiveTier === "FREE"
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-muted-foreground",
                    )}
                  >
                    0 credits
                  </span>
                </div>
                {!isAnonymous && (
                  <div
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      effectiveTier === "TIER_1K"
                        ? "border-violet-500/50 bg-violet-500/10"
                        : "border-border bg-muted/30",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Zap
                        className={cn(
                          "h-4 w-4",
                          effectiveTier === "TIER_1K"
                            ? "text-violet-500"
                            : "text-muted-foreground",
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm font-medium",
                          effectiveTier === "TIER_1K"
                            ? "text-violet-400"
                            : "text-muted-foreground",
                        )}
                      >
                        Nano Banana Pro
                      </span>
                      <span className="text-xs text-muted-foreground">
                        1K Quality
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        effectiveTier === "TIER_1K"
                          ? "text-violet-400"
                          : "text-muted-foreground",
                      )}
                    >
                      {ENHANCEMENT_COSTS.TIER_1K} credits
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {isAnonymous
                    ? "Sign in to unlock Nano Banana Pro with 1K quality for better results."
                    : "Nano Banana uses Nano model for quick previews. Nano Banana Pro uses 1K quality for better results."}
                </p>
              </div>

              <Separator />

              {/* Instructions */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">How it works</h3>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Drop or select your first photo</li>
                  <li>Drop or select a second photo</li>
                  <li>Click &quot;Create Mix&quot; to blend</li>
                  <li>Download your unique creation</li>
                </ol>
              </div>

              {/* Only show "not enough credits" for paid tiers - not for anonymous */}
              {!isAnonymous && creditCost > 0 && !hasEnoughCredits &&
                !isBalanceLoading && (
                  <>
                    <Separator />
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                      <div className="rounded-lg bg-red-500/10 border border-red-500/50 p-3">
                        <p className="text-sm font-medium text-red-500 mb-1">
                          Insufficient AI Credits
                        </p>
                        <p className="text-xs text-muted-foreground">
                          You need {creditCost} credits for Nano Banana Pro. You currently have {remaining}.
                        </p>
                      </div>
                      <Button className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20" asChild>
                        <Link href="/settings/billing">
                          <Crown className="mr-2 h-4 w-4" />
                          Top Up AI Credits
                        </Link>
                      </Button>
                    </div>
                  </>
                )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* History section - only for authenticated users */}
      {!isAnonymous && (
        <div className="mt-8">
          <MixHistory onMixClick={handleHistoryClick} />
        </div>
      )}

      {/* Image selector dialog - only for authenticated users */}
      {!isAnonymous && (
        <ImageSelectorDialog
          open={selectorTarget !== null}
          onOpenChange={(open) => !open && setSelectorTarget(null)}
          onSelect={handleSelectorSelect}
          excludeImageId={selectorTarget === "image1"
            ? image2?.type === "gallery" ? image2.id : undefined
            : image1?.type === "gallery"
              ? image1.id
              : undefined}
          title={selectorTarget === "image1"
            ? "Select Input Photo 1"
            : "Select Input Photo 2"}
        />
      )}
    </div>
  );
}
