/**
 * Merch Order Detail API
 *
 * GET /api/merch/orders/[id] - Get order details
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { type NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string; }>;
}

// GET /api/merch/orders/[id]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { id } = await params;

  const { data: order, error } = await tryCatch(
    prisma.merchOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                mockupTemplate: true,
                category: {
                  select: {
                    name: true,
                    slug: true,
                  },
                },
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                attributes: true,
              },
            },
          },
        },
        shipments: {
          include: {
            items: true,
          },
          orderBy: { createdAt: "desc" },
        },
        events: {
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  );

  if (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 },
    );
  }

  if (!order) {
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 },
    );
  }

  // Check ownership (unless admin)
  const { data: user } = await tryCatch(
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    }),
  );

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  if (order.userId !== userId && !isAdmin) {
    return NextResponse.json(
      { error: "You do not have access to this order" },
      { status: 403 },
    );
  }

  // Transform for JSON serialization
  const transformedOrder = {
    ...order,
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    taxAmount: Number(order.taxAmount),
    totalAmount: Number(order.totalAmount),
    items: order.items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    })),
  };

  return NextResponse.json({
    success: true,
    order: transformedOrder,
  });
}
