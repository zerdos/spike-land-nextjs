/**
 * Merch MCP Tools
 *
 * Merchandise management, shopping cart, checkout, product browsing, and order history.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

const ListProductsSchema = z.object({
  category: z.string().optional().describe("Filter by product category."),
  limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
});

const GetProductSchema = z.object({
  product_id: z.string().min(1).describe("Product ID."),
});

const AddToCartSchema = z.object({
  product_id: z.string().min(1).describe("Product ID."),
  quantity: z.number().int().min(1).max(99).optional().default(1).describe("Quantity."),
  variant: z.string().optional().describe("Product variant (size, color, etc)."),
});

const GetCartSchema = z.object({});

const RemoveFromCartSchema = z.object({
  cart_item_id: z.string().min(1).describe("Cart item ID to remove."),
});

const CheckoutSchema = z.object({
  payment_method: z.enum(["stripe", "free"]).optional().default("stripe").describe("Payment method."),
});

const ListOrdersSchema = z.object({
  status: z.enum(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "ALL"]).optional().default("ALL").describe("Filter by status."),
  limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)."),
});

const GetOrderSchema = z.object({
  order_id: z.string().min(1).describe("Order ID."),
});

export function registerMerchTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "merch_list_products",
    description: "Browse available merchandise products with optional category filter.",
    category: "merch",
    tier: "free",
    inputSchema: ListProductsSchema.shape,
    handler: async ({ category, limit = 20 }: z.infer<typeof ListProductsSchema>): Promise<CallToolResult> =>
      safeToolCall("merch_list_products", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const where = category ? { category, active: true } : { active: true };
        const products = await prisma.product.findMany({
          where,
          select: { id: true, name: true, price: true, category: true, imageUrl: true, inStock: true },
          take: limit,
          orderBy: { name: "asc" },
        });
        if (products.length === 0) return textResult("No products found.");
        let text = `**Products (${products.length}):**\n\n`;
        for (const p of products) {
          text += `- **${p.name}** — $${p.price.toFixed(2)} ${p.inStock ? "" : "[OUT OF STOCK]"}\n  Category: ${p.category} | ID: ${p.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "merch_get_product",
    description: "Get full details for a specific product.",
    category: "merch",
    tier: "free",
    inputSchema: GetProductSchema.shape,
    handler: async ({ product_id }: z.infer<typeof GetProductSchema>): Promise<CallToolResult> =>
      safeToolCall("merch_get_product", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const product = await prisma.product.findUnique({
          where: { id: product_id },
          select: { id: true, name: true, description: true, price: true, category: true, imageUrl: true, inStock: true, variants: true },
        });
        if (!product) return textResult("**Error: NOT_FOUND**\nProduct not found.\n**Retryable:** false");
        return textResult(
          `**${product.name}**\n\n` +
          `**Price:** $${product.price.toFixed(2)}\n` +
          `**Category:** ${product.category}\n` +
          `**In Stock:** ${product.inStock}\n` +
          `**Description:** ${product.description}\n` +
          `**Variants:** ${(product.variants as string[])?.join(", ") || "none"}`
        );
      }),
  });

  registry.register({
    name: "merch_add_to_cart",
    description: "Add a product to the shopping cart.",
    category: "merch",
    tier: "free",
    inputSchema: AddToCartSchema.shape,
    handler: async ({ product_id, quantity = 1, variant }: z.infer<typeof AddToCartSchema>): Promise<CallToolResult> =>
      safeToolCall("merch_add_to_cart", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const item = await prisma.cartItem.create({
          data: { productId: product_id, quantity, variant, userId },
        });
        return textResult(`**Added to Cart!**\n\n**Item ID:** ${item.id}\n**Product:** ${product_id}\n**Quantity:** ${quantity}${variant ? `\n**Variant:** ${variant}` : ""}`);
      }),
  });

  registry.register({
    name: "merch_get_cart",
    description: "View the current shopping cart contents and total.",
    category: "merch",
    tier: "free",
    inputSchema: GetCartSchema.shape,
    handler: async (): Promise<CallToolResult> =>
      safeToolCall("merch_get_cart", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const items = await prisma.cartItem.findMany({
          where: { userId },
          include: { product: { select: { name: true, price: true } } },
        });
        if (items.length === 0) return textResult("Your cart is empty.");
        let total = 0;
        let text = `**Shopping Cart (${items.length} items):**\n\n`;
        for (const item of items) {
          const subtotal = item.product.price * item.quantity;
          total += subtotal;
          text += `- **${item.product.name}** x${item.quantity} — $${subtotal.toFixed(2)}\n  ID: ${item.id}${item.variant ? ` | Variant: ${item.variant}` : ""}\n\n`;
        }
        text += `**Total: $${total.toFixed(2)}**`;
        return textResult(text);
      }),
  });

  registry.register({
    name: "merch_remove_from_cart",
    description: "Remove an item from the shopping cart.",
    category: "merch",
    tier: "free",
    inputSchema: RemoveFromCartSchema.shape,
    handler: async ({ cart_item_id }: z.infer<typeof RemoveFromCartSchema>): Promise<CallToolResult> =>
      safeToolCall("merch_remove_from_cart", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        await prisma.cartItem.delete({ where: { id: cart_item_id } });
        return textResult(`**Removed from cart!** Item ID: ${cart_item_id}`);
      }),
  });

  registry.register({
    name: "merch_checkout",
    description: "Checkout the current cart and create an order.",
    category: "merch",
    tier: "free",
    inputSchema: CheckoutSchema.shape,
    handler: async ({ payment_method = "stripe" }: z.infer<typeof CheckoutSchema>): Promise<CallToolResult> =>
      safeToolCall("merch_checkout", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const items = await prisma.cartItem.findMany({
          where: { userId },
          include: { product: { select: { price: true } } },
        });
        if (items.length === 0) return textResult("Cart is empty. Nothing to checkout.");
        const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
        const order = await prisma.order.create({
          data: { userId, total, status: "PENDING", paymentMethod: payment_method, itemCount: items.length },
        });
        await prisma.cartItem.deleteMany({ where: { userId } });
        return textResult(
          `**Order Created!**\n\n` +
          `**Order ID:** ${order.id}\n` +
          `**Items:** ${items.length}\n` +
          `**Total:** $${total.toFixed(2)}\n` +
          `**Payment:** ${payment_method}\n` +
          `**Status:** PENDING`
        );
      }),
  });

  registry.register({
    name: "merch_list_orders",
    description: "List order history with optional status filter.",
    category: "merch",
    tier: "free",
    inputSchema: ListOrdersSchema.shape,
    handler: async ({ status = "ALL", limit = 10 }: z.infer<typeof ListOrdersSchema>): Promise<CallToolResult> =>
      safeToolCall("merch_list_orders", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const where = status === "ALL" ? { userId } : { userId, status };
        const orders = await prisma.order.findMany({
          where,
          select: { id: true, total: true, status: true, itemCount: true, createdAt: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        if (orders.length === 0) return textResult("No orders found.");
        let text = `**Orders (${orders.length}):**\n\n`;
        for (const o of orders) {
          text += `- **Order ${o.id}** [${o.status}] — $${o.total.toFixed(2)} (${o.itemCount} items)\n  Date: ${o.createdAt.toISOString()}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "merch_get_order",
    description: "Get full details for a specific order.",
    category: "merch",
    tier: "free",
    inputSchema: GetOrderSchema.shape,
    handler: async ({ order_id }: z.infer<typeof GetOrderSchema>): Promise<CallToolResult> =>
      safeToolCall("merch_get_order", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const order = await prisma.order.findUnique({
          where: { id: order_id },
          select: { id: true, total: true, status: true, paymentMethod: true, itemCount: true, createdAt: true },
        });
        if (!order) return textResult("**Error: NOT_FOUND**\nOrder not found.\n**Retryable:** false");
        return textResult(
          `**Order Details**\n\n` +
          `**ID:** ${order.id}\n` +
          `**Status:** ${order.status}\n` +
          `**Total:** $${order.total.toFixed(2)}\n` +
          `**Items:** ${order.itemCount}\n` +
          `**Payment:** ${order.paymentMethod}\n` +
          `**Created:** ${order.createdAt.toISOString()}`
        );
      }),
  });
}
