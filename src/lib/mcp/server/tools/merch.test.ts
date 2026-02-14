import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  merchProduct: { findMany: vi.fn() },
  merchVariant: { findFirst: vi.fn() },
  merchCart: { findFirst: vi.fn(), create: vi.fn() },
  merchCartItem: { create: vi.fn() },
  merchOrder: { create: vi.fn(), findFirst: vi.fn() },
  merchShipment: { findFirst: vi.fn() },
  workspace: { findFirst: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerMerchTools } from "./merch";

const WORKSPACE = { id: "ws-1", slug: "my-ws", name: "My Workspace" };

describe("merch tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerMerchTools(registry, userId);
    mockPrisma.workspace.findFirst.mockResolvedValue(WORKSPACE);
  });

  it("should register 5 merch tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.handlers.has("merch_list_products")).toBe(true);
    expect(registry.handlers.has("merch_add_to_cart")).toBe(true);
    expect(registry.handlers.has("merch_checkout")).toBe(true);
    expect(registry.handlers.has("merch_get_order")).toBe(true);
    expect(registry.handlers.has("merch_track_shipment")).toBe(true);
  });

  describe("merch_list_products", () => {
    it("should list products with variant counts", async () => {
      mockPrisma.merchProduct.findMany.mockResolvedValue([
        { id: "prod-1", name: "T-Shirt", price: 25, status: "active", _count: { variants: 3 }, createdAt: new Date("2025-01-01") },
        { id: "prod-2", name: "Mug", price: 15, status: "active", _count: { variants: 1 }, createdAt: new Date("2025-01-02") },
      ]);

      const handler = registry.handlers.get("merch_list_products")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Merchandise Products (2)");
      expect(text).toContain("T-Shirt");
      expect(text).toContain("Mug");
      expect(text).toContain("Variants: 3");
      expect(text).toContain("Variants: 1");
    });

    it("should handle empty product list", async () => {
      mockPrisma.merchProduct.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("merch_list_products")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("No merchandise products found");
    });
  });

  describe("merch_add_to_cart", () => {
    it("should add item to existing cart", async () => {
      mockPrisma.merchVariant.findFirst.mockResolvedValue({ id: "var-1", name: "Large" });
      mockPrisma.merchCart.findFirst
        .mockResolvedValueOnce({ id: "cart-1", _count: { items: 1 } })
        .mockResolvedValueOnce({ id: "cart-1", _count: { items: 2 } });
      mockPrisma.merchCartItem.create.mockResolvedValue({ id: "ci-1" });

      const handler = registry.handlers.get("merch_add_to_cart")!;
      const result = await handler({ workspace_slug: "my-ws", variant_id: "var-1", quantity: 2 });
      const text = getText(result);
      expect(text).toContain("Cart Updated");
      expect(text).toContain("var-1");
      expect(text).toContain("qty: 2");
      expect(text).toContain("Total items:** 2");
    });

    it("should create new cart when none exists", async () => {
      mockPrisma.merchVariant.findFirst.mockResolvedValue({ id: "var-1" });
      mockPrisma.merchCart.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "cart-new", _count: { items: 1 } });
      mockPrisma.merchCart.create.mockResolvedValue({ id: "cart-new", _count: { items: 0 } });
      mockPrisma.merchCartItem.create.mockResolvedValue({ id: "ci-1" });

      const handler = registry.handlers.get("merch_add_to_cart")!;
      const result = await handler({ workspace_slug: "my-ws", variant_id: "var-1" });
      const text = getText(result);
      expect(text).toContain("Cart Updated");
      expect(mockPrisma.merchCart.create).toHaveBeenCalled();
    });

    it("should return error for missing variant", async () => {
      mockPrisma.merchVariant.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("merch_add_to_cart")!;
      const result = await handler({ workspace_slug: "my-ws", variant_id: "bad-id" });
      const text = getText(result);
      expect(text).toContain("NOT_FOUND");
      expect(text).toContain("Variant not found");
    });
  });

  describe("merch_checkout", () => {
    it("should create an order from cart", async () => {
      mockPrisma.merchCart.findFirst.mockResolvedValue({
        id: "cart-1",
        items: [
          { quantity: 2, variant: { price: 25 } },
          { quantity: 1, variant: { price: 15 } },
        ],
      });
      mockPrisma.merchOrder.create.mockResolvedValue({
        id: "order-1",
        status: "PENDING",
        total: 65,
      });

      const handler = registry.handlers.get("merch_checkout")!;
      const result = await handler({ workspace_slug: "my-ws", cart_id: "cart-1", shipping_address: "123 Main St" });
      const text = getText(result);
      expect(text).toContain("Order Created");
      expect(text).toContain("order-1");
      expect(text).toContain("65");
      expect(text).toContain("PENDING");
      expect(text).toContain("123 Main St");
    });

    it("should return error for missing cart", async () => {
      mockPrisma.merchCart.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("merch_checkout")!;
      const result = await handler({ workspace_slug: "my-ws", cart_id: "bad-cart", shipping_address: "123 Main St" });
      const text = getText(result);
      expect(text).toContain("NOT_FOUND");
      expect(text).toContain("Cart not found");
    });
  });

  describe("merch_get_order", () => {
    it("should return order details with items and shipment", async () => {
      mockPrisma.merchOrder.findFirst.mockResolvedValue({
        id: "order-1",
        status: "SHIPPED",
        total: 50,
        shippingAddress: "456 Oak Ave",
        createdAt: new Date("2025-06-01"),
        items: [{ id: "oi-1", variantId: "var-1", quantity: 2 }],
        shipment: { trackingNumber: "TRK123", carrier: "UPS", status: "IN_TRANSIT" },
      });

      const handler = registry.handlers.get("merch_get_order")!;
      const result = await handler({ workspace_slug: "my-ws", order_id: "order-1" });
      const text = getText(result);
      expect(text).toContain("Order Details");
      expect(text).toContain("SHIPPED");
      expect(text).toContain("50");
      expect(text).toContain("var-1");
      expect(text).toContain("TRK123");
      expect(text).toContain("UPS");
    });

    it("should return error for missing order", async () => {
      mockPrisma.merchOrder.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("merch_get_order")!;
      const result = await handler({ workspace_slug: "my-ws", order_id: "bad-id" });
      const text = getText(result);
      expect(text).toContain("NOT_FOUND");
    });
  });

  describe("merch_track_shipment", () => {
    it("should return shipment tracking info", async () => {
      mockPrisma.merchShipment.findFirst.mockResolvedValue({
        trackingNumber: "TRK456",
        carrier: "FedEx",
        status: "DELIVERED",
        shippedAt: new Date("2025-06-01"),
        estimatedDelivery: new Date("2025-06-05"),
      });

      const handler = registry.handlers.get("merch_track_shipment")!;
      const result = await handler({ workspace_slug: "my-ws", order_id: "order-1" });
      const text = getText(result);
      expect(text).toContain("Shipment Tracking");
      expect(text).toContain("TRK456");
      expect(text).toContain("FedEx");
      expect(text).toContain("DELIVERED");
      expect(text).toContain("Estimated Delivery");
    });

    it("should return error for missing shipment", async () => {
      mockPrisma.merchShipment.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("merch_track_shipment")!;
      const result = await handler({ workspace_slug: "my-ws", order_id: "bad-id" });
      const text = getText(result);
      expect(text).toContain("NOT_FOUND");
      expect(text).toContain("Shipment not found");
    });
  });
});
