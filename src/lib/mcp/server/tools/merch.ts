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
  variant_id: z.string().optional().describe("Product variant ID (size, color, etc)."),
});

const GetCartSchema = z.object({});

const RemoveFromCartSchema = z.object({
  cart_item_id: z.string().min(1).describe("Cart item ID to remove."),
});

const CheckoutSchema = z.object({
  payment_method: z.enum(["stripe", "free"]).optional().default("stripe").describe("Payment method."),
  shipping_address: z.record(z.string(), z.unknown()).describe("Shipping address as JSON object."),
  customer_email: z.string().email().describe("Customer email for order confirmation."),
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
        const prisma = (await import("@/lib/prisma")).default;
        const where = category
          ? { category: { slug: category }, isActive: true }
          : { isActive: true };
        const products = await prisma.merchProduct.findMany({
          where,
          select: { id: true, name: true, retailPrice: true, categoryId: true, isActive: true },
          take: limit,
          orderBy: { name: "asc" },
        });
        if (products.length === 0) return textResult("No products found.");
        let text = `**Products (${products.length}):**\n\n`;
        for (const p of products) {
          text += `- **${p.name}** -- $${Number(p.retailPrice).toFixed(2)}\n  Category ID: ${p.categoryId} | ID: ${p.id}\n\n`;
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
        const prisma = (await import("@/lib/prisma")).default;
        const product = await prisma.merchProduct.findUnique({
          where: { id: product_id },
          include: {
            variants: { where: { isActive: true }, select: { id: true, name: true, priceDelta: true } },
            category: { select: { name: true } },
          },
        });
        if (!product) return textResult("**Error: NOT_FOUND**\nProduct not found.\n**Retryable:** false");
        const variantList = product.variants.map((v) => `${v.name} (+$${Number(v.priceDelta).toFixed(2)})`).join(", ");
        return textResult(
          `**${product.name}**\n\n` +
          `**Price:** $${Number(product.retailPrice).toFixed(2)}\n` +
          `**Category:** ${product.category.name}\n` +
          `**Active:** ${product.isActive}\n` +
          `**Description:** ${product.description}\n` +
          `**Variants:** ${variantList || "none"}`
        );
      }),
  });

  registry.register({
    name: "merch_add_to_cart",
    description: "Add a product to the shopping cart.",
    category: "merch",
    tier: "free",
    inputSchema: AddToCartSchema.shape,
    handler: async ({ product_id, quantity = 1, variant_id }: z.infer<typeof AddToCartSchema>): Promise<CallToolResult> =>
      safeToolCall("merch_add_to_cart", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        // Upsert the user's cart
        const cart = await prisma.merchCart.upsert({
          where: { userId },
          create: { userId },
          update: {},
        });
        const item = await prisma.merchCartItem.create({
          data: {
            cartId: cart.id,
            productId: product_id,
            quantity,
            ...(variant_id ? { variantId: variant_id } : {}),
          },
        });
        return textResult(`**Added to Cart!**\n\n**Item ID:** ${item.id}\n**Product:** ${product_id}\n**Quantity:** ${quantity}${variant_id ? `\n**Variant ID:** ${variant_id}` : ""}`);
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
        const prisma = (await import("@/lib/prisma")).default;
        const cart = await prisma.merchCart.findUnique({
          where: { userId },
          include: {
            items: {
              include: { product: { select: { name: true, retailPrice: true } } },
            },
          },
        });
        if (!cart || cart.items.length === 0) return textResult("Your cart is empty.");
        let total = 0;
        let text = `**Shopping Cart (${cart.items.length} items):**\n\n`;
        for (const item of cart.items) {
          const subtotal = Number(item.product.retailPrice) * item.quantity;
          total += subtotal;
          text += `- **${item.product.name}** x${item.quantity} -- $${subtotal.toFixed(2)}\n  ID: ${item.id}${item.variantId ? ` | Variant: ${item.variantId}` : ""}\n\n`;
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
        const prisma = (await import("@/lib/prisma")).default;
        await prisma.merchCartItem.delete({ where: { id: cart_item_id } });
        return textResult(`**Removed from cart!** Item ID: ${cart_item_id}`);
      }),
  });

  registry.register({
    name: "merch_checkout",
    description: "Checkout the current cart and create an order.",
    category: "merch",
    tier: "free",
    inputSchema: CheckoutSchema.shape,
    handler: async ({ payment_method = "stripe", shipping_address, customer_email }: z.infer<typeof CheckoutSchema>): Promise<CallToolResult> =>
      safeToolCall("merch_checkout", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const cart = await prisma.merchCart.findUnique({
          where: { userId },
          include: {
            items: {
              include: { product: { select: { retailPrice: true } } },
            },
          },
        });
        if (!cart || cart.items.length === 0) return textResult("Cart is empty. Nothing to checkout.");
        const subtotal = cart.items.reduce((s, i) => s + Number(i.product.retailPrice) * i.quantity, 0);
        const shippingCost = 0;
        const totalAmount = subtotal + shippingCost;
        const orderNumber = `ORD-${Date.now()}`;
        const order = await prisma.merchOrder.create({
          data: {
            userId,
            orderNumber,
            status: "PENDING",
            subtotal,
            shippingCost,
            totalAmount,
            shippingAddress: shipping_address as Record<string, string>,
            customerEmail: customer_email,
          },
        });
        await prisma.merchCartItem.deleteMany({ where: { cartId: cart.id } });
        return textResult(
          `**Order Created!**\n\n` +
          `**Order ID:** ${order.id}\n` +
          `**Order Number:** ${order.orderNumber}\n` +
          `**Items:** ${cart.items.length}\n` +
          `**Total:** $${Number(order.totalAmount).toFixed(2)}\n` +
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
        const prisma = (await import("@/lib/prisma")).default;
        const where = status === "ALL" ? { userId } : { userId, status };
        const orders = await prisma.merchOrder.findMany({
          where,
          select: { id: true, orderNumber: true, totalAmount: true, status: true, createdAt: true, _count: { select: { items: true } } },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        if (orders.length === 0) return textResult("No orders found.");
        let text = `**Orders (${orders.length}):**\n\n`;
        for (const o of orders) {
          text += `- **Order ${o.orderNumber}** [${o.status}] -- $${Number(o.totalAmount).toFixed(2)} (${o._count.items} items)\n  Date: ${o.createdAt.toISOString()}\n\n`;
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
        const prisma = (await import("@/lib/prisma")).default;
        const order = await prisma.merchOrder.findUnique({
          where: { id: order_id },
          select: { id: true, orderNumber: true, totalAmount: true, status: true, stripePaymentStatus: true, createdAt: true, _count: { select: { items: true } } },
        });
        if (!order) return textResult("**Error: NOT_FOUND**\nOrder not found.\n**Retryable:** false");
        return textResult(
          `**Order Details**\n\n` +
          `**ID:** ${order.id}\n` +
          `**Order Number:** ${order.orderNumber}\n` +
          `**Status:** ${order.status}\n` +
          `**Total:** $${Number(order.totalAmount).toFixed(2)}\n` +
          `**Items:** ${order._count.items}\n` +
          `**Payment Status:** ${order.stripePaymentStatus ?? "N/A"}\n` +
          `**Created:** ${order.createdAt.toISOString()}`
        );
      }),
  });
}
