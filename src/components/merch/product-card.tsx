"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description?: string | null;
    retailPrice: number;
    currency: string;
    mockupTemplate?: string | null;
    category: {
      name: string;
      slug: string;
    };
    variants?: Array<{
      id: string;
      name: string;
      priceDelta: number;
    }>;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const formattedPrice = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: product.currency,
  }).format(product.retailPrice);

  // Check if there are variants with different prices
  const hasVariants = product.variants && product.variants.length > 0;
  const minPrice = product.retailPrice;
  const maxPrice = hasVariants
    ? Math.max(
      ...product.variants!.map((v) => product.retailPrice + v.priceDelta),
    )
    : product.retailPrice;

  const priceDisplay = minPrice === maxPrice
    ? formattedPrice
    : `From ${formattedPrice}`;

  return (
    <Card
      data-testid="product-card"
      className="group overflow-hidden transition-all hover:shadow-lg"
    >
      <Link href={`/merch/${product.id}`}>
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.mockupTemplate
            ? (
              <Image
                src={product.mockupTemplate}
                alt={product.name}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            )
            : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <span className="text-4xl">🖼️</span>
              </div>
            )}
          <Badge
            variant="secondary"
            className="absolute left-2 top-2"
          >
            {product.category.name}
          </Badge>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold line-clamp-1">{product.name}</h3>
          {product.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {product.description}
            </p>
          )}
        </CardContent>
      </Link>
      <CardFooter className="flex items-center justify-between p-4 pt-0">
        <span className="text-lg font-bold">{priceDisplay}</span>
        <Button asChild size="sm">
          <Link href={`/merch/${product.id}`}>Customize</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
