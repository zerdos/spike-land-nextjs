"use client";

import {
  PremiumZeroOptions,
  TierBadge,
  TierCard,
  type TierType,
  UpgradePromptModal,
} from "@/components/tiers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDowngrade } from "@/hooks/useDowngrade";
import type { TierInfo } from "@/hooks/useTier";
import { useTier } from "@/hooks/useTier";
import type { UpgradeTierId } from "@/hooks/useTierUpgrade";
import { useTierUpgrade } from "@/hooks/useTierUpgrade";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useTokenPackPurchase } from "@/hooks/useTokenPackPurchase";
import type { TokenPackageId } from "@/lib/stripe/client";
import { ArrowLeft, Calendar, RefreshCw, X } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SubscriptionPage() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const {
    tiers,
    currentTier,
    nextTier,
    showUpgradePrompt,
    isPremiumAtZero,
    premiumOptions,
    isLoading: isTierLoading,
    error: tierError,
    dismissPrompt,
    refetch: refetchTiers,
  } = useTier();

  const { balance, isLoading: isBalanceLoading, refetch: refetchBalance } = useTokenBalance();
  const { upgradeAndRedirect, isUpgrading, error: upgradeError } = useTierUpgrade();
  const { purchaseAndRedirect, isPurchasing, error: purchaseError } = useTokenPackPurchase();
  const {
    scheduleDowngrade,
    cancelDowngrade,
    scheduledDowngrade,
    isScheduling,
    isCanceling,
    error: downgradeError,
    clearScheduledDowngrade,
  } = useDowngrade();

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierInfo | null>(null);

  // Show success toast when returning from successful tier upgrade
  useEffect(() => {
    const upgradeSuccess = searchParams.get("upgrade");
    const tierParam = searchParams.get("tier");

    if (upgradeSuccess === "success" && tierParam) {
      toast.success("Tier upgraded successfully!", {
        description: `Your subscription is now ${tierParam}. Enjoy your new benefits!`,
      });
      // Refetch data to show updated tier
      refetchTiers();
      refetchBalance();
      // Clean up URL without causing a page reload
      window.history.replaceState({}, "", "/settings/subscription");
    }
  }, [searchParams, refetchTiers, refetchBalance]);

  // Handle auth states
  if (status === "loading" || isTierLoading || isBalanceLoading) {
    return (
      <div className="container mx-auto pt-24 pb-8 px-4" data-testid="loading-state">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    redirect("/auth/signin");
  }

  // Get tier index for comparison
  const tierOrder = ["FREE", "BASIC", "STANDARD", "PREMIUM"];
  const currentTierIndex = tierOrder.indexOf(currentTier || "FREE");

  const handleUpgrade = async (tier: TierInfo) => {
    // Can't upgrade to FREE
    if (tier.tier === "FREE") return;

    setSelectedTier(tier);
    await upgradeAndRedirect(tier.tier as UpgradeTierId);
  };

  const handleDowngrade = async (tier: TierInfo) => {
    const result = await scheduleDowngrade(tier.tier as "FREE" | "BASIC" | "STANDARD");
    if (result.success) {
      refetchTiers();
    }
  };

  const handleCancelDowngrade = async () => {
    const result = await cancelDowngrade();
    if (result.success) {
      clearScheduledDowngrade();
      refetchTiers();
    }
  };

  const handlePromptUpgrade = async () => {
    if (nextTier && nextTier.tier !== "FREE") {
      await upgradeAndRedirect(nextTier.tier as UpgradeTierId);
    }
    setUpgradeModalOpen(false);
  };

  const handleDismissPrompt = () => {
    dismissPrompt();
    setUpgradeModalOpen(false);
  };

  // Convert to TierInfo for modal
  const currentTierInfo: TierInfo | null = currentTier
    ? tiers.find((t) => t.tier === currentTier) || null
    : null;

  return (
    <div className="container mx-auto pt-24 pb-8 px-4 max-w-4xl" data-testid="subscription-page">
      {/* Header with back button */}
      <div className="mb-8">
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="back-button">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription and billing preferences
        </p>
      </div>

      {/* Errors */}
      {(tierError || upgradeError || downgradeError || purchaseError) && (
        <div
          className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400"
          data-testid="error-message"
        >
          {tierError?.message || upgradeError?.message || downgradeError?.message ||
            purchaseError?.message}
        </div>
      )}

      {/* Current plan summary */}
      <Card className="mb-8" data-testid="current-plan-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Current Plan
            {currentTier && <TierBadge tier={currentTier as TierType} size="md" showIcon />}
          </CardTitle>
          <CardDescription>
            Your current subscription and token balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Token Balance</span>
              <p className="text-2xl font-bold" data-testid="token-balance">
                {balance ?? 0}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Well Capacity</span>
              <p className="text-2xl font-bold" data-testid="well-capacity">
                {currentTierInfo?.wellCapacity ?? 100}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Monthly Price</span>
              <p className="text-2xl font-bold" data-testid="monthly-price">
                {currentTierInfo?.priceGBP
                  ? `£${currentTierInfo.priceGBP}`
                  : "Free"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled downgrade notice */}
      {scheduledDowngrade && (
        <Card className="mb-8 border-yellow-500/30" data-testid="scheduled-downgrade-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <Calendar className="h-5 w-5" />
              Downgrade Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">
                Your plan will change to{" "}
                <TierBadge tier={scheduledDowngrade.targetTier as TierType} size="sm" /> on{" "}
                {scheduledDowngrade.effectiveDate.toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleCancelDowngrade}
              loading={isCanceling}
              data-testid="cancel-downgrade-button"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Downgrade
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Premium at zero options */}
      {isPremiumAtZero && premiumOptions && (
        <div className="mb-8">
          <PremiumZeroOptions
            timeUntilNextRegen={premiumOptions.timeUntilNextRegen}
            tokenPacks={premiumOptions.tokenPacks}
            onPurchasePack={(packId) => {
              purchaseAndRedirect(packId as TokenPackageId);
            }}
            isPurchasing={isPurchasing}
          />
        </div>
      )}

      {/* All tiers */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((tier) => {
            const tierIndex = tierOrder.indexOf(tier.tier);
            const isCurrent = tier.tier === currentTier;
            const isNext = tier.tier === nextTier?.tier;
            const canUpgradeToTier = tierIndex > currentTierIndex;
            const canDowngradeToTier = tierIndex < currentTierIndex;

            return (
              <TierCard
                key={tier.tier}
                tier={tier}
                isCurrent={isCurrent}
                isNext={isNext}
                canUpgrade={canUpgradeToTier}
                canDowngrade={canDowngradeToTier && !scheduledDowngrade}
                onUpgrade={() => handleUpgrade(tier)}
                onDowngrade={() =>
                  handleDowngrade(tier)}
                isUpgrading={isUpgrading && selectedTier?.tier === tier.tier}
                isScheduling={isScheduling}
              />
            );
          })}
        </div>
      </div>

      {/* Help section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Questions about billing or subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            If you have questions about your subscription, billing, or need to make changes, please
            contact our support team.
          </p>
          <Button variant="outline" asChild>
            <a href="mailto:support@spike.land">Contact Support</a>
          </Button>
        </CardContent>
      </Card>

      {/* Upgrade prompt modal */}
      <UpgradePromptModal
        open={showUpgradePrompt || upgradeModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleDismissPrompt();
          }
          setUpgradeModalOpen(open);
        }}
        currentTier={currentTierInfo}
        nextTier={nextTier}
        onUpgrade={handlePromptUpgrade}
        onDismiss={handleDismissPrompt}
        isUpgrading={isUpgrading}
      />
    </div>
  );
}
