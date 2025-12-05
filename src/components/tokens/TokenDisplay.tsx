"use client";

import { Button } from "@/components/ui/button";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { cn } from "@/lib/utils";
import { Coins, RefreshCw } from "lucide-react";
import { PurchaseModal } from "./PurchaseModal";

interface TokenDisplayProps {
  showPurchase?: boolean;
  className?: string;
}

export function TokenDisplay({ showPurchase = true, className }: TokenDisplayProps) {
  const { balance, isLoading, refetch } = useTokenBalance();

  const isLowBalance = balance !== null && balance < 5;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
          isLowBalance ? "bg-destructive/10 text-destructive" : "bg-muted",
        )}
      >
        <Coins className="h-4 w-4" />
        {isLoading
          ? <RefreshCw className="h-3 w-3 animate-spin" />
          : <span>{balance ?? 0} tokens</span>}
      </div>

      {showPurchase && (
        <PurchaseModal
          trigger={
            <Button size="sm" variant={isLowBalance ? "default" : "outline"}>
              {isLowBalance ? "Get Tokens" : "+"}
            </Button>
          }
          onPurchaseComplete={refetch}
        />
      )}
    </div>
  );
}
