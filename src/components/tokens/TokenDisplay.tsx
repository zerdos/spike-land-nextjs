"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { cn } from "@/lib/utils";
import { AlertTriangle, Coins, RefreshCw } from "lucide-react";
import { PurchaseModal } from "./PurchaseModal";

interface TokenDisplayProps {
  showPurchase?: boolean;
  showEstimates?: boolean;
  className?: string;
}

export function TokenDisplay({
  showPurchase = true,
  showEstimates = false,
  className,
}: TokenDisplayProps) {
  const {
    balance,
    isLoading,
    isLowBalance,
    isCriticalBalance,
    estimatedEnhancements,
    refetch,
  } = useTokenBalance();

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
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
        isCriticalBalance
          ? "bg-destructive/10 text-destructive"
          : isLowBalance
            ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500"
            : "bg-muted",
      )}
      data-testid="token-balance-display"
    >
      <Coins className="h-4 w-4" />
      {isLoading
        ? <RefreshCw className="h-3 w-3 animate-spin" data-testid="loading-spinner" />
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
              variant={isCriticalBalance ? "default" : isLowBalance ? "secondary" : "outline"}
              data-testid="purchase-button"
            >
              {isCriticalBalance ? "Get Tokens" : isLowBalance ? "Top Up" : "+"}
            </Button>
          }
          onPurchaseComplete={refetch}
        />
      )}
    </div>
  );
}
