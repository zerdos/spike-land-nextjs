"use client";

import {
  ImageSelectorDialog,
  ImageSlot,
  MixHistory,
  type MixResult,
  MixResultCard,
  type SelectedImage,
} from "@/components/mix";
import { PurchaseModal } from "@/components/tokens";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type MixHistoryItem, useMixHistory } from "@/hooks/useMixHistory";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { ENHANCEMENT_COSTS } from "@/lib/tokens/costs";
import type { EnhancementTier } from "@prisma/client";
import { AlertTriangle, ArrowLeft, Coins, Sparkles } from "lucide-react";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { useCallback, useState } from "react";

type SelectorTarget = "image1" | "image2" | null;

export function PhotoMixClient() {
  const router = useRouter();
  const { balance, isLowBalance, isLoading: isBalanceLoading, refetch: refetchBalance } =
    useTokenBalance({
      autoRefreshOnFocus: true,
    });
  const { refetch: refetchHistory } = useMixHistory();

  // Image selection state
  const [image1, setImage1] = useState<SelectedImage | null>(null);
  const [image2, setImage2] = useState<SelectedImage | null>(null);
  const [selectorTarget, setSelectorTarget] = useState<SelectorTarget>(null);

  // Processing state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isCreatingMix, setIsCreatingMix] = useState(false);

  // Select tier (default to 1K for quick mixes)
  const [selectedTier] = useState<EnhancementTier>("TIER_1K");
  const tokenCost = ENHANCEMENT_COSTS[selectedTier];

  const canCreateMix = image1 !== null && image2 !== null && !activeJobId && !isCreatingMix;
  const hasEnoughTokens = balance >= tokenCost;

  const handleImage1Select = useCallback((image: SelectedImage) => {
    setImage1(image);
  }, []);

  const handleImage2Select = useCallback((image: SelectedImage) => {
    setImage2(image);
  }, []);

  const handleOpenSelector = useCallback((target: SelectorTarget) => {
    setSelectorTarget(target);
  }, []);

  const handleSelectorSelect = useCallback(
    (image: SelectedImage) => {
      if (selectorTarget === "image1") {
        handleImage1Select(image);
      } else if (selectorTarget === "image2") {
        handleImage2Select(image);
      }
      setSelectorTarget(null);
    },
    [selectorTarget, handleImage1Select, handleImage2Select],
  );

  const handleCreateMix = useCallback(async () => {
    if (!image1 || !image2) return;

    setIsCreatingMix(true);

    try {
      const response = await fetch("/api/images/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageId: image1.id, // Target image
          tier: selectedTier,
          blendSource: {
            imageId: image2.id, // Source image for blending
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create mix");
      }

      const result = await response.json();
      setActiveJobId(result.jobId);
      refetchBalance();
    } catch (error) {
      console.error("Failed to create mix:", error);
      alert(error instanceof Error ? error.message : "Failed to create mix");
    } finally {
      setIsCreatingMix(false);
    }
  }, [image1, image2, selectedTier, refetchBalance]);

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

  const handleHistoryClick = useCallback((mix: MixHistoryItem) => {
    // Navigate to the result image detail page
    if (mix.targetImage) {
      router.push(`/apps/pixel/${mix.targetImage.id}`);
    }
  }, [router]);

  const handleClearImage1 = useCallback(() => setImage1(null), []);
  const handleClearImage2 = useCallback(() => setImage2(null), []);

  return (
    <div className="container mx-auto pt-24 pb-8 px-4 max-w-4xl">
      {/* Low balance warning */}
      {!isBalanceLoading && isLowBalance && (
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
              onOpenSelector={() => handleOpenSelector("image1")}
              disabled={activeJobId !== null}
            />
            <ImageSlot
              label="Input Photo 2"
              image={image2}
              onImageSelect={handleImage2Select}
              onImageClear={handleClearImage2}
              onOpenSelector={() => handleOpenSelector("image2")}
              disabled={activeJobId !== null}
            />
          </div>

          {/* Create Mix button */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleCreateMix}
            disabled={!canCreateMix || !hasEnoughTokens}
          >
            {isCreatingMix
              ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating Mix...
                </>
              )
              : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Mix ({tokenCost} tokens)
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
              {/* Balance Display */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Coins className="h-5 w-5 text-yellow-500" />
                  Your Balance
                </span>
                <span className="text-lg font-bold">
                  {isBalanceLoading ? "..." : `${balance} tokens`}
                </span>
              </div>

              <Separator />

              {/* Cost info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Mix Cost</h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">1K Quality</span>
                  <span className="font-medium">2 tokens</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Each mix uses the 1K tier for fast results. Higher quality options coming soon.
                </p>
              </div>

              <Separator />

              {/* Instructions */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">How it works</h3>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Select your first input photo</li>
                  <li>Select a second photo to blend with</li>
                  <li>Click &quot;Create Mix&quot; to generate</li>
                  <li>Download your unique creation</li>
                </ol>
              </div>

              {!hasEnoughTokens && !isBalanceLoading && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-sm text-destructive">
                      You need {tokenCost} tokens to create a mix.
                    </p>
                    <PurchaseModal
                      trigger={
                        <Button className="w-full">
                          <Coins className="mr-2 h-4 w-4" />
                          Get Tokens
                        </Button>
                      }
                      onPurchaseComplete={refetchBalance}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* History section */}
      <div className="mt-8">
        <MixHistory onMixClick={handleHistoryClick} />
      </div>

      {/* Image selector dialog */}
      <ImageSelectorDialog
        open={selectorTarget !== null}
        onOpenChange={(open) => !open && setSelectorTarget(null)}
        onSelect={handleSelectorSelect}
        excludeImageId={selectorTarget === "image1" ? image2?.id : image1?.id}
        title={selectorTarget === "image1"
          ? "Select Input Photo 1"
          : "Select Input Photo 2"}
      />
    </div>
  );
}
