/**
 * Tests for Prodigi API Client
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { prodigiProvider, validateImageForProduct } from "./client";
import type {
  ProdigiCancelResponse,
  ProdigiOrderResponse,
  ProdigiOrderStatusResponse,
  ProdigiQuoteResponse,
} from "./types";

// Mock environment variables
const mockEnv = (vars: Record<string, string | undefined>) => {
  Object.keys(vars).forEach((key) => {
    if (vars[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = vars[key];
    }
  });
};

// Mock fetch
global.fetch = vi.fn();

describe("Prodigi Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv({
      PRODIGI_API_KEY: "test-api-key",
      PRODIGI_SANDBOX: "true",
    });
  });

  describe("createOrder", () => {
    it("should create an order successfully", async () => {
      const mockResponse: ProdigiOrderResponse = {
        outcome: "Created",
        order: {
          id: "ord_123",
          created: "2024-01-01T00:00:00Z",
          lastUpdated: "2024-01-01T00:00:00Z",
          merchantReference: "test-order-1",
          shippingMethod: "Standard",
          status: {
            stage: "InProgress",
            details: {
              downloadAssets: "NotStarted",
              printReadyAssetsPrepared: "NotStarted",
              allocateProductionLocation: "NotStarted",
              inProduction: "NotStarted",
              shipping: "NotStarted",
            },
          },
          charges: [],
          shipments: [],
          recipient: {
            name: "John Doe",
            address: {
              line1: "123 Main St",
              townOrCity: "London",
              postalOrZipCode: "SW1A 1AA",
              countryCode: "GB",
            },
          },
          items: [],
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await prodigiProvider.createOrder({
        orderId: "test-order-1",
        items: [
          {
            sku: "GLOBAL-POSTC-4X6",
            quantity: 1,
            imageUrl: "https://example.com/image.jpg",
          },
        ],
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
      });

      expect(result.success).toBe(true);
      expect(result.providerOrderId).toBe("ord_123");
      expect(result.status).toBe("InProgress");
      expect(fetch).toHaveBeenCalledWith(
        "https://api.sandbox.prodigi.com/v4.0/orders",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "X-API-Key": "test-api-key",
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("should handle CreatedWithIssues outcome", async () => {
      const mockResponse: ProdigiOrderResponse = {
        outcome: "CreatedWithIssues",
        order: {
          id: "ord_123",
          created: "2024-01-01T00:00:00Z",
          lastUpdated: "2024-01-01T00:00:00Z",
          merchantReference: "test-order-1",
          shippingMethod: "Standard",
          status: {
            stage: "InProgress",
            issues: [
              {
                objectId: "item_1",
                errorCode: "IMAGE_TOO_SMALL",
                description: "Image resolution is too low",
              },
            ],
            details: {
              downloadAssets: "Error",
              printReadyAssetsPrepared: "NotStarted",
              allocateProductionLocation: "NotStarted",
              inProduction: "NotStarted",
              shipping: "NotStarted",
            },
          },
          charges: [],
          shipments: [],
          recipient: {
            name: "John Doe",
            address: {
              line1: "123 Main St",
              townOrCity: "London",
              postalOrZipCode: "SW1A 1AA",
              countryCode: "GB",
            },
          },
          items: [],
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await prodigiProvider.createOrder({
        orderId: "test-order-1",
        items: [
          {
            sku: "GLOBAL-POSTC-4X6",
            quantity: 1,
            imageUrl: "https://example.com/image.jpg",
          },
        ],
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
      });

      expect(result.success).toBe(true);
      expect(result.error).toBe("Image resolution is too low");
    });

    it("should handle API errors", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          statusCode: 400,
          errors: [
            {
              property: "items[0].sku",
              description: "Invalid SKU",
            },
          ],
        }),
      } as Response);

      const result = await prodigiProvider.createOrder({
        orderId: "test-order-1",
        items: [
          {
            sku: "INVALID-SKU",
            quantity: 1,
            imageUrl: "https://example.com/image.jpg",
          },
        ],
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("items[0].sku: Invalid SKU");
    });

    it("should use production URL when PRODIGI_SANDBOX is false", async () => {
      mockEnv({ PRODIGI_SANDBOX: "false", PRODIGI_API_KEY: "test-api-key" });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          outcome: "Created",
          order: {
            id: "ord_123",
            status: { stage: "InProgress", details: {} },
            items: [],
            charges: [],
            shipments: [],
            recipient: { name: "Test", address: {} },
          },
        }),
      } as Response);

      await prodigiProvider.createOrder({
        orderId: "test-order-1",
        items: [
          {
            sku: "GLOBAL-POSTC-4X6",
            quantity: 1,
            imageUrl: "https://example.com/image.jpg",
          },
        ],
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
      });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.prodigi.com/v4.0/orders",
        expect.any(Object),
      );
    });

    it("should handle error if API key is missing", async () => {
      mockEnv({ PRODIGI_API_KEY: undefined });

      const result = await prodigiProvider.createOrder({
        orderId: "test-order-1",
        items: [
          {
            sku: "GLOBAL-POSTC-4X6",
            quantity: 1,
            imageUrl: "https://example.com/image.jpg",
          },
        ],
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("PRODIGI_API_KEY");
    });

    it("should map order request with all optional fields", async () => {
      const mockResponse: ProdigiOrderResponse = {
        outcome: "Created",
        order: {
          id: "ord_123",
          created: "2024-01-01T00:00:00Z",
          lastUpdated: "2024-01-01T00:00:00Z",
          merchantReference: "test-order-1",
          shippingMethod: "Express",
          status: {
            stage: "InProgress",
            details: {
              downloadAssets: "NotStarted",
              printReadyAssetsPrepared: "NotStarted",
              allocateProductionLocation: "NotStarted",
              inProduction: "NotStarted",
              shipping: "NotStarted",
            },
          },
          charges: [],
          shipments: [],
          recipient: {
            name: "John Doe",
            email: "john@example.com",
            phoneNumber: "+44123456789",
            address: {
              line1: "123 Main St",
              line2: "Apt 4",
              townOrCity: "London",
              postalOrZipCode: "SW1A 1AA",
              countryCode: "GB",
            },
          },
          items: [],
          metadata: { customField: "value" },
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await prodigiProvider.createOrder({
        orderId: "test-order-1",
        items: [
          {
            sku: "GLOBAL-POSTC-4X6",
            quantity: 2,
            imageUrl: "https://example.com/image.jpg",
            sizing: "fitPrintArea",
          },
        ],
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          line2: "Apt 4",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
          email: "john@example.com",
          phone: "+44123456789",
        },
        shippingMethod: "Express",
        metadata: { customField: "value" },
      });

      const callBody = JSON.parse(
        vi.mocked(fetch).mock.calls[0]![1]?.body as string,
      );
      expect(callBody.shippingMethod).toBe("Express");
      expect(callBody.recipient.email).toBe("john@example.com");
      expect(callBody.recipient.phoneNumber).toBe("+44123456789");
      expect(callBody.recipient.address.line2).toBe("Apt 4");
      expect(callBody.items[0].sizing).toBe("fitPrintArea");
      expect(callBody.items[0].copies).toBe(2);
      expect(callBody.metadata).toEqual({ customField: "value" });
    });
  });

  describe("getQuote", () => {
    it("should get a quote successfully", async () => {
      const mockResponse: ProdigiQuoteResponse = {
        quotes: [
          {
            shipmentMethod: "Standard",
            costSummary: {
              items: { amount: "15.00", currency: "GBP" },
              shipping: { amount: "4.99", currency: "GBP" },
              totalCost: { amount: "19.99", currency: "GBP" },
            },
            shipments: [
              {
                carrier: { name: "Royal Mail", service: "Tracked 48" },
                fulfillmentLocation: { countryCode: "GB", labCode: "lab_uk" },
                cost: { amount: "4.99", currency: "GBP" },
                items: [{ sku: "GLOBAL-POSTC-4X6", itemIndices: [0] }],
              },
            ],
            items: [
              {
                sku: "GLOBAL-POSTC-4X6",
                copies: 1,
                unitCost: { amount: "15.00", currency: "GBP" },
                totalCost: { amount: "15.00", currency: "GBP" },
              },
            ],
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await prodigiProvider.getQuote(
        [{ sku: "GLOBAL-POSTC-4X6", quantity: 1 }],
        {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
      );

      expect(result.currency).toBe("GBP");
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.sku).toBe("GLOBAL-POSTC-4X6");
      expect(result.items[0]!.unitCost).toBe(15.0);
      expect(result.items[0]!.totalCost).toBe(15.0);
      expect(result.shipping).toHaveLength(1);
      expect(result.shipping[0]!.cost).toBe(4.99);
    });

    it("should throw error if no quote available", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ quotes: [] }),
      } as Response);

      await expect(
        prodigiProvider.getQuote(
          [{ sku: "GLOBAL-POSTC-4X6", quantity: 1 }],
          {
            name: "John Doe",
            line1: "123 Main St",
            city: "London",
            postalCode: "SW1A 1AA",
            countryCode: "GB",
          },
        ),
      ).rejects.toThrow("No quote available for the requested items");
    });
  });

  describe("getOrderStatus", () => {
    it("should get order status successfully", async () => {
      const mockResponse: ProdigiOrderStatusResponse = {
        outcome: "Ok",
        order: {
          id: "ord_123",
          created: "2024-01-01T00:00:00Z",
          lastUpdated: "2024-01-01T00:00:00Z",
          merchantReference: "test-order-1",
          shippingMethod: "Standard",
          status: {
            stage: "Complete",
            details: {
              downloadAssets: "Complete",
              printReadyAssetsPrepared: "Complete",
              allocateProductionLocation: "Complete",
              inProduction: "Complete",
              shipping: "Complete",
            },
          },
          charges: [],
          shipments: [
            {
              id: "ship_123",
              status: "Shipped",
              carrier: { name: "Royal Mail" },
              tracking: {
                number: "TRACK123",
                url: "https://track.example.com/TRACK123",
              },
              dispatchDate: "2024-01-02T00:00:00Z",
              items: [],
            },
          ],
          recipient: {
            name: "John Doe",
            address: {
              line1: "123 Main St",
              townOrCity: "London",
              postalOrZipCode: "SW1A 1AA",
              countryCode: "GB",
            },
          },
          items: [
            {
              id: "item_1",
              status: "Ok",
              sku: "GLOBAL-POSTC-4X6",
              copies: 1,
              sizing: "fillPrintArea",
              assets: [],
            },
          ],
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await prodigiProvider.getOrderStatus("ord_123");

      expect(result.providerOrderId).toBe("ord_123");
      expect(result.status).toBe("delivered");
      expect(result.statusDetail).toBe("Complete");
      expect(result.trackingNumber).toBe("TRACK123");
      expect(result.trackingUrl).toBe("https://track.example.com/TRACK123");
      expect(result.carrier).toBe("Royal Mail");
      expect(result.items).toHaveLength(1);
    });

    it("should map various status stages correctly", async () => {
      const testCases = [
        {
          stage: "Cancelled" as const,
          details: {
            downloadAssets: "NotStarted" as const,
            printReadyAssetsPrepared: "NotStarted" as const,
            allocateProductionLocation: "NotStarted" as const,
            inProduction: "NotStarted" as const,
            shipping: "NotStarted" as const,
          },
          expectedStatus: "cancelled",
        },
        {
          stage: "InProgress" as const,
          details: {
            downloadAssets: "Complete" as const,
            printReadyAssetsPrepared: "Complete" as const,
            allocateProductionLocation: "Complete" as const,
            inProduction: "InProgress" as const,
            shipping: "NotStarted" as const,
          },
          expectedStatus: "in_production",
        },
        {
          stage: "InProgress" as const,
          details: {
            downloadAssets: "Complete" as const,
            printReadyAssetsPrepared: "Complete" as const,
            allocateProductionLocation: "Complete" as const,
            inProduction: "Complete" as const,
            shipping: "InProgress" as const,
          },
          expectedStatus: "shipped",
        },
        {
          stage: "InProgress" as const,
          details: {
            downloadAssets: "Complete" as const,
            printReadyAssetsPrepared: "Complete" as const,
            allocateProductionLocation: "InProgress" as const,
            inProduction: "NotStarted" as const,
            shipping: "NotStarted" as const,
          },
          expectedStatus: "processing",
        },
      ];

      for (const testCase of testCases) {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            outcome: "Ok",
            order: {
              id: "ord_123",
              status: { stage: testCase.stage, details: testCase.details },
              items: [],
              charges: [],
              shipments: [],
              recipient: { name: "Test", address: {} },
            },
          }),
        } as Response);

        const result = await prodigiProvider.getOrderStatus("ord_123");
        expect(result.status).toBe(testCase.expectedStatus);
      }
    });

    it("should throw error if order not found", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ outcome: "NotFound" }),
      } as Response);

      await expect(prodigiProvider.getOrderStatus("ord_999")).rejects.toThrow(
        "Order ord_999 not found",
      );
    });
  });

  describe("cancelOrder", () => {
    it("should cancel order successfully", async () => {
      const mockResponse: ProdigiCancelResponse = {
        outcome: "Cancelled",
        order: {
          id: "ord_123",
          created: "2024-01-01T00:00:00Z",
          lastUpdated: "2024-01-01T00:00:00Z",
          merchantReference: "test-order-1",
          shippingMethod: "Standard",
          status: {
            stage: "Cancelled",
            details: {
              downloadAssets: "NotStarted",
              printReadyAssetsPrepared: "NotStarted",
              allocateProductionLocation: "NotStarted",
              inProduction: "NotStarted",
              shipping: "NotStarted",
            },
          },
          charges: [],
          shipments: [],
          recipient: {
            name: "John Doe",
            address: {
              line1: "123 Main St",
              townOrCity: "London",
              postalOrZipCode: "SW1A 1AA",
              countryCode: "GB",
            },
          },
          items: [],
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await prodigiProvider.cancelOrder!("ord_123");

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        "https://api.sandbox.prodigi.com/v4.0/orders/ord_123/actions/cancel",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should handle NotCancellable outcome", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ outcome: "NotCancellable" }),
      } as Response);

      const result = await prodigiProvider.cancelOrder!("ord_123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Order cannot be cancelled at this stage");
    });

    it("should handle NotFound outcome", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ outcome: "NotFound" }),
      } as Response);

      const result = await prodigiProvider.cancelOrder!("ord_999");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Order not found");
    });
  });

  describe("validateImageForProduct", () => {
    it("should validate image dimensions successfully", () => {
      const result = validateImageForProduct(2000, 2000, 1800, 1800, 150);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should report width too small", () => {
      const result = validateImageForProduct(1600, 2000, 1800, 1800, 150);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Image width (1600px) is less than required (1800px)",
      );
    });

    it("should report height too small", () => {
      const result = validateImageForProduct(2000, 1600, 1800, 1800, 150);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Image height (1600px) is less than required (1800px)",
      );
    });

    it("should report low resolution", () => {
      const result = validateImageForProduct(1000, 1000, 800, 800, 150);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Image resolution may be too low for quality printing",
      );
    });

    it("should report multiple errors", () => {
      const result = validateImageForProduct(1000, 1000, 2000, 2000, 150);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });
});
