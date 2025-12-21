/**
 * Merch Cart API
 *
 * GET /api/merch/cart - Get current user's cart
 * POST /api/merch/cart - Add item to cart
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/merch/cart
export async function GET() {
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get or create cart
  const { data: cart, error: cartError } = await tryCatch(
    prisma.merchCart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
            variant: true,
            image: {
              select: {
                id: true,
                name: true,
                originalUrl: true,
                originalWidth: true,
                originalHeight: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  );

  if (cartError) {
    console.error("Error fetching cart:", cartError);
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 },
    );
  }

  // Calculate totals
  let subtotal = 0;
  const transformedItems = cart.items.map((item) => {
    const basePrice = Number(item.product.retailPrice);
    const priceDelta = item.variant ? Number(item.variant.priceDelta) : 0;
    const unitPrice = basePrice + priceDelta;
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;

    return {
      ...item,
      unitPrice,
      lineTotal,
      product: {
        ...item.product,
        basePrice: Number(item.product.basePrice),
        retailPrice: Number(item.product.retailPrice),
      },
      variant: item.variant
        ? {
          ...item.variant,
          priceDelta: Number(item.variant.priceDelta),
        }
        : null,
    };
  });

  return NextResponse.json({
    success: true,
    cart: {
      id: cart.id,
      items: transformedItems,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      currency: "GBP",
    },
  });
}

// POST /api/merch/cart - Add item to cart
export async function POST(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const { data: body, error: bodyError } = await tryCatch<{
    productId: string;
    variantId?: string;
    imageId?: string; // EnhancedImage reference
    uploadedImageR2Key?: string; // Direct upload
    uploadedImageUrl?: string;
    quantity?: number;
    customText?: string;
  }>(request.json());

  if (bodyError || !body) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Validate required fields
  if (!body.productId) {
    return NextResponse.json(
      { error: "Product ID is required" },
      { status: 400 },
    );
  }

  // Validate image source (must have one)
  if (!body.imageId && !body.uploadedImageR2Key) {
    return NextResponse.json(
      { error: "Either imageId or uploadedImageR2Key is required" },
      { status: 400 },
    );
  }

  // Validate product exists
  const { data: product, error: productError } = await tryCatch(
    prisma.merchProduct.findUnique({
      where: { id: body.productId, isActive: true },
      include: { variants: true },
    }),
  );

  if (productError || !product) {
    return NextResponse.json(
      { error: "Product not found" },
      { status: 404 },
    );
  }

  // Validate variant if provided
  if (body.variantId) {
    const variantExists = product.variants.some(
      (v) => v.id === body.variantId && v.isActive,
    );
    if (!variantExists) {
      return NextResponse.json(
        { error: "Variant not found" },
        { status: 404 },
      );
    }
  }

  // Validate image if using existing EnhancedImage
  if (body.imageId) {
    const { data: image, error: imageError } = await tryCatch(
      prisma.enhancedImage.findUnique({
        where: { id: body.imageId },
        select: {
          id: true,
          userId: true,
          originalWidth: true,
          originalHeight: true,
        },
      }),
    );

    if (imageError || !image) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 },
      );
    }

    // Verify user owns the image
    if (image.userId !== userId) {
      return NextResponse.json(
        { error: "You do not have access to this image" },
        { status: 403 },
      );
    }

    // Validate image dimensions
    if (
      image.originalWidth < product.minWidth ||
      image.originalHeight < product.minHeight
    ) {
      return NextResponse.json(
        {
          error: `Image too small. Minimum size: ${product.minWidth}x${product.minHeight}px`,
        },
        { status: 400 },
      );
    }
  }

  // Get or create cart
  const { data: cart, error: cartCreateError } = await tryCatch(
    prisma.merchCart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
  );

  if (cartCreateError || !cart) {
    console.error("Error creating cart:", cartCreateError);
    return NextResponse.json(
      { error: "Failed to create cart" },
      { status: 500 },
    );
  }

  // Check if item already exists in cart
  const { data: existingItem, error: existingError } = await tryCatch(
    prisma.merchCartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: body.productId,
        variantId: body.variantId || null,
        imageId: body.imageId || null,
        uploadedImageR2Key: body.uploadedImageR2Key || null,
      },
    }),
  );

  if (existingError) {
    console.error("Error checking existing item:", existingError);
    return NextResponse.json(
      { error: "Failed to check cart" },
      { status: 500 },
    );
  }

  const quantity = body.quantity || 1;

  if (existingItem) {
    // Update quantity
    const { data: updatedItem, error: updateError } = await tryCatch(
      prisma.merchCartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: {
          product: true,
          variant: true,
        },
      }),
    );

    if (updateError) {
      console.error("Error updating cart item:", updateError);
      return NextResponse.json(
        { error: "Failed to update cart" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      item: {
        ...updatedItem,
        product: {
          ...updatedItem.product,
          basePrice: Number(updatedItem.product.basePrice),
          retailPrice: Number(updatedItem.product.retailPrice),
        },
        variant: updatedItem.variant
          ? {
            ...updatedItem.variant,
            priceDelta: Number(updatedItem.variant.priceDelta),
          }
          : null,
      },
      action: "updated",
    });
  }

  // Create new cart item
  const { data: newItem, error: createError } = await tryCatch(
    prisma.merchCartItem.create({
      data: {
        cartId: cart.id,
        productId: body.productId,
        variantId: body.variantId || null,
        imageId: body.imageId || null,
        uploadedImageR2Key: body.uploadedImageR2Key || null,
        uploadedImageUrl: body.uploadedImageUrl || null,
        quantity,
        customText: body.customText || null,
      },
      include: {
        product: true,
        variant: true,
      },
    }),
  );

  if (createError) {
    console.error("Error creating cart item:", createError);
    return NextResponse.json(
      { error: "Failed to add to cart" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    item: {
      ...newItem,
      product: {
        ...newItem.product,
        basePrice: Number(newItem.product.basePrice),
        retailPrice: Number(newItem.product.retailPrice),
      },
      variant: newItem.variant
        ? {
          ...newItem.variant,
          priceDelta: Number(newItem.variant.priceDelta),
        }
        : null,
    },
    action: "created",
  });
}
