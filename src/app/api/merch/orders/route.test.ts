/**
 * Tests for Merch Orders List API
 */

import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    merchOrder: {
      findMany: vi.fn(),
    },
  },
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;

describe("GET /api/merch/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return empty list for user with no orders", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchOrder.findMany).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.orders).toHaveLength(0);
  });

  it("should return user's orders", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockOrders = [
      {
        id: "order_1",
        userId: "user_1",
        orderNumber: "SL-20240101-A1B2",
        status: "SUBMITTED",
        subtotal: 50.0,
        shippingCost: 4.99,
        taxAmount: 0,
        totalAmount: 54.99,
        currency: "GBP",
        createdAt: new Date("2024-01-01"),
        items: [
          {
            id: "item_1",
            productId: "prod_1",
            variantId: null,
            productName: "Postcard",
            variantName: null,
            quantity: 2,
            unitPrice: 25.0,
            totalPrice: 50.0,
            product: {
              id: "prod_1",
              name: "Postcard",
              mockupTemplate: "template.jpg",
            },
            variant: null,
          },
        ],
        shipments: [],
      },
      {
        id: "order_2",
        userId: "user_1",
        orderNumber: "SL-20240102-C3D4",
        status: "PENDING",
        subtotal: 30.0,
        shippingCost: 0,
        taxAmount: 0,
        totalAmount: 30.0,
        currency: "GBP",
        createdAt: new Date("2024-01-02"),
        items: [],
        shipments: [],
      },
    ];

    vi.mocked(prisma.merchOrder.findMany).mockResolvedValue(mockOrders as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.orders).toHaveLength(2);
    expect(data.orders[0].orderNumber).toBe("SL-20240101-A1B2");
    expect(data.orders[0].subtotal).toBe(50.0);
    expect(data.orders[0].totalAmount).toBe(54.99);
    expect(data.orders[0].items).toHaveLength(1);
    expect(data.orders[0].items[0].unitPrice).toBe(25.0);
  });

  it("should query orders with correct filters", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchOrder.findMany).mockResolvedValue([]);

    await GET();

    expect(prisma.merchOrder.findMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                mockupTemplate: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        shipments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("should include shipment info when available", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockOrders = [
      {
        id: "order_1",
        orderNumber: "SL-20240101-A1B2",
        status: "SHIPPED",
        subtotal: 50.0,
        shippingCost: 4.99,
        taxAmount: 0,
        totalAmount: 54.99,
        items: [],
        shipments: [
          {
            id: "ship_1",
            trackingNumber: "TRACK123",
            trackingUrl: "https://track.example.com/TRACK123",
            carrier: "Royal Mail",
            status: "SHIPPED",
            createdAt: new Date("2024-01-02"),
          },
        ],
      },
    ];

    vi.mocked(prisma.merchOrder.findMany).mockResolvedValue(mockOrders as any);

    const response = await GET();
    const data = await response.json();

    expect(data.orders[0].shipments).toHaveLength(1);
    expect(data.orders[0].shipments[0].trackingNumber).toBe("TRACK123");
  });

  it("should handle database errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchOrder.findMany).mockRejectedValue(
      new Error("Database error"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch orders");
  });
});
