import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  product: { findMany: vi.fn(), findUnique: vi.fn() },
  cartItem: { create: vi.fn(), findMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
  order: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import type { ToolRegistry } from "../tool-registry";
import { registerMerchTools } from "./merch";

function createMockRegistry(): ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> } {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const registry = {
    register: vi.fn((def: { name: string; handler: (...args: unknown[]) => unknown }) => { handlers.set(def.name, def.handler); }),
    handlers,
  };
  return registry as unknown as ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> };
}

function getText(result: unknown): string {
  return (result as { content: Array<{ text: string }> }).content[0]!.text;
}

describe("merch tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => { vi.clearAllMocks(); registry = createMockRegistry(); registerMerchTools(registry, userId); });

  it("should register 8 merch tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(8);
  });

  describe("merch_list_products", () => {
    it("should list products", async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: "p1", name: "T-Shirt", price: 29.99, category: "apparel", imageUrl: "https://example.com/tshirt.jpg", inStock: true },
      ]);
      const handler = registry.handlers.get("merch_list_products")!;
      const result = await handler({});
      expect(getText(result)).toContain("T-Shirt");
      expect(getText(result)).toContain("$29.99");
    });

    it("should return empty message", async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("merch_list_products")!;
      const result = await handler({});
      expect(getText(result)).toContain("No products found");
    });
  });

  describe("merch_get_product", () => {
    it("should return product details", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: "p1", name: "T-Shirt", description: "Soft cotton", price: 29.99, category: "apparel",
        imageUrl: "https://example.com/tshirt.jpg", inStock: true, variants: ["S", "M", "L"],
      });
      const handler = registry.handlers.get("merch_get_product")!;
      const result = await handler({ product_id: "p1" });
      expect(getText(result)).toContain("T-Shirt");
      expect(getText(result)).toContain("S, M, L");
    });

    it("should return NOT_FOUND", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("merch_get_product")!;
      const result = await handler({ product_id: "nope" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("merch_add_to_cart", () => {
    it("should add to cart", async () => {
      mockPrisma.cartItem.create.mockResolvedValue({ id: "ci1" });
      const handler = registry.handlers.get("merch_add_to_cart")!;
      const result = await handler({ product_id: "p1", quantity: 2, variant: "M" });
      expect(getText(result)).toContain("Added to Cart");
    });
  });

  describe("merch_get_cart", () => {
    it("should show cart with total", async () => {
      mockPrisma.cartItem.findMany.mockResolvedValue([
        { id: "ci1", quantity: 2, variant: "M", product: { name: "T-Shirt", price: 29.99 } },
      ]);
      const handler = registry.handlers.get("merch_get_cart")!;
      const result = await handler({});
      expect(getText(result)).toContain("T-Shirt");
      expect(getText(result)).toContain("$59.98");
    });

    it("should show empty cart", async () => {
      mockPrisma.cartItem.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("merch_get_cart")!;
      const result = await handler({});
      expect(getText(result)).toContain("cart is empty");
    });
  });

  describe("merch_remove_from_cart", () => {
    it("should remove item", async () => {
      mockPrisma.cartItem.delete.mockResolvedValue({});
      const handler = registry.handlers.get("merch_remove_from_cart")!;
      const result = await handler({ cart_item_id: "ci1" });
      expect(getText(result)).toContain("Removed from cart");
    });
  });

  describe("merch_checkout", () => {
    it("should create order and clear cart", async () => {
      mockPrisma.cartItem.findMany.mockResolvedValue([
        { quantity: 1, product: { price: 29.99 } },
      ]);
      mockPrisma.order.create.mockResolvedValue({ id: "ord-1" });
      mockPrisma.cartItem.deleteMany.mockResolvedValue({});
      const handler = registry.handlers.get("merch_checkout")!;
      const result = await handler({});
      expect(getText(result)).toContain("Order Created");
      expect(getText(result)).toContain("$29.99");
    });

    it("should reject empty cart checkout", async () => {
      mockPrisma.cartItem.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("merch_checkout")!;
      const result = await handler({});
      expect(getText(result)).toContain("Cart is empty");
    });
  });

  describe("merch_list_orders", () => {
    it("should list orders", async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { id: "ord-1", total: 29.99, status: "PAID", itemCount: 1, createdAt: new Date() },
      ]);
      const handler = registry.handlers.get("merch_list_orders")!;
      const result = await handler({});
      expect(getText(result)).toContain("ord-1");
      expect(getText(result)).toContain("PAID");
    });
  });

  describe("merch_get_order", () => {
    it("should return order details", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord-1", total: 29.99, status: "SHIPPED", paymentMethod: "stripe", itemCount: 1, createdAt: new Date(),
      });
      const handler = registry.handlers.get("merch_get_order")!;
      const result = await handler({ order_id: "ord-1" });
      expect(getText(result)).toContain("Order Details");
      expect(getText(result)).toContain("SHIPPED");
    });

    it("should return NOT_FOUND", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("merch_get_order")!;
      const result = await handler({ order_id: "nope" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });
});
