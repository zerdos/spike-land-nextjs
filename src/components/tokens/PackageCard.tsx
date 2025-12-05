"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PackageCardProps {
  id: string;
  name: string;
  tokens: number;
  price: number;
  currencySymbol: string;
  popular?: boolean;
  onSelect: (packageId: string) => void;
  isLoading?: boolean;
}

export function PackageCard(
  { id, name, tokens, price, currencySymbol, popular, onSelect, isLoading }: PackageCardProps,
) {
  return (
    <Card
      className={cn(
        "relative",
        popular && "border-primary shadow-lg",
      )}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
          Most Popular
        </div>
      )}
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{tokens} tokens</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-4">{currencySymbol}{price.toFixed(2)}</div>
        <div className="text-sm text-muted-foreground mb-4">
          {currencySymbol}
          {(price / tokens).toFixed(3)} per token
        </div>
        <Button
          className="w-full"
          onClick={() => onSelect(id)}
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Buy Now"}
        </Button>
      </CardContent>
    </Card>
  );
}
