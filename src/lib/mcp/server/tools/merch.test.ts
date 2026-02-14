import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  merchProduct: { findMany: vi.fn() },
  merchVariant: { findFirst: vi.fn() },
  merchCart: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
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
        { id: "prod-1", name: "T-Shirt", basePrice: 20, retailPrice: 25, isActive: true, _count: { variants: 3 }, createdAt: new Date("2025-01-01") },
        { id: "prod-2", name: "Mug", basePrice: 10, retailPrice: 15, isActive: true, _count: { variants: 1 }, createdAt: new Date("2025-01-02") },
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
      mockPrisma.merchVariant.findFirst.mockResolvedValue({ id: "var-1", productId: "prod-1", name: "Large" });
      mockPrisma.merchCart.findUnique
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
      mockPrisma.merchVariant.findFirst.mockResolvedValue({ id: "var-1", productId: "prod-1" });
      mockPrisma.merchCart.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "cart-new", _count: { items: 1 } });
      mockPrisma.merchCart.create.mockResolvedValue({ id: "cart-new", _count: { items: 0 } });
      mockPrisma.merchCartItem.create.mockResolvedValue({ id: "ci-1" });

      const handler = registry.handlers.get("merch_add_to_cart")!;
      const result = await handler({ workspace_slug: "my-ws", variant_id: "var-1" });
      const text = getText(result);
      expect(text).toContain("Cart Updated");
      expect(text).toContain("qty: 1");
      expect(mockPrisma.merchCart.create).toHaveBeenCalled();
    });

    it("should fallback to 0 items when updatedCart is null", async () => {
      mockPrisma.merchVariant.findFirst.mockResolvedValue({ id: "var-1", productId: "prod-1" });
      mockPrisma.merchCart.findUnique
        .mockResolvedValueOnce({ id: "cart-1", _count: { items: 1 } })
        .mockResolvedValueOnce(null);
      mockPrisma.merchCartItem.create.mockResolvedValue({ id: "ci-1" });

      const handler = registry.handlers.get("merch_add_to_cart")!;
      const result = await handler({ workspace_slug: "my-ws", variant_id: "var-1", quantity: 1 });
      const text = getText(result);
      expect(text).toContain("Cart Updated");
      expect(text).toContain("Total items:** 0");
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
          { quantity: 2, product: { retailPrice: 25 } },
          { quantity: 1, product: { retailPrice: 15 } },
        ],
      });
      mockPrisma.merchOrder.create.mockResolvedValue({
        id: "order-1",
        status: "PENDING",
        totalAmount: 65,
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
        orderNumber: "ORD-123",
        status: "SHIPPED",
        totalAmount: 50,
        shippingAddress: { address: "456 Oak Ave" },
        createdAt: new Date("2025-06-01"),
        items: [{ id: "oi-1", productName: "T-Shirt", variantName: "Large", quantity: 2 }],
        shipments: [{ trackingNumber: "TRK123", carrier: "UPS", status: "IN_TRANSIT" }],
      });

      const handler = registry.handlers.get("merch_get_order")!;
      const result = await handler({ workspace_slug: "my-ws", order_id: "order-1" });
      const text = getText(result);
      expect(text).toContain("Order Details");
      expect(text).toContain("SHIPPED");
      expect(text).toContain("50");
      expect(text).toContain("T-Shirt");
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

    it("should display 'default' when variantName is null", async () => {
      mockPrisma.merchOrder.findFirst.mockResolvedValue({
        id: "order-2",
        orderNumber: "ORD-456",
        status: "PENDING",
        totalAmount: 30,
        shippingAddress: { address: "789 Elm St" },
        createdAt: new Date("2025-07-01"),
        items: [{ id: "oi-2", productName: "Sticker Pack", variantName: null, quantity: 1 }],
        shipments: [],
      });

      const handler = registry.handlers.get("merch_get_order")!;
      const result = await handler({ workspace_slug: "my-ws", order_id: "order-2" });
      const text = getText(result);
      expect(text).toContain("Sticker Pack");
      expect(text).toContain("(default)");
      expect(text).not.toContain("Shipments");
    });

    it("should handle order with empty items and empty shipments", async () => {
      mockPrisma.merchOrder.findFirst.mockResolvedValue({
        id: "order-3",
        orderNumber: "ORD-789",
        status: "PENDING",
        totalAmount: 0,
        shippingAddress: { address: "100 Pine St" },
        createdAt: new Date("2025-08-01"),
        items: [],
        shipments: [],
      });

      const handler = registry.handlers.get("merch_get_order")!;
      const result = await handler({ workspace_slug: "my-ws", order_id: "order-3" });
      const text = getText(result);
      expect(text).toContain("Order Details");
      expect(text).toContain("ORD-789");
      expect(text).not.toContain("Items (");
      expect(text).not.toContain("Shipments (");
    });

    it("should display N/A for null trackingNumber and carrier in shipments", async () => {
      mockPrisma.merchOrder.findFirst.mockResolvedValue({
        id: "order-4",
        orderNumber: "ORD-999",
        status: "PROCESSING",
        totalAmount: 40,
        shippingAddress: { address: "200 Birch Rd" },
        createdAt: new Date("2025-09-01"),
        items: [],
        shipments: [{ trackingNumber: null, carrier: null, status: "LABEL_CREATED" }],
      });

      const handler = registry.handlers.get("merch_get_order")!;
      const result = await handler({ workspace_slug: "my-ws", order_id: "order-4" });
      const text = getText(result);
      expect(text).toContain("Shipments (1)");
      expect(text).toContain("Tracking: N/A");
      expect(text).toContain("Carrier: N/A");
      expect(text).toContain("LABEL_CREATED");
    });
  });

  describe("merch_track_shipment", () => {
    it("should return shipment tracking info", async () => {
      mockPrisma.merchShipment.findFirst.mockResolvedValue({
        trackingNumber: "TRK456",
        carrier: "FedEx",
        status: "DELIVERED",
        shippedAt: new Date("2025-06-01"),
        deliveredAt: new Date("2025-06-05"),
      });

      const handler = registry.handlers.get("merch_track_shipment")!;
      const result = await handler({ workspace_slug: "my-ws", order_id: "order-1" });
      const text = getText(result);
      expect(text).toContain("Shipment Tracking");
      expect(text).toContain("TRK456");
      expect(text).toContain("FedEx");
      expect(text).toContain("DELIVERED");
      expect(text).toContain("Delivered At");
    });

    it("should return error for missing shipment", async () => {
      mockPrisma.merchShipment.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("merch_track_shipment")!;
      const result = await handler({ workspace_slug: "my-ws", order_id: "bad-id" });
      const text = getText(result);
      expect(text).toContain("NOT_FOUND");
      expect(text).toContain("Shipment not found");
    });

    it("should display N/A for null trackingNumber and carrier", async () => {
      mockPrisma.merchShipment.findFirst.mockResolvedValue({
        trackingNumber: null,
        carrier: null,
        status: "LABEL_CREATED",
        shippedAt: null,
        deliveredAt: null,
      });

      const handler = registry.handlers.get("merch_track_shipment")!;
      const result = await handler({ workspace_slug: "my-ws", order_id: "order-1" });
      const text = getText(result);
      expect(text).toContain("Shipment Tracking");
      expect(text).toContain("Tracking Number:** N/A");
      expect(text).toContain("Carrier:** N/A");
      expect(text).toContain("LABEL_CREATED");
      expect(text).not.toContain("Shipped At");
      expect(text).not.toContain("Delivered At");
    });

    it("should show shippedAt but not deliveredAt when only shipped", async () => {
      mockPrisma.merchShipment.findFirst.mockResolvedValue({
        trackingNumber: "TRK789",
        carrier: "DHL",
        status: "IN_TRANSIT",
        shippedAt: new Date("2025-07-10"),
        deliveredAt: null,
      });

      const handler = registry.handlers.get("merch_track_shipment")!;
      const result = await handler({ workspace_slug: "my-ws", order_id: "order-1" });
      const text = getText(result);
      expect(text).toContain("TRK789");
      expect(text).toContain("DHL");
      expect(text).toContain("Shipped At");
      expect(text).not.toContain("Delivered At");
    });
  });
});
