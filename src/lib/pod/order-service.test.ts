/**
 * Tests for POD Order Service
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateOrderNumber,
  getShippingQuote,
  submitOrderToPod,
  updateOrderFromWebhook,
} from "./order-service";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    merchOrder: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    merchOrderItem: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    merchOrderEvent: {
      create: vi.fn(),
    },
    merchProduct: {
      findMany: vi.fn(),
    },
    merchShipment: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) =>
      callback({
        merchOrderItem: { update: vi.fn() },
        merchOrder: { update: vi.fn() },
        merchOrderEvent: { create: vi.fn() },
        merchShipment: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
      })
    ),
  },
}));

vi.mock("./prodigi/client", () => ({
  prodigiProvider: {
    name: "PRODIGI",
    createOrder: vi.fn(),
    getQuote: vi.fn(),
  },
}));

const prisma = (await import("@/lib/prisma")).default;
const { prodigiProvider } = await import("./prodigi/client");

describe("Order Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateOrderNumber", () => {
    it("should generate order number with correct format", () => {
      const orderNumber = generateOrderNumber();
      expect(orderNumber).toMatch(/^SL-\d{8}-[A-Z0-9]{4}$/);
    });

    it("should include current date", () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const day = now.getDate().toString().padStart(2, "0");
      const expectedDate = `${year}${month}${day}`;

      const orderNumber = generateOrderNumber();
      expect(orderNumber).toContain(expectedDate);
    });

    it("should generate unique suffixes", () => {
      const numbers = new Set();
      for (let i = 0; i < 100; i++) {
        numbers.add(generateOrderNumber());
      }
      // With high probability, 100 random 4-char codes should be unique
      expect(numbers.size).toBeGreaterThan(95);
    });
  });

  describe("submitOrderToPod", () => {
    it("should submit order successfully", async () => {
      const mockOrder = {
        id: "order_123",
        orderNumber: "SL-20240101-A1B2",
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
        customerEmail: "john@example.com",
        items: [
          {
            id: "item_1",
            productId: "prod_1",
            variantId: null,
            quantity: 1,
            customText: null,
            product: {
              provider: "PRODIGI" as const,
              providerSku: "GLOBAL-POSTC-4X6",
            },
            variant: null,
          },
        ],
      };

      vi.mocked(prisma.merchOrder.findUnique).mockResolvedValue(mockOrder as any);
      vi.mocked(prodigiProvider.createOrder).mockResolvedValue({
        success: true,
        providerOrderId: "ord_prodigi_123",
        status: "InProgress",
      });

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          merchOrderItem: { update: vi.fn() },
          merchOrder: { update: vi.fn() },
          merchOrderEvent: { create: vi.fn() },
        };
        return callback(tx as any);
      });

      const result = await submitOrderToPod("order_123");

      expect(result.success).toBe(true);
      expect(result.providerOrderId).toBe("ord_prodigi_123");
      expect(prodigiProvider.createOrder).toHaveBeenCalledWith({
        orderId: "order_123",
        shippingAddress: expect.objectContaining({
          name: "John Doe",
          email: "john@example.com",
        }),
        shippingMethod: "Standard",
        items: [
          {
            sku: "GLOBAL-POSTC-4X6",
            quantity: 1,
            imageUrl: undefined,
            customText: undefined,
          },
        ],
        metadata: {
          orderNumber: "SL-20240101-A1B2",
          internalOrderId: "order_123",
        },
      });
    });

    it("should handle order not found", async () => {
      vi.mocked(prisma.merchOrder.findUnique).mockResolvedValue(null);

      const result = await submitOrderToPod("order_999");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Order not found");
    });

    it("should handle no Prodigi items", async () => {
      const mockOrder = {
        id: "order_123",
        items: [
          {
            product: {
              provider: "PRINTFUL" as const,
            },
          },
        ],
      };

      vi.mocked(prisma.merchOrder.findUnique).mockResolvedValue(mockOrder as any);

      const result = await submitOrderToPod("order_123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("No items for Prodigi provider");
    });

    it("should handle POD submission failure", async () => {
      const mockOrder = {
        id: "order_123",
        orderNumber: "SL-20240101-A1B2",
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
        customerEmail: "john@example.com",
        items: [
          {
            id: "item_1",
            product: {
              provider: "PRODIGI" as const,
              providerSku: "GLOBAL-POSTC-4X6",
            },
            variant: null,
          },
        ],
      };

      vi.mocked(prisma.merchOrder.findUnique).mockResolvedValue(mockOrder as any);
      vi.mocked(prodigiProvider.createOrder).mockResolvedValue({
        success: false,
        error: "Invalid SKU",
      });

      const result = await submitOrderToPod("order_123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid SKU");
      expect(prisma.merchOrderEvent.create).toHaveBeenCalledWith({
        data: {
          orderId: "order_123",
          type: "POD_SUBMISSION_FAILED",
          data: {
            error: "Invalid SKU",
            provider: "PRODIGI",
          },
        },
      });
    });

    it("should handle variant SKU", async () => {
      const mockOrder = {
        id: "order_123",
        orderNumber: "SL-20240101-A1B2",
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
        customerEmail: "john@example.com",
        items: [
          {
            id: "item_1",
            productId: "prod_1",
            variantId: "var_1",
            quantity: 1,
            customText: "Custom text",
            product: {
              provider: "PRODIGI" as const,
              providerSku: "GLOBAL-POSTC-4X6",
            },
            variant: {
              providerSku: "GLOBAL-POSTC-6X4-VARIANT",
            },
          },
        ],
      };

      vi.mocked(prisma.merchOrder.findUnique).mockResolvedValue(mockOrder as any);
      vi.mocked(prodigiProvider.createOrder).mockResolvedValue({
        success: true,
        providerOrderId: "ord_123",
        status: "InProgress",
      });

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          merchOrderItem: { update: vi.fn() },
          merchOrder: { update: vi.fn() },
          merchOrderEvent: { create: vi.fn() },
        };
        return callback(tx as any);
      });

      await submitOrderToPod("order_123");

      expect(prodigiProvider.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              sku: "GLOBAL-POSTC-6X4-VARIANT",
              customText: "Custom text",
            }),
          ],
        }),
      );
    });
  });

  describe("updateOrderFromWebhook", () => {
    it("should update order from webhook successfully", async () => {
      const mockItems = [
        {
          id: "item_1",
          order: { id: "order_123" },
        },
      ];

      vi.mocked(prisma.merchOrderItem.findMany).mockResolvedValue(mockItems as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          merchOrderItem: { update: vi.fn() },
          merchOrder: { update: vi.fn() },
          merchOrderEvent: { create: vi.fn() },
          merchShipment: { findFirst: vi.fn(), create: vi.fn() },
        };
        return callback(tx as any);
      });

      await updateOrderFromWebhook(
        "ord_prodigi_123",
        "PRODIGI",
        "in_production",
      );

      expect(prisma.merchOrderItem.findMany).toHaveBeenCalledWith({
        where: { podOrderId: "ord_prodigi_123" },
        include: { order: true },
      });
    });

    it("should create shipment with tracking info", async () => {
      const mockItems = [
        {
          id: "item_1",
          order: { id: "order_123" },
        },
      ];

      vi.mocked(prisma.merchOrderItem.findMany).mockResolvedValue(mockItems as any);

      const mockTx = {
        merchOrderItem: { update: vi.fn() },
        merchOrder: { update: vi.fn() },
        merchOrderEvent: { create: vi.fn() },
        merchShipment: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn(),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback(mockTx as any);
      });

      await updateOrderFromWebhook(
        "ord_prodigi_123",
        "PRODIGI",
        "shipped",
        "TRACK123",
        "https://track.example.com",
        "Royal Mail",
      );

      expect(mockTx.merchShipment.create).toHaveBeenCalledWith({
        data: {
          orderId: "order_123",
          provider: "PRODIGI",
          providerShipId: "ord_prodigi_123",
          trackingNumber: "TRACK123",
          trackingUrl: "https://track.example.com",
          carrier: "Royal Mail",
          status: "SHIPPED",
          shippedAt: expect.any(Date),
        },
      });
    });

    it("should update existing shipment", async () => {
      const mockItems = [
        {
          id: "item_1",
          order: { id: "order_123" },
        },
      ];

      const mockExistingShipment = {
        id: "ship_123",
        shippedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.merchOrderItem.findMany).mockResolvedValue(mockItems as any);

      const mockTx = {
        merchOrderItem: { update: vi.fn() },
        merchOrder: { update: vi.fn() },
        merchOrderEvent: { create: vi.fn() },
        merchShipment: {
          findFirst: vi.fn().mockResolvedValue(mockExistingShipment),
          update: vi.fn(),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback(mockTx as any);
      });

      await updateOrderFromWebhook(
        "ord_prodigi_123",
        "PRODIGI",
        "delivered",
        "TRACK123",
        "https://track.example.com",
        "Royal Mail",
      );

      expect(mockTx.merchShipment.update).toHaveBeenCalledWith({
        where: { id: "ship_123" },
        data: {
          trackingNumber: "TRACK123",
          trackingUrl: "https://track.example.com",
          carrier: "Royal Mail",
          status: "DELIVERED",
          shippedAt: mockExistingShipment.shippedAt,
          deliveredAt: expect.any(Date),
        },
      });
    });

    it("should handle no items found", async () => {
      vi.mocked(prisma.merchOrderItem.findMany).mockResolvedValue([]);

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await updateOrderFromWebhook("ord_999", "PRODIGI", "shipped");

      expect(consoleSpy).toHaveBeenCalledWith(
        "No order items found for provider order ID: ord_999",
      );

      consoleSpy.mockRestore();
    });

    it("should map provider status correctly", async () => {
      const testCases = [
        { providerStatus: "cancelled", expectedStatus: "CANCELLED" },
        { providerStatus: "delivered", expectedStatus: "DELIVERED" },
        { providerStatus: "complete", expectedStatus: "DELIVERED" },
        { providerStatus: "shipped", expectedStatus: "SHIPPED" },
        { providerStatus: "in_transit", expectedStatus: "SHIPPED" },
        { providerStatus: "in_production", expectedStatus: "IN_PRODUCTION" },
        { providerStatus: "printing", expectedStatus: "IN_PRODUCTION" },
        { providerStatus: "pending", expectedStatus: "SUBMITTED" },
      ];

      for (const { providerStatus, expectedStatus } of testCases) {
        vi.clearAllMocks();

        const mockItems = [{ id: "item_1", order: { id: "order_123" } }];
        vi.mocked(prisma.merchOrderItem.findMany).mockResolvedValue(mockItems as any);

        const mockTx = {
          merchOrderItem: { update: vi.fn() },
          merchOrder: { update: vi.fn() },
          merchOrderEvent: { create: vi.fn() },
          merchShipment: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
        };

        vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
          return callback(mockTx as any);
        });

        await updateOrderFromWebhook("ord_123", "PRODIGI", providerStatus);

        expect(mockTx.merchOrder.update).toHaveBeenCalledWith({
          where: { id: "order_123" },
          data: { status: expectedStatus },
        });
      }
    });
  });

  describe("getShippingQuote", () => {
    it("should get shipping quote successfully", async () => {
      const mockProducts = [
        {
          id: "prod_1",
          providerSku: "GLOBAL-POSTC-4X6",
          variants: [],
        },
      ];

      vi.mocked(prisma.merchProduct.findMany).mockResolvedValue(mockProducts as any);
      vi.mocked(prodigiProvider.getQuote).mockResolvedValue({
        currency: "GBP",
        items: [
          {
            sku: "GLOBAL-POSTC-4X6",
            quantity: 1,
            unitCost: 15.0,
            totalCost: 15.0,
          },
        ],
        shipping: [
          {
            method: "Standard",
            cost: 4.99,
            currency: "GBP",
          },
        ],
      });

      const result = await getShippingQuote(
        [{ productId: "prod_1", quantity: 1 }],
        {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
      );

      expect(result.itemsCost).toBe(15.0);
      expect(result.shippingCost).toBe(4.99);
      expect(result.totalCost).toBe(19.99);
      expect(result.currency).toBe("GBP");
    });

    it("should use variant SKU when provided", async () => {
      const mockProducts = [
        {
          id: "prod_1",
          providerSku: "GLOBAL-POSTC-4X6",
          variants: [
            {
              id: "var_1",
              providerSku: "GLOBAL-POSTC-6X4-VARIANT",
            },
          ],
        },
      ];

      vi.mocked(prisma.merchProduct.findMany).mockResolvedValue(mockProducts as any);
      vi.mocked(prodigiProvider.getQuote).mockResolvedValue({
        currency: "GBP",
        items: [
          {
            sku: "GLOBAL-POSTC-6X4-VARIANT",
            quantity: 1,
            unitCost: 18.0,
            totalCost: 18.0,
          },
        ],
        shipping: [{ method: "Standard", cost: 4.99, currency: "GBP" }],
      });

      await getShippingQuote(
        [{ productId: "prod_1", variantId: "var_1", quantity: 1 }],
        {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
      );

      expect(prodigiProvider.getQuote).toHaveBeenCalledWith(
        [{ sku: "GLOBAL-POSTC-6X4-VARIANT", quantity: 1 }],
        expect.any(Object),
      );
    });

    it("should throw error if product not found", async () => {
      vi.mocked(prisma.merchProduct.findMany).mockResolvedValue([]);

      await expect(
        getShippingQuote(
          [{ productId: "prod_999", quantity: 1 }],
          {
            name: "John Doe",
            line1: "123 Main St",
            city: "London",
            postalCode: "SW1A 1AA",
            countryCode: "GB",
          },
        ),
      ).rejects.toThrow("Product not found: prod_999");
    });
  });
});
