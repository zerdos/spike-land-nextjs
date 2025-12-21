"use client";

import { OrderStatusBadge } from "@/components/merch/order-status-badge";
import { ProductCard } from "@/components/merch/product-card";
import { VariantSelector } from "@/components/merch/variant-selector";
import { Section } from "@/components/storybook";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Sample product data for showcasing ProductCard
const sampleProducts = [
  {
    id: "prod-1",
    name: "Premium T-Shirt",
    description: "High-quality cotton t-shirt with your custom design",
    retailPrice: 24.99,
    currency: "GBP",
    mockupTemplate: null,
    category: { name: "Apparel", slug: "apparel" },
    variants: [
      { id: "v1", name: "S", priceDelta: 0 },
      { id: "v2", name: "M", priceDelta: 0 },
      { id: "v3", name: "L", priceDelta: 2 },
      { id: "v4", name: "XL", priceDelta: 3 },
    ],
  },
  {
    id: "prod-2",
    name: "Canvas Print",
    description: "Museum-quality canvas print",
    retailPrice: 49.99,
    currency: "GBP",
    mockupTemplate: null,
    category: { name: "Wall Art", slug: "wall-art" },
  },
  {
    id: "prod-3",
    name: "Phone Case",
    description: "Durable phone case with custom print",
    retailPrice: 19.99,
    currency: "GBP",
    mockupTemplate: null,
    category: { name: "Accessories", slug: "accessories" },
    variants: [
      { id: "v5", name: "iPhone 14", priceDelta: 0 },
      { id: "v6", name: "iPhone 15", priceDelta: 5 },
    ],
  },
];

// Sample variants for VariantSelector
const sizeVariants = [
  { id: "size-s", name: "Small", priceDelta: 0 },
  { id: "size-m", name: "Medium", priceDelta: 0 },
  { id: "size-l", name: "Large", priceDelta: 2 },
  { id: "size-xl", name: "X-Large", priceDelta: 3 },
  { id: "size-2xl", name: "2X-Large", priceDelta: 5 },
];

const attributeVariants = [
  { id: "attr-1", name: "Black / S", priceDelta: 0, attributes: { color: "Black", size: "S" } },
  { id: "attr-2", name: "Black / M", priceDelta: 0, attributes: { color: "Black", size: "M" } },
  { id: "attr-3", name: "Black / L", priceDelta: 2, attributes: { color: "Black", size: "L" } },
  { id: "attr-4", name: "White / S", priceDelta: 0, attributes: { color: "White", size: "S" } },
  { id: "attr-5", name: "White / M", priceDelta: 0, attributes: { color: "White", size: "M" } },
  { id: "attr-6", name: "White / L", priceDelta: 2, attributes: { color: "White", size: "L" } },
];

// All order statuses
const orderStatuses = [
  "PENDING",
  "PAYMENT_PENDING",
  "PAID",
  "SUBMITTED",
  "IN_PRODUCTION",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export default function MerchPage() {
  const [selectedSimple, setSelectedSimple] = useState<string>();
  const [selectedAttribute, setSelectedAttribute] = useState<string>();

  return (
    <div className="space-y-12">
      <Section
        title="Merch Components"
        description="Print-on-demand merchandise components for the shop"
      >
        {/* Cart Icon */}
        <Card>
          <CardHeader>
            <CardTitle>Cart Icon</CardTitle>
            <CardDescription>
              Shopping cart icon with badge showing item count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 items-center">
              <div className="text-center space-y-2">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  <span className="sr-only">Empty cart</span>
                </Button>
                <p className="text-xs text-muted-foreground">Empty</p>
              </div>
              <div className="text-center space-y-2">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  <Badge
                    variant="destructive"
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    3
                  </Badge>
                </Button>
                <p className="text-xs text-muted-foreground">3 items</p>
              </div>
              <div className="text-center space-y-2">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  <Badge
                    variant="destructive"
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    15
                  </Badge>
                </Button>
                <p className="text-xs text-muted-foreground">15 items</p>
              </div>
              <div className="text-center space-y-2">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  <Badge
                    variant="destructive"
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    99+
                  </Badge>
                </Button>
                <p className="text-xs text-muted-foreground">99+ items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Status Badge */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Badge</CardTitle>
            <CardDescription>
              Visual indicators for different order statuses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium mb-3">With Icons (default)</p>
              <div className="flex flex-wrap gap-3">
                {orderStatuses.map((status) => <OrderStatusBadge key={status} status={status} />)}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-3">Without Icons</p>
              <div className="flex flex-wrap gap-3">
                {orderStatuses.map((status) => (
                  <OrderStatusBadge key={status} status={status} showIcon={false} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Card */}
        <Card>
          <CardHeader>
            <CardTitle>Product Card</CardTitle>
            <CardDescription>
              Product display cards with image, name, price, and category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sampleProducts.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </CardContent>
        </Card>

        {/* Variant Selector - Simple */}
        <Card>
          <CardHeader>
            <CardTitle>Variant Selector - Simple</CardTitle>
            <CardDescription>
              Size selection with price display
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VariantSelector
              variants={sizeVariants}
              basePrice={24.99}
              currency="GBP"
              selectedVariantId={selectedSimple}
              onSelect={(variant) => setSelectedSimple(variant.id)}
            />
          </CardContent>
        </Card>

        {/* Variant Selector - With Attributes */}
        <Card>
          <CardHeader>
            <CardTitle>Variant Selector - With Attributes</CardTitle>
            <CardDescription>
              Grouped selection by color and size attributes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VariantSelector
              variants={attributeVariants}
              basePrice={29.99}
              currency="GBP"
              selectedVariantId={selectedAttribute}
              onSelect={(variant) => setSelectedAttribute(variant.id)}
            />
          </CardContent>
        </Card>

        {/* Image Selector Note */}
        <Card>
          <CardHeader>
            <CardTitle>Image Selector</CardTitle>
            <CardDescription>
              Image picker dialog for product customization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">
                The Image Selector component requires API access to display user images.
              </p>
              <p className="text-sm mt-2">
                Visit the{" "}
                <Link href="/merch" className="text-primary hover:underline">Merch Shop</Link>{" "}
                to see it in action.
              </p>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
