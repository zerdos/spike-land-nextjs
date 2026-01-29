"use client";

/**
 * Individual variant card showing content and metrics
 *
 * Displays variant type, content, and performance metrics.
 * Resolves #840
 */

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AbTestVariant } from "@/types/ab-test";
import { Crown } from "lucide-react";

interface AbTestVariantCardProps {
  variant: AbTestVariant;
  isWinner?: boolean;
}

export function AbTestVariantCard({
  variant,
  isWinner = false,
}: AbTestVariantCardProps) {
  const conversionRate =
    variant.impressions > 0
      ? ((variant.clicks / variant.impressions) * 100).toFixed(2)
      : "0.00";

  return (
    <Card className={isWinner ? "border-primary" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">Variant</CardTitle>
            {isWinner && <Crown className="h-4 w-4 text-primary" />}
          </div>
          <Badge variant="outline">{variant.variationType}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm">{variant.content}</p>
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pt-2 border-t">
          <div>
            <div className="font-semibold text-foreground">
              {variant.impressions.toLocaleString()}
            </div>
            <div>Impressions</div>
          </div>
          <div>
            <div className="font-semibold text-foreground">
              {variant.clicks.toLocaleString()}
            </div>
            <div>Clicks</div>
          </div>
          <div>
            <div className="font-semibold text-foreground">
              {conversionRate}%
            </div>
            <div>CTR</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
