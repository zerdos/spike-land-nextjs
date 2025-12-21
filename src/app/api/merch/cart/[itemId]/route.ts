/**
 * Merch Cart Item API
 *
 * PATCH /api/merch/cart/[itemId] - Update item quantity
 * DELETE /api/merch/cart/[itemId] - Remove item from cart
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { type NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ itemId: string; }>;
}

// PATCH /api/merch/cart/[itemId]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { itemId } = await params;

  const { data: body, error: bodyError } = await tryCatch<{
    quantity?: number;
    customText?: string;
  }>(request.json());

  if (bodyError) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Find the cart item and verify ownership
  const { data: item, error: findError } = await tryCatch(
    prisma.merchCartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
      },
    }),
  );

  if (findError || !item) {
    return NextResponse.json(
      { error: "Cart item not found" },
      { status: 404 },
    );
  }

  if (item.cart.userId !== userId) {
    return NextResponse.json(
      { error: "You do not have access to this cart item" },
      { status: 403 },
    );
  }

  // Validate quantity
  if (body?.quantity !== undefined && (body.quantity < 1 || body.quantity > 100)) {
    return NextResponse.json(
      { error: "Quantity must be between 1 and 100" },
      { status: 400 },
    );
  }

  // Update the item
  const { data: updatedItem, error: updateError } = await tryCatch(
    prisma.merchCartItem.update({
      where: { id: itemId },
      data: {
        ...(body?.quantity !== undefined && { quantity: body.quantity }),
        ...(body?.customText !== undefined && { customText: body.customText }),
      },
      include: {
        product: true,
        variant: true,
      },
    }),
  );

  if (updateError) {
    console.error("Error updating cart item:", updateError);
    return NextResponse.json(
      { error: "Failed to update cart item" },
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
  });
}

// DELETE /api/merch/cart/[itemId]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { itemId } = await params;

  // Find the cart item and verify ownership
  const { data: item, error: findError } = await tryCatch(
    prisma.merchCartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
      },
    }),
  );

  if (findError || !item) {
    return NextResponse.json(
      { error: "Cart item not found" },
      { status: 404 },
    );
  }

  if (item.cart.userId !== userId) {
    return NextResponse.json(
      { error: "You do not have access to this cart item" },
      { status: 403 },
    );
  }

  // Delete the item
  const { error: deleteError } = await tryCatch(
    prisma.merchCartItem.delete({
      where: { id: itemId },
    }),
  );

  if (deleteError) {
    console.error("Error deleting cart item:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete cart item" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Item removed from cart",
  });
}
