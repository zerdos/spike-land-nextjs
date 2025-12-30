"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { TierBadge, type TierType } from "./TierBadge";

export interface TierInfo {
  tier: TierType;
  displayName: string;
  wellCapacity: number;
  priceGBP: number;
}

interface TierCardProps {
  /** The tier information to display */
  tier: TierInfo;
  /** Whether this is the user's current tier */
  isCurrent?: boolean;
  /** Whether this is the next tier the user can upgrade to */
  isNext?: boolean;
  /** Whether the user can upgrade to this tier */
  canUpgrade?: boolean;
  /** Whether the user can downgrade to this tier */
  canDowngrade?: boolean;
  /** Callback when upgrade button is clicked */
  onUpgrade?: () => void;
  /** Callback when downgrade button is clicked */
  onDowngrade?: () => void;
  /** Whether an upgrade is in progress */
  isUpgrading?: boolean;
  /** Whether a downgrade is being scheduled */
  isScheduling?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/** Features included in each tier */
const TIER_FEATURES: Record<TierType, string[]> = {
  FREE: [
    "100 tokens capacity",
    "Daily regeneration",
    "Basic support",
  ],
  BASIC: [
    "20 tokens capacity",
    "Faster regeneration",
    "Email support",
    "Priority queue",
  ],
  STANDARD: [
    "50 tokens capacity",
    "Fast regeneration",
    "Priority support",
    "Advanced features",
  ],
  PREMIUM: [
    "100 tokens capacity",
    "Instant regeneration",
    "24/7 priority support",
    "All features included",
    "Early access to new features",
  ],
};

/**
 * Card component for displaying tier information with upgrade/downgrade options
 */
export function TierCard({
  tier,
  isCurrent = false,
  isNext = false,
  canUpgrade = false,
  canDowngrade = false,
  onUpgrade,
  onDowngrade,
  isUpgrading = false,
  isScheduling = false,
  className,
}: TierCardProps) {
  const features = TIER_FEATURES[tier.tier] || [];
  const isFree = tier.priceGBP === 0;

  return (
    <Card
      variant={isCurrent ? "highlighted" : isNext ? "default" : "solid"}
      className={cn(
        "relative flex flex-col",
        isCurrent && "ring-2 ring-primary",
        className,
      )}
      data-testid={`tier-card-${tier.tier}`}
    >
      {/* Current tier badge */}
      {isCurrent && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full"
          data-testid="current-tier-badge"
        >
          Current Plan
        </div>
      )}

      {/* Next tier badge */}
      {isNext && !isCurrent && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full"
          data-testid="next-tier-badge"
        >
          Recommended
        </div>
      )}

      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-2">
          <TierBadge tier={tier.tier} size="lg" showIcon />
        </div>
        <CardTitle className="text-2xl">{tier.displayName}</CardTitle>
        <CardDescription>
          <span className="text-3xl font-bold text-foreground">
            {isFree ? "Free" : `£${tier.priceGBP}`}
          </span>
          {!isFree && <span className="text-muted-foreground">/month</span>}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        {/* Well capacity highlight */}
        <div className="text-center mb-4 p-3 rounded-lg bg-muted/50">
          <span className="text-lg font-semibold">
            {tier.wellCapacity} tokens
          </span>
          <span className="text-muted-foreground text-sm block">
            Well capacity
          </span>
        </div>

        {/* Features list */}
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li
              key={index}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {/* Upgrade button */}
        {canUpgrade && onUpgrade && (
          <Button
            onClick={onUpgrade}
            loading={isUpgrading}
            className="w-full"
            data-testid="upgrade-button"
          >
            <ChevronUp className="h-4 w-4" />
            {isUpgrading ? "Processing..." : `Upgrade to ${tier.displayName}`}
          </Button>
        )}

        {/* Downgrade button */}
        {canDowngrade && onDowngrade && (
          <Button
            variant="outline"
            onClick={onDowngrade}
            loading={isScheduling}
            className="w-full"
            data-testid="downgrade-button"
          >
            <ChevronDown className="h-4 w-4" />
            {isScheduling
              ? "Scheduling..."
              : `Downgrade to ${tier.displayName}`}
          </Button>
        )}

        {/* Current plan indicator */}
        {isCurrent && !canUpgrade && !canDowngrade && (
          <div
            className="w-full text-center py-2 text-sm text-muted-foreground"
            data-testid="current-plan-indicator"
          >
            Your current plan
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
