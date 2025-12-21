/**
 * Admin Merch Products List
 *
 * View and manage merchandise products.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { Edit, Package, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getProducts() {
  const products = await prisma.merchProduct.findMany({
    include: {
      category: true,
      variants: true,
      _count: {
        select: { orderItems: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    categoryName: product.category.name,
    provider: product.provider,
    providerSku: product.providerSku,
    basePrice: Number(product.basePrice),
    retailPrice: Number(product.retailPrice),
    currency: product.currency,
    isActive: product.isActive,
    mockupTemplate: product.mockupTemplate,
    variantCount: product.variants.length,
    orderCount: product._count.orderItems,
    createdAt: product.createdAt.toISOString(),
  }));
}

async function getCategories() {
  return prisma.merchCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: true } },
    },
  });
}

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(price);
  };

  const calculateMargin = (basePrice: number, retailPrice: number) => {
    if (retailPrice === 0) return 0;
    return Math.round(((retailPrice - basePrice) / retailPrice) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            {products.length} product{products.length !== 1 ? "s" : ""} across {categories.length}
            {" "}
            categor{categories.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/merch">Back to Dashboard</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/merch/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Categories overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {category.icon && <span className="text-xl">{category.icon}</span>}
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {category._count.products} product{category._count.products !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Products table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            All Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0
            ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No products yet</p>
                <Button asChild>
                  <Link href="/admin/merch/products/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Product
                  </Link>
                </Button>
              </div>
            )
            : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium">Product</th>
                      <th className="pb-3 font-medium">Category</th>
                      <th className="pb-3 font-medium">Provider</th>
                      <th className="pb-3 font-medium">Price</th>
                      <th className="pb-3 font-medium">Margin</th>
                      <th className="pb-3 font-medium">Variants</th>
                      <th className="pb-3 font-medium">Orders</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b last:border-0">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              {product.mockupTemplate
                                ? (
                                  <Image
                                    src={product.mockupTemplate}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                  />
                                )
                                : (
                                  <div className="flex h-full items-center justify-center">
                                    <span className="text-lg">🖼️</span>
                                  </div>
                                )}
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {product.providerSku}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <Badge variant="secondary">{product.categoryName}</Badge>
                        </td>
                        <td className="py-4 text-sm">{product.provider}</td>
                        <td className="py-4">
                          <div>
                            <p className="font-medium">
                              {formatPrice(product.retailPrice, product.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Cost: {formatPrice(product.basePrice, product.currency)}
                            </p>
                          </div>
                        </td>
                        <td className="py-4">
                          <Badge
                            variant={calculateMargin(product.basePrice, product.retailPrice) >= 40
                              ? "default"
                              : "outline"}
                          >
                            {calculateMargin(product.basePrice, product.retailPrice)}%
                          </Badge>
                        </td>
                        <td className="py-4">{product.variantCount}</td>
                        <td className="py-4">{product.orderCount}</td>
                        <td className="py-4">
                          <Badge variant={product.isActive ? "default" : "secondary"}>
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/admin/merch/products/${product.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
