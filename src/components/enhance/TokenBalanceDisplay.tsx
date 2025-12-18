"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { Progress } from "@/components/ui/progress";
import { LOW_BALANCE_THRESHOLD, useTokenBalance } from "@/hooks/useTokenBalance";
import { cn } from "@/lib/utils";
import { AlertTriangle, Coins, ImageIcon, TrendingUp } from "lucide-react";

interface TokenBalanceDisplayProps {
  showAnalytics?: boolean;
  showEstimates?: boolean;
  className?: string;
}

export function TokenBalanceDisplay({
  showAnalytics = false,
  showEstimates = true,
  className,
}: TokenBalanceDisplayProps) {
  const {
    balance,
    isLoading,
    isLowBalance,
    isCriticalBalance,
    stats,
    estimatedEnhancements,
  } = useTokenBalance();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center gap-2 p-4">
          <Coins className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        isCriticalBalance && "border-destructive",
        isLowBalance && !isCriticalBalance && "border-yellow-500",
        className,
      )}
    >
      <CardContent className="p-4 space-y-4">
        {/* Balance Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins
              className={cn(
                "h-5 w-5",
                isCriticalBalance
                  ? "text-destructive"
                  : isLowBalance
                  ? "text-yellow-500"
                  : "text-yellow-500",
              )}
            />
            <div>
              <p className="text-sm font-medium">{balance} tokens</p>
              <p className="text-xs text-muted-foreground">Available balance</p>
            </div>
          </div>

          {/* Low Balance Warning */}
          {isLowBalance && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs",
                isCriticalBalance ? "text-destructive" : "text-yellow-600",
              )}
              data-testid="low-balance-warning"
            >
              <AlertTriangle className="h-3 w-3" />
              <span>
                {isCriticalBalance ? "Very low balance" : "Low balance"}
              </span>
            </div>
          )}
        </div>

        {/* Estimated Enhancements */}
        {showEstimates && (
          <div
            className="bg-muted/50 rounded-lg p-3 space-y-2"
            data-testid="estimated-enhancements"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ImageIcon className="h-3 w-3" />
              <span>Estimated enhancements remaining</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-semibold">
                  {estimatedEnhancements.tier1K}
                </p>
                <p className="text-xs text-muted-foreground">1K quality</p>
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {estimatedEnhancements.tier2K}
                </p>
                <p className="text-xs text-muted-foreground">2K quality</p>
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {estimatedEnhancements.tier4K}
                </p>
                <p className="text-xs text-muted-foreground">4K quality</p>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Section */}
        {showAnalytics && stats && (
          <div
            className="border-t pt-3 space-y-2"
            data-testid="token-analytics"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Your token usage</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tokens spent</span>
                <span className="font-medium">{stats.totalSpent}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tokens earned</span>
                <span className="font-medium text-green-600">
                  +{stats.totalEarned}
                </span>
              </div>
              {stats.totalRefunded > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Refunded</span>
                  <span className="font-medium text-blue-600">
                    +{stats.totalRefunded}
                  </span>
                </div>
              )}
              <div className="pt-1">
                <Progress
                  value={Math.min(
                    (balance / LOW_BALANCE_THRESHOLD) * 100,
                    100,
                  )}
                  className="h-1.5"
                  data-testid="balance-progress"
                />
              </div>
            </div>
          </div>
        )}

        {/* Purchase CTA for low balance */}
        {isLowBalance && (
          <div className="pt-2" data-testid="purchase-cta">
            <Button
              asChild
              size="sm"
              variant={isCriticalBalance ? "default" : "outline"}
              className="w-full"
            >
              <Link href="/pricing">
                {isCriticalBalance ? "Get Tokens Now" : "Top Up Tokens"}
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
