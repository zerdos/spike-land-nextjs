"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PackageCardProps {
  id: string;
  name: string;
  tokens: number;
  price: number;
  currencySymbol: string;
  popular?: boolean;
  gradient?: string;
  onSelect: (packageId: string) => void;
  isLoading?: boolean;
}

export function PackageCard(
  {
    id,
    name,
    tokens,
    price,
    currencySymbol,
    popular,
    gradient = "gradient-blue",
    onSelect,
    isLoading,
  }: PackageCardProps,
) {
  return (
    <div
      className={cn(
        "relative rounded-2xl p-6 text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl",
        gradient,
        popular && "ring-2 ring-white/30",
      )}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-4 py-1 rounded-full text-xs font-semibold shadow-lg">
          Most Popular
        </div>
      )}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">{name}</h3>
        </div>
        <div>
          <div className="text-4xl font-bold tracking-tight">
            {currencySymbol}
            {price.toFixed(2)}
          </div>
          <div className="text-sm text-white/70 mt-1">
            {tokens} tokens
          </div>
          <div className="text-xs text-white/50 mt-1">
            {currencySymbol}
            {(price / tokens).toFixed(3)} per token
          </div>
        </div>
        <Button
          className="w-full bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
          onClick={() => onSelect(id)}
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Buy Now"}
        </Button>
      </div>
    </div>
  );
}
