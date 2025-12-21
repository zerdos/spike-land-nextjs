"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { TierBadge, type TierType } from "./TierBadge";

export interface TierInfo {
  tier: TierType;
  displayName: string;
  wellCapacity: number;
  priceGBP: number;
}

export interface UpgradePromptModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal should close */
  onOpenChange: (open: boolean) => void;
  /** Current tier info */
  currentTier?: TierInfo | null;
  /** Next tier to upgrade to */
  nextTier?: TierInfo | null;
  /** Called when upgrade button is clicked */
  onUpgrade?: () => void;
  /** Called when dismiss button is clicked */
  onDismiss?: () => void;
  /** Whether upgrade is in progress */
  isUpgrading?: boolean;
}

/**
 * Modal dialog shown when user runs out of tokens
 * Prompts them to upgrade to the next tier
 */
export function UpgradePromptModal({
  open,
  onOpenChange,
  currentTier,
  nextTier,
  onUpgrade,
  onDismiss,
  isUpgrading = false,
}: UpgradePromptModalProps) {
  const handleDismiss = () => {
    onDismiss?.();
    onOpenChange(false);
  };

  const handleUpgrade = () => {
    onUpgrade?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="upgrade-prompt-modal">
        <DialogHeader className="text-center sm:text-center">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
            <Zap className="h-6 w-6 text-amber-400" />
          </div>

          <DialogTitle className="text-xl" data-testid="modal-title">
            You&apos;re out of tokens!
          </DialogTitle>
          <DialogDescription className="text-base" data-testid="modal-description">
            Your token well is empty. Upgrade to get more capacity and faster regeneration.
          </DialogDescription>
        </DialogHeader>

        {/* Tier comparison */}
        {currentTier && nextTier && (
          <div
            className="flex items-center justify-center gap-4 py-4"
            data-testid="tier-comparison"
          >
            {/* Current tier */}
            <div className="flex flex-col items-center gap-2">
              <TierBadge tier={currentTier.tier} size="md" />
              <span className="text-sm text-muted-foreground">
                {currentTier.wellCapacity} tokens
              </span>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-5 w-5 text-muted-foreground" />

            {/* Next tier */}
            <div className="flex flex-col items-center gap-2">
              <TierBadge tier={nextTier.tier} size="md" showIcon />
              <span className="text-sm font-medium text-foreground">
                {nextTier.wellCapacity} tokens
              </span>
            </div>
          </div>
        )}

        {/* Benefits list */}
        {nextTier && (
          <div className="rounded-lg bg-muted/50 p-4" data-testid="benefits-list">
            <h4 className="mb-2 text-sm font-medium">
              What you&apos;ll get with {nextTier.displayName}:
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>{nextTier.wellCapacity} token capacity</span>
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>Faster regeneration rate</span>
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>Priority support</span>
              </li>
            </ul>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {/* Upgrade CTA */}
          {nextTier && onUpgrade && (
            <Button
              onClick={handleUpgrade}
              loading={isUpgrading}
              className="w-full"
              size="lg"
              data-testid="upgrade-button"
            >
              {isUpgrading
                ? (
                  "Processing..."
                )
                : (
                  <>
                    Upgrade to {nextTier.displayName}
                    {nextTier.priceGBP > 0 && (
                      <span className="ml-1">- £{nextTier.priceGBP}/month</span>
                    )}
                  </>
                )}
            </Button>
          )}

          {/* Dismiss button */}
          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="w-full"
            data-testid="dismiss-button"
          >
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
