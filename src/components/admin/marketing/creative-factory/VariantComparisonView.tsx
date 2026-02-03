"use client";

import { Card, CardContent } from "@/components/ui/card";
import { type CreativeVariant } from "@prisma/client";

interface VariantComparisonViewProps {
  variants: CreativeVariant[];
}

export function VariantComparisonView({ variants }: VariantComparisonViewProps) {
  if (!variants || variants.length < 2) return null;

  return (
    <div className="grid grid-cols-2 gap-4">
      {variants.slice(0, 2).map((variant) => (
        <Card key={variant.id}>
          <CardContent className="p-4">
            <h4 className="font-bold mb-2">Variant {variant.variantNumber}</h4>
            <div className="space-y-2">
              <p className="font-medium">{variant.headline}</p>
              <p className="text-sm">{variant.bodyText}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
