"use client";

import { notifyCartUpdate } from "@/components/merch/cart-icon";
import { ImageSelector } from "@/components/merch/image-selector";
import { VariantSelector } from "@/components/merch/variant-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Check, ChevronLeft, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SelectedImage {
  type: "enhanced" | "upload";
  imageId?: string;
  imageUrl: string;
  width: number;
  height: number;
  r2Key?: string;
}

interface Variant {
  id: string;
  name: string;
  priceDelta: number;
  attributes?: Record<string, string>;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  retailPrice: number;
  currency: string;
  mockupTemplate: string | null;
  minWidth: number;
  minHeight: number;
  minDpi: number;
  printAreaWidth: number | null;
  printAreaHeight: number | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  variants: Variant[];
}

interface ProductDetailProps {
  product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants[0] ?? null,
  );
  const [customText, setCustomText] = useState("");
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: product.currency,
    }).format(price);
  };

  const totalPrice = product.retailPrice + (selectedVariant?.priceDelta || 0);

  const handleAddToCart = async () => {
    if (!selectedImage) {
      setError("Please select an image for your product");
      return;
    }

    if (product.variants.length > 0 && !selectedVariant) {
      setError("Please select a size/variant");
      return;
    }

    setIsAddingToCart(true);
    setError(null);

    try {
      const response = await fetch("/api/merch/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          variantId: selectedVariant?.id,
          imageId: selectedImage.type === "enhanced" ? selectedImage.imageId : undefined,
          uploadedImageUrl: selectedImage.type === "upload" ? selectedImage.imageUrl : undefined,
          uploadedImageR2Key: selectedImage.type === "upload" ? selectedImage.r2Key : undefined,
          quantity: 1,
          customText: customText.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add to cart");
      }

      setSuccess(true);
      notifyCartUpdate();

      // Redirect to cart after short delay
      setTimeout(() => {
        router.push("/cart");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to cart");
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/merch"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to products
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Product image/mockup */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            {product.mockupTemplate
              ? (
                <Image
                  src={product.mockupTemplate}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              )
              : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <span className="text-6xl">🖼️</span>
                </div>
              )}
          </div>

          {/* Image requirements info */}
          <div className="text-sm text-muted-foreground">
            <p>
              Minimum image size: {product.minWidth}x{product.minHeight}px
            </p>
            <p>Recommended resolution: {product.minDpi} DPI or higher</p>
          </div>
        </div>

        {/* Product details */}
        <div className="space-y-6">
          <div>
            <Badge variant="secondary" className="mb-2">
              {product.category.name}
            </Badge>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            {product.description && (
              <p className="mt-2 text-muted-foreground">{product.description}</p>
            )}
          </div>

          <div className="text-2xl font-bold">{formatPrice(totalPrice)}</div>

          {/* Variant selector */}
          {product.variants.length > 0 && (
            <VariantSelector
              variants={product.variants}
              basePrice={product.retailPrice}
              currency={product.currency}
              selectedVariantId={selectedVariant?.id}
              onSelect={setSelectedVariant}
            />
          )}

          {/* Image selector */}
          <div className="space-y-2">
            <Label>Your Image</Label>
            <ImageSelector
              minWidth={product.minWidth}
              minHeight={product.minHeight}
              onSelect={setSelectedImage}
              selectedImage={selectedImage}
            />
          </div>

          {/* Custom text (optional) */}
          <div className="space-y-2">
            <Label htmlFor="customText">
              Custom Text <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="customText"
              placeholder="Add any custom text for your product..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              maxLength={100}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {customText.length}/100 characters
            </p>
          </div>

          {/* Error/success messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <Check className="h-4 w-4" />
              <AlertDescription>
                Added to cart! Redirecting...
              </AlertDescription>
            </Alert>
          )}

          {/* Add to cart button */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleAddToCart}
            disabled={isAddingToCart || success || !selectedImage}
          >
            {isAddingToCart
              ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Adding...
                </span>
              )
              : (
                <span className="flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Add to Cart - {formatPrice(totalPrice)}
                </span>
              )}
          </Button>

          {/* Free shipping notice */}
          <p className="text-sm text-center text-muted-foreground">
            Free UK shipping on orders over £55
          </p>
        </div>
      </div>
    </div>
  );
}
