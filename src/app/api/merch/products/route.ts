/**
 * Merch Products API
 *
 * GET /api/merch/products - List products with optional filters
 * POST /api/merch/products - Create a new product (admin only)
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/merch/products
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categorySlug = searchParams.get("category");
  const includeVariants = searchParams.get("includeVariants") === "true";
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const { data: products, error } = await tryCatch(
    prisma.merchProduct.findMany({
      where: {
        isActive: true,
        ...(categorySlug && {
          category: {
            slug: categorySlug,
          },
        }),
      },
      include: {
        category: true,
        ...(includeVariants && {
          variants: {
            where: { isActive: true },
            orderBy: { priceDelta: "asc" },
          },
        }),
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      take: limit,
      skip: offset,
    }),
  );

  if (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }

  // Transform Decimal to number for JSON serialization
  const transformedProducts = products.map((product) => ({
    ...product,
    basePrice: Number(product.basePrice),
    retailPrice: Number(product.retailPrice),
    variants: product.variants?.map((variant) => ({
      ...variant,
      priceDelta: Number(variant.priceDelta),
    })),
  }));

  return NextResponse.json({
    success: true,
    products: transformedProducts,
    pagination: {
      limit,
      offset,
      hasMore: products.length === limit,
    },
  });
}

// POST /api/merch/products (Admin only)
export async function POST(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: user, error: userError } = await tryCatch(
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    }),
  );

  if (userError || !user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: body, error: bodyError } = await tryCatch<{
    name: string;
    description?: string;
    categoryId: string;
    provider: "PRODIGI" | "PRINTFUL";
    providerSku: string;
    basePrice: number;
    retailPrice: number;
    minDpi?: number;
    minWidth?: number;
    minHeight?: number;
    printAreaWidth?: number;
    printAreaHeight?: number;
    mockupTemplate?: string;
  }>(request.json());

  if (bodyError || !body) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Validate required fields
  if (!body.name || !body.categoryId || !body.provider || !body.providerSku) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (body.basePrice <= 0 || body.retailPrice <= 0) {
    return NextResponse.json(
      { error: "Prices must be positive" },
      { status: 400 },
    );
  }

  const { data: product, error: createError } = await tryCatch(
    prisma.merchProduct.create({
      data: {
        name: body.name,
        description: body.description,
        categoryId: body.categoryId,
        provider: body.provider,
        providerSku: body.providerSku,
        basePrice: body.basePrice,
        retailPrice: body.retailPrice,
        minDpi: body.minDpi || 150,
        minWidth: body.minWidth || 1800,
        minHeight: body.minHeight || 1800,
        printAreaWidth: body.printAreaWidth,
        printAreaHeight: body.printAreaHeight,
        mockupTemplate: body.mockupTemplate,
      },
      include: {
        category: true,
      },
    }),
  );

  if (createError) {
    console.error("Error creating product:", createError);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    product: {
      ...product,
      basePrice: Number(product.basePrice),
      retailPrice: Number(product.retailPrice),
    },
  });
}
