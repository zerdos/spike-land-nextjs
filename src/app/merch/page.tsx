import { ProductCard } from "@/components/merch/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shop | Spike Land",
  description: "Premium photo merchandise - transform your images into beautiful products",
};

async function getProducts() {
  const products = await prisma.merchProduct.findMany({
    where: {
      isActive: true,
    },
    include: {
      category: true,
      variants: {
        where: { isActive: true },
        orderBy: { priceDelta: "asc" },
      },
    },
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "desc" },
    ],
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    retailPrice: Number(product.retailPrice),
    currency: product.currency,
    mockupTemplate: product.mockupTemplate,
    category: {
      name: product.category.name,
      slug: product.category.slug,
    },
    variants: product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      priceDelta: Number(v.priceDelta),
    })),
  }));
}

async function getCategories() {
  const categories = await prisma.merchCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return categories;
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

async function ProductGrid() {
  const products = await getProducts();

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No products available yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}

export default async function MerchPage() {
  const categories = await getCategories();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Photo Merchandise</h1>
        <p className="text-muted-foreground">
          Transform your enhanced images into premium products
        </p>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <Link
            href="/merch"
            className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap"
          >
            All Products
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/merch?category=${category.slug}`}
              className="px-4 py-2 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 text-sm font-medium whitespace-nowrap transition-colors"
            >
              {category.icon && <span className="mr-1">{category.icon}</span>}
              {category.name}
            </Link>
          ))}
        </div>
      )}

      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid />
      </Suspense>
    </div>
  );
}
