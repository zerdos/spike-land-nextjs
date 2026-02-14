/**
 * Merch MCP Tools
 *
 * Merchandise management: product listing, cart, checkout, orders, and shipment tracking.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const ListProductsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  limit: z.number().optional().default(20).describe("Max products to return (default 20)."),
});

const AddToCartSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  variant_id: z.string().min(1).describe("Product variant ID to add."),
  quantity: z.number().optional().default(1).describe("Quantity to add (default 1)."),
});

const CheckoutSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  cart_id: z.string().min(1).describe("Cart ID to checkout."),
  shipping_address: z.string().min(1).describe("Shipping address for the order."),
});

const GetOrderSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  order_id: z.string().min(1).describe("Order ID to retrieve."),
});

const TrackShipmentSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  order_id: z.string().min(1).describe("Order ID to track shipment for."),
});

export function registerMerchTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "merch_list_products",
    description: "List available merchandise products for a workspace.",
    category: "merch",
    tier: "free",
    inputSchema: ListProductsSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof ListProductsSchema>): Promise<CallToolResult> =>
      safeToolCall("merch_list_products", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const products = await prisma.merchProduct.findMany({
          where: { workspaceId: workspace.id },
          include: { _count: { select: { variants: true } } },
          orderBy: { createdAt: "desc" },
          take: args.limit ?? 20,
        });

        if (products.length === 0) {
          return textResult("No merchandise products found in this workspace.");
        }

        let text = `**Merchandise Products (${products.length}):**\n\n`;
        for (const p of products) {
          const product = p as typeof p & { price?: number; status?: string; _count: { variants: number } };
          text += `- **${product.name}**\n`;
          text += `  Price: ${product.price ?? "N/A"} | Variants: ${product._count.variants} | Status: ${product.status ?? "active"}\n`;
          text += `  ID: ${product.id}\n\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "merch_add_to_cart",
    description: "Add a product variant to the shopping cart.",
    category: "merch",
    tier: "free",
    inputSchema: AddToCartSchema.shape,
    handler: async (args: z.infer<typeof AddToCartSchema>): Promise<CallToolResult> =>
      safeToolCall("merch_add_to_cart", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const variant = await prisma.merchVariant.findFirst({
          where: { id: args.variant_id },
        });
        if (!variant) {
          return textResult("**Error: NOT_FOUND**\nVariant not found.\n**Retryable:** false");
        }

        let cart = await prisma.merchCart.findFirst({
          where: { userId, workspaceId: workspace.id },
          include: { _count: { select: { items: true } } },
        });

        if (!cart) {
          cart = await prisma.merchCart.create({
            data: { userId, workspaceId: workspace.id },
            include: { _count: { select: { items: true } } },
          });
        }

        await prisma.merchCartItem.create({
          data: {
            cartId: cart.id,
            variantId: args.variant_id,
            quantity: args.quantity ?? 1,
          },
        });

        const updatedCart = await prisma.merchCart.findFirst({
          where: { id: cart.id },
          include: { _count: { select: { items: true } } },
        });

        const itemCount = (updatedCart as typeof updatedCart & { _count: { items: number } })?._count?.items ?? 0;

        return textResult(
          `**Cart Updated**\n\n` +
          `Added variant \`${args.variant_id}\` (qty: ${args.quantity ?? 1}) to cart.\n` +
          `**Cart ID:** ${cart.id}\n` +
          `**Total items:** ${itemCount}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "merch_checkout",
    description: "Checkout a cart and create an order.",
    category: "merch",
    tier: "free",
    inputSchema: CheckoutSchema.shape,
    handler: async (args: z.infer<typeof CheckoutSchema>): Promise<CallToolResult> =>
      safeToolCall("merch_checkout", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const cart = await prisma.merchCart.findFirst({
          where: { id: args.cart_id, workspaceId: workspace.id },
          include: { items: { include: { variant: true } } },
        });

        if (!cart) {
          return textResult("**Error: NOT_FOUND**\nCart not found.\n**Retryable:** false");
        }

        const cartWithItems = cart as typeof cart & { items: Array<{ quantity: number; variant: { price?: number } }> };
        const total = cartWithItems.items.reduce(
          (sum: number, item: { quantity: number; variant: { price?: number } }) =>
            sum + item.quantity * (item.variant.price ?? 0),
          0,
        );

        const order = await prisma.merchOrder.create({
          data: {
            workspaceId: workspace.id,
            userId,
            cartId: args.cart_id,
            status: "PENDING",
            shippingAddress: args.shipping_address,
            total,
          },
        });

        return textResult(
          `**Order Created**\n\n` +
          `**Order ID:** ${order.id}\n` +
          `**Total:** ${total}\n` +
          `**Status:** PENDING\n` +
          `**Shipping to:** ${args.shipping_address}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "merch_get_order",
    description: "Get details of a merchandise order.",
    category: "merch",
    tier: "free",
    inputSchema: GetOrderSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetOrderSchema>): Promise<CallToolResult> =>
      safeToolCall("merch_get_order", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const order = await prisma.merchOrder.findFirst({
          where: { id: args.order_id, workspaceId: workspace.id },
          include: {
            items: true,
            shipment: true,
          },
        });

        if (!order) {
          return textResult("**Error: NOT_FOUND**\nOrder not found.\n**Retryable:** false");
        }

        const orderData = order as typeof order & {
          status: string;
          total: number;
          shippingAddress: string;
          items: Array<{ id: string; quantity: number; variantId: string }>;
          shipment: { trackingNumber?: string; carrier?: string; status?: string } | null;
          createdAt: Date;
        };

        let text = `**Order Details**\n\n`;
        text += `**Order ID:** ${orderData.id}\n`;
        text += `**Status:** ${orderData.status}\n`;
        text += `**Total:** ${orderData.total}\n`;
        text += `**Shipping to:** ${orderData.shippingAddress}\n`;
        text += `**Created:** ${orderData.createdAt.toISOString()}\n\n`;

        if (orderData.items.length > 0) {
          text += `**Items (${orderData.items.length}):**\n`;
          for (const item of orderData.items) {
            text += `- Variant: ${item.variantId} x${item.quantity}\n`;
          }
        }

        if (orderData.shipment) {
          text += `\n**Shipment:**\n`;
          text += `- Tracking: ${orderData.shipment.trackingNumber ?? "N/A"}\n`;
          text += `- Carrier: ${orderData.shipment.carrier ?? "N/A"}\n`;
          text += `- Status: ${orderData.shipment.status ?? "N/A"}\n`;
        }

        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "merch_track_shipment",
    description: "Track shipment status for a merchandise order.",
    category: "merch",
    tier: "free",
    inputSchema: TrackShipmentSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof TrackShipmentSchema>): Promise<CallToolResult> =>
      safeToolCall("merch_track_shipment", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);

        const shipment = await prisma.merchShipment.findFirst({
          where: { orderId: args.order_id },
        });

        if (!shipment) {
          return textResult("**Error: NOT_FOUND**\nShipment not found for this order.\n**Retryable:** false");
        }

        const s = shipment as typeof shipment & {
          trackingNumber: string;
          carrier: string;
          status: string;
          estimatedDelivery?: Date | null;
          shippedAt?: Date | null;
        };

        let text = `**Shipment Tracking**\n\n`;
        text += `**Order ID:** ${args.order_id}\n`;
        text += `**Tracking Number:** ${s.trackingNumber}\n`;
        text += `**Carrier:** ${s.carrier}\n`;
        text += `**Status:** ${s.status}\n`;
        if (s.shippedAt) text += `**Shipped At:** ${s.shippedAt.toISOString()}\n`;
        if (s.estimatedDelivery) text += `**Estimated Delivery:** ${s.estimatedDelivery.toISOString()}\n`;

        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });
}
