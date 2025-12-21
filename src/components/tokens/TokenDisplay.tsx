"use client";

import { TierBadge, type TierType, UpgradePromptModal } from "@/components/tiers";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TierInfo } from "@/hooks/useTier";
import { useTier } from "@/hooks/useTier";
import { useTierUpgrade } from "@/hooks/useTierUpgrade";
import type { UpgradeTierId } from "@/hooks/useTierUpgrade";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { cn } from "@/lib/utils";
import { AlertTriangle, Coins, RefreshCw } from "lucide-react";
import Link from "next/link";
import { PurchaseModal } from "./PurchaseModal";

interface TokenDisplayProps {
  showPurchase?: boolean;
  showEstimates?: boolean;
  showTierBadge?: boolean;
  showUpgradePrompt?: boolean;
  className?: string;
}

export function TokenDisplay({
  showPurchase = true,
  showEstimates = false,
  showTierBadge = true,
  showUpgradePrompt = true,
  className,
}: TokenDisplayProps) {
  const {
    balance,
    tier,
    isLoading,
    isLowBalance,
    isCriticalBalance,
    estimatedEnhancements,
    refetch,
  } = useTokenBalance();

  // Tier upgrade prompt state
  const {
    tiers,
    currentTier,
    nextTier,
    showUpgradePrompt: shouldShowPrompt,
    isPremiumAtZero,
    dismissPrompt,
  } = useTier();

  const { upgradeAndRedirect, isUpgrading } = useTierUpgrade();

  // Find current tier info for modal
  const currentTierInfo: TierInfo | null = currentTier
    ? tiers.find((t) => t.tier === currentTier) || null
    : null;

  // Handle upgrade action
  const handleUpgrade = async () => {
    if (nextTier && nextTier.tier !== "FREE") {
      await upgradeAndRedirect(nextTier.tier as UpgradeTierId);
    }
  };

  const tooltipContent = showEstimates && estimatedEnhancements
    ? (
      <div className="text-xs space-y-1">
        <p className="font-medium">Estimated enhancements:</p>
        <p>{estimatedEnhancements.tier1K} at 1K quality</p>
        <p>{estimatedEnhancements.tier2K} at 2K quality</p>
        <p>{estimatedEnhancements.tier4K} at 4K quality</p>
      </div>
    )
    : null;

  const balanceDisplay = (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
        isCriticalBalance
          ? "bg-red-500/20 text-red-400 border border-red-500/30"
          : isLowBalance
          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
          : "bg-muted/50 text-foreground border border-border",
      )}
      data-testid="token-balance-display"
    >
      <Coins className="h-4 w-4" />
      {isLoading
        ? (
          <RefreshCw
            className="h-3 w-3 animate-spin"
            data-testid="loading-spinner"
          />
        )
        : (
          <>
            <span>{balance ?? 0} tokens</span>
            {isLowBalance && (
              <AlertTriangle
                className="h-3 w-3 ml-0.5"
                data-testid="low-balance-icon"
              />
            )}
          </>
        )}
    </div>
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Tier badge */}
      {showTierBadge && tier && (
        <TierBadge
          tier={tier as TierType}
          size="sm"
          data-testid="token-tier-badge"
        />
      )}

      {showEstimates && tooltipContent
        ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {balanceDisplay}
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {tooltipContent}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
        : balanceDisplay}

      {showPurchase && (
        <PurchaseModal
          trigger={
            <Button
              size="sm"
              variant={isCriticalBalance
                ? "default"
                : isLowBalance
                ? "secondary"
                : "outline"}
              data-testid="purchase-button"
            >
              {isCriticalBalance ? "Get Tokens" : isLowBalance ? "Top Up" : "+"}
            </Button>
          }
          onPurchaseComplete={refetch}
        />
      )}

      {/* Premium at zero - link to subscription page */}
      {isPremiumAtZero && (
        <Button
          asChild
          size="sm"
          variant="outline"
          className="border-amber-500/30 text-amber-400"
          data-testid="premium-options-link"
        >
          <Link href="/settings/subscription">Options</Link>
        </Button>
      )}

      {/* Upgrade prompt modal */}
      {showUpgradePrompt && (
        <UpgradePromptModal
          open={shouldShowPrompt && balance === 0}
          onOpenChange={(open) => {
            if (!open) dismissPrompt();
          }}
          currentTier={currentTierInfo}
          nextTier={nextTier}
          onUpgrade={handleUpgrade}
          onDismiss={dismissPrompt}
          isUpgrading={isUpgrading}
        />
      )}
    </div>
  );
}
