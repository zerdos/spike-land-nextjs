/**
 * Tests for Merch Order Detail API
 */

import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    merchOrder: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;

describe("GET /api/merch/orders/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/merch/orders/order_1",
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "order_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if order not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchOrder.findUnique).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/merch/orders/order_999",
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "order_999" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Order not found");
  });

  it("should return 403 if user does not own order", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchOrder.findUnique).mockResolvedValue({
      id: "order_1",
      userId: "user_2", // Different user
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      role: "USER",
    } as any);

    const request = new NextRequest(
      "http://localhost/api/merch/orders/order_1",
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "order_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("You do not have access to this order");
  });

  it("should return order details successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockOrder = {
      id: "order_1",
      userId: "user_1",
      orderNumber: "SL-20240101-A1B2",
      status: "SUBMITTED",
      subtotal: 50.0,
      shippingCost: 4.99,
      taxAmount: 0,
      totalAmount: 54.99,
      currency: "GBP",
      shippingAddress: {
        name: "John Doe",
        line1: "123 Main St",
        city: "London",
        postalCode: "SW1A 1AA",
        countryCode: "GB",
      },
      billingAddress: {
        name: "John Doe",
        line1: "123 Main St",
        city: "London",
        postalCode: "SW1A 1AA",
        countryCode: "GB",
      },
      customerEmail: "john@example.com",
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
          imageUrl: "https://example.com/image.jpg",
          product: {
            id: "prod_1",
            name: "Postcard",
            description: "High quality postcard",
            mockupTemplate: "template.jpg",
            category: {
              name: "Postcards",
              slug: "postcards",
            },
          },
          variant: null,
        },
      ],
      shipments: [
        {
          id: "ship_1",
          trackingNumber: "TRACK123",
          trackingUrl: "https://track.example.com/TRACK123",
          carrier: "Royal Mail",
          status: "SHIPPED",
          items: [],
        },
      ],
      events: [
        {
          id: "event_1",
          type: "ORDER_CREATED",
          data: {},
          createdAt: new Date("2024-01-01"),
        },
      ],
    };

    vi.mocked(prisma.merchOrder.findUnique).mockResolvedValue(mockOrder as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      role: "USER",
    } as any);

    const request = new NextRequest(
      "http://localhost/api/merch/orders/order_1",
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "order_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.order.orderNumber).toBe("SL-20240101-A1B2");
    expect(data.order.subtotal).toBe(50.0);
    expect(data.order.totalAmount).toBe(54.99);
    expect(data.order.items).toHaveLength(1);
    expect(data.order.shipments).toHaveLength(1);
    expect(data.order.events).toHaveLength(1);
  });

  it("should allow admin to view any order", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_1", email: "admin@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockOrder = {
      id: "order_1",
      userId: "user_1", // Different user
      orderNumber: "SL-20240101-A1B2",
      subtotal: 50.0,
      shippingCost: 4.99,
      taxAmount: 0,
      totalAmount: 54.99,
      items: [],
      shipments: [],
      events: [],
    };

    vi.mocked(prisma.merchOrder.findUnique).mockResolvedValue(mockOrder as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "admin_1",
      role: "ADMIN",
    } as any);

    const request = new NextRequest(
      "http://localhost/api/merch/orders/order_1",
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "order_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should allow super admin to view any order", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "super_1", email: "super@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockOrder = {
      id: "order_1",
      userId: "user_1",
      orderNumber: "SL-20240101-A1B2",
      subtotal: 50.0,
      shippingCost: 4.99,
      taxAmount: 0,
      totalAmount: 54.99,
      items: [],
      shipments: [],
      events: [],
    };

    vi.mocked(prisma.merchOrder.findUnique).mockResolvedValue(mockOrder as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "super_1",
      role: "SUPER_ADMIN",
    } as any);

    const request = new NextRequest(
      "http://localhost/api/merch/orders/order_1",
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "order_1" }),
    });

    expect(response.status).toBe(200);
  });

  it("should handle database errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchOrder.findUnique).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new NextRequest(
      "http://localhost/api/merch/orders/order_1",
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "order_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch order");
  });

  it("should query order with correct includes", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchOrder.findUnique).mockResolvedValue({
      id: "order_1",
      userId: "user_1",
      subtotal: 50.0,
      shippingCost: 4.99,
      taxAmount: 0,
      totalAmount: 54.99,
      items: [],
      shipments: [],
      events: [],
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      role: "USER",
    } as any);

    const request = new NextRequest(
      "http://localhost/api/merch/orders/order_1",
    );

    await GET(request, {
      params: Promise.resolve({ id: "order_1" }),
    });

    expect(prisma.merchOrder.findUnique).toHaveBeenCalledWith({
      where: { id: "order_1" },
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
    });
  });
});
