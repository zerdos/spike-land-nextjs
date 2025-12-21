"use client";

import { cn } from "@/lib/utils";

// Tier type - matches backend SubscriptionTier enum
export type TierType = "FREE" | "BASIC" | "STANDARD" | "PREMIUM";

// Display names for each tier
const TIER_DISPLAY_NAMES: Record<TierType, string> = {
  FREE: "Free",
  BASIC: "Basic",
  STANDARD: "Standard",
  PREMIUM: "Premium",
};

// Color classes for each tier
const TIER_STYLES: Record<
  TierType,
  { bg: string; text: string; border: string; glow?: string; }
> = {
  FREE: {
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    border: "border-muted-foreground/20",
  },
  BASIC: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
    glow: "shadow-[0_0_8px_rgba(59,130,246,0.3)]",
  },
  STANDARD: {
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    border: "border-purple-500/30",
    glow: "shadow-[0_0_8px_rgba(168,85,247,0.3)]",
  },
  PREMIUM: {
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.4)]",
  },
};

export interface TierBadgeProps {
  /** The tier to display */
  tier: TierType | string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the tier icon/indicator */
  showIcon?: boolean;
}

/**
 * TierBadge - Visual badge showing subscription tier
 * Color-coded for quick identification:
 * - FREE: Gray/muted
 * - BASIC: Blue
 * - STANDARD: Purple
 * - PREMIUM: Gold/Amber with glow
 */
export function TierBadge({
  tier,
  size = "md",
  className,
  showIcon = false,
}: TierBadgeProps) {
  // Normalize tier to uppercase and validate
  const normalizedTier = (tier?.toUpperCase() || "FREE") as TierType;
  const validTier = TIER_DISPLAY_NAMES[normalizedTier] ? normalizedTier : "FREE";

  const styles = TIER_STYLES[validTier];
  const displayName = TIER_DISPLAY_NAMES[validTier];

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-0.5 text-xs",
    lg: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        // Base styles
        "inline-flex items-center gap-1 rounded-full border font-semibold transition-all",
        // Size
        sizeClasses[size],
        // Tier-specific colors
        styles.bg,
        styles.text,
        styles.border,
        // Glow effect for paid tiers
        styles.glow,
        // Custom classes
        className,
      )}
      data-testid="tier-badge"
      data-tier={validTier}
    >
      {showIcon && validTier === "PREMIUM" && (
        <span className="text-amber-400" aria-hidden="true">
          ★
        </span>
      )}
      {displayName}
    </span>
  );
}
