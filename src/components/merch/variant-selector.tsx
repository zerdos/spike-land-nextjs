"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Variant {
  id: string;
  name: string;
  priceDelta: number;
  attributes?: Record<string, string>;
}

interface VariantSelectorProps {
  variants: Variant[];
  basePrice: number;
  currency: string;
  selectedVariantId?: string;
  onSelect: (variant: Variant) => void;
}

export function VariantSelector({
  variants,
  basePrice,
  currency,
  selectedVariantId,
  onSelect,
}: VariantSelectorProps) {
  const [selected, setSelected] = useState<string | undefined>(
    selectedVariantId,
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(price);
  };

  const handleSelect = (variant: Variant) => {
    setSelected(variant.id);
    onSelect(variant);
  };

  if (variants.length === 0) {
    return null;
  }

  // Group variants by attribute type if they have attributes
  const hasAttributes = variants.some((v) => v.attributes && Object.keys(v.attributes).length > 0);

  if (!hasAttributes) {
    // Simple variant list (e.g., sizes)
    return (
      <div data-testid="variant-selector" className="space-y-2">
        <span id="variant-selector-label" className="text-sm font-medium">Select Size</span>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="variant-selector-label">
          {variants.map((variant) => {
            const totalPrice = basePrice + variant.priceDelta;
            const isSelected = selected === variant.id;

            return (
              <Button
                key={variant.id}
                data-testid="variant-option"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => handleSelect(variant)}
                className={cn(
                  "flex flex-col h-auto py-2 px-4",
                  isSelected && "ring-2 ring-primary ring-offset-2",
                )}
              >
                <span className="font-medium">{variant.name}</span>
                <span className="text-xs opacity-80">
                  {formatPrice(totalPrice)}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  // Group by first attribute key
  const attributeGroups = variants.reduce(
    (acc, variant) => {
      const attrs = variant.attributes || {};
      const keys = Object.keys(attrs);

      keys.forEach((key) => {
        const value = attrs[key];
        if (value !== undefined) {
          if (!acc[key]) {
            acc[key] = new Set();
          }
          acc[key].add(value);
        }
      });

      return acc;
    },
    {} as Record<string, Set<string>>,
  );

  return (
    <div data-testid="variant-selector" className="space-y-4">
      {Object.entries(attributeGroups).map(([attributeKey, values]) => (
        <div key={attributeKey} className="space-y-2">
          <span id={`variant-group-${attributeKey}`} className="text-sm font-medium capitalize">
            {attributeKey}
          </span>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-labelledby={`variant-group-${attributeKey}`}
          >
            {Array.from(values).map((value) => {
              const matchingVariant = variants.find(
                (v) =>
                  v.attributes?.[attributeKey] === value,
              );
              if (!matchingVariant) {
                return null;
              }

              const isSelected = selected === matchingVariant.id;

              return (
                <Button
                  key={value}
                  data-testid="variant-option"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelect(matchingVariant)}
                  className={cn(
                    isSelected && "ring-2 ring-primary ring-offset-2",
                  )}
                >
                  <span>{value}</span>
                  {matchingVariant.priceDelta !== 0 && (
                    <span className="ml-1 text-xs opacity-80">
                      ({matchingVariant.priceDelta > 0 ? "+" : ""}
                      {formatPrice(matchingVariant.priceDelta)})
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      ))}

      {selected && (
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            Total:{" "}
            <span className="font-semibold text-foreground">
              {formatPrice(
                basePrice +
                  (variants.find((v) => v.id === selected)?.priceDelta || 0),
              )}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
