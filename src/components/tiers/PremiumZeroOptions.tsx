"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock, Package, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { TierBadge } from "./TierBadge";

export interface TokenPack {
  id: string;
  name: string;
  tokens: number;
  price: number;
}

interface PremiumZeroOptionsProps {
  /** Time until next regeneration in milliseconds */
  timeUntilNextRegen: number;
  /** Available token packs for purchase */
  tokenPacks?: TokenPack[];
  /** Called when a token pack is selected for purchase */
  onPurchasePack?: (packId: string) => void;
  /** Whether purchase is in progress */
  isPurchasing?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format milliseconds to human-readable time (e.g., "2h 30m")
 */
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Now";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${seconds}s`;
}

/**
 * Options shown to Premium users when they're at 0 balance
 * Shows countdown to regeneration and token pack purchase options
 */
export function PremiumZeroOptions({
  timeUntilNextRegen,
  tokenPacks = [],
  onPurchasePack,
  isPurchasing = false,
  className,
}: PremiumZeroOptionsProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeUntilNextRegen);

  // Countdown timer
  useEffect(() => {
    setTimeRemaining(timeUntilNextRegen);

    if (timeUntilNextRegen <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1000;
        return newTime > 0 ? newTime : 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeUntilNextRegen]);

  const formattedTime = formatTimeRemaining(timeRemaining);
  const isRegenerating = timeRemaining <= 0;

  return (
    <Card className={cn("", className)} data-testid="premium-zero-options">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-2">
          <TierBadge tier="PREMIUM" size="lg" showIcon />
        </div>
        <CardTitle className="text-lg">Token Well Empty</CardTitle>
        <CardDescription>
          Your Premium token well is temporarily empty
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Regeneration countdown */}
        <div
          className="flex items-center justify-center gap-3 p-4 rounded-lg bg-muted/50"
          data-testid="regen-countdown"
        >
          {isRegenerating
            ? (
              <>
                <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                <div className="text-center">
                  <span className="font-medium text-primary" data-testid="regen-status">
                    Regenerating now...
                  </span>
                </div>
              </>
            )
            : (
              <>
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">Next refill in</span>
                  <span className="font-semibold text-foreground" data-testid="time-remaining">
                    {formattedTime}
                  </span>
                </div>
              </>
            )}
        </div>

        {/* Token packs section */}
        {tokenPacks.length > 0 && (
          <div data-testid="token-packs-section">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Need tokens now?</span>
            </div>

            <div className="grid gap-2">
              {tokenPacks.map((pack) => (
                <Button
                  key={pack.id}
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => onPurchasePack?.(pack.id)}
                  disabled={isPurchasing}
                  data-testid={`pack-${pack.id}`}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span>{pack.name}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {pack.tokens} tokens - £{pack.price.toFixed(2)}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* No packs available message */}
        {tokenPacks.length === 0 && (
          <p
            className="text-sm text-center text-muted-foreground"
            data-testid="no-packs-message"
          >
            Wait for your tokens to regenerate, or upgrade your plan for faster refills.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
