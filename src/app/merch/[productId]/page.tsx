import prisma from "@/lib/prisma";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "./product-detail";

interface PageProps {
  params: Promise<{ productId: string; }>;
}

async function getProduct(productId: string) {
  const product = await prisma.merchProduct.findUnique({
    where: {
      id: productId,
      isActive: true,
    },
    include: {
      category: true,
      variants: {
        where: { isActive: true },
        orderBy: { priceDelta: "asc" },
      },
    },
  });

  if (!product) {
    return null;
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    retailPrice: Number(product.retailPrice),
    currency: product.currency,
    mockupTemplate: product.mockupTemplate,
    minWidth: product.minWidth,
    minHeight: product.minHeight,
    minDpi: product.minDpi,
    printAreaWidth: product.printAreaWidth,
    printAreaHeight: product.printAreaHeight,
    category: {
      id: product.category.id,
      name: product.category.name,
      slug: product.category.slug,
    },
    variants: product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      priceDelta: Number(v.priceDelta),
      attributes: v.attributes as Record<string, string> | undefined,
    })),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await getProduct(productId);

  if (!product) {
    return {
      title: "Product Not Found | Spike Land",
    };
  }

  return {
    title: `${product.name} | Spike Land`,
    description: product.description || `Create your custom ${product.name}`,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { productId } = await params;
  const product = await getProduct(productId);

  if (!product) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ProductDetail product={product} />
    </div>
  );
}
