/**
 * Tests for Merch Checkout API
 */

import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    merchCart: {
      findUnique: vi.fn(),
    },
    merchOrder: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Create a single mock Stripe instance
const mockStripeCustomers = {
  create: vi.fn(),
};

const mockStripePaymentIntents = {
  create: vi.fn(),
};

const mockStripeInstance = {
  customers: mockStripeCustomers,
  paymentIntents: mockStripePaymentIntents,
};

vi.mock("@/lib/stripe/client", () => ({
  getStripe: vi.fn(() => mockStripeInstance),
}));

vi.mock("@/lib/pod", () => ({
  generateOrderNumber: vi.fn(() => "SL-20240101-TEST"),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;

describe("POST /api/merch/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/merch/checkout", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
        customerEmail: "john@example.com",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should validate shipping address", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const request = new NextRequest("http://localhost/api/merch/checkout", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: {
          name: "John Doe",
          // Missing required fields
        },
        customerEmail: "john@example.com",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Complete shipping address is required");
  });

  it("should reject ROW shipping", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const request = new NextRequest("http://localhost/api/merch/checkout", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "New York",
          postalCode: "10001",
          countryCode: "US", // ROW country
        },
        customerEmail: "john@example.com",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("not available yet");
  });

  it("should return 400 if cart is empty", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchCart.findUnique).mockResolvedValue({
      id: "cart_1",
      userId: "user_1",
      items: [],
    } as any);

    const request = new NextRequest("http://localhost/api/merch/checkout", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
        customerEmail: "john@example.com",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Your cart is empty");
  });

  it("should create checkout session successfully for UK", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockCart = {
      id: "cart_1",
      userId: "user_1",
      items: [
        {
          productId: "prod_1",
          variantId: null,
          quantity: 1,
          customText: null,
          product: {
            name: "Postcard",
            retailPrice: 25.0,
          },
          variant: null,
          image: {
            originalUrl: "https://example.com/test.jpg",
            originalR2Key: "images/test.jpg",
          },
          uploadedImageUrl: null,
          uploadedImageR2Key: null,
        },
      ],
    };

    vi.mocked(prisma.merchCart.findUnique).mockResolvedValue(mockCart as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      stripeCustomerId: "cus_123",
      email: "test@example.com",
      name: "Test User",
    } as any);

    const mockOrder = {
      id: "order_1",
      orderNumber: "SL-20240101-TEST",
    };

    vi.mocked(prisma.merchOrder.create).mockResolvedValue(mockOrder as any);
    vi.mocked(prisma.merchOrder.update).mockResolvedValue(mockOrder as any);

    mockStripePaymentIntents.create.mockResolvedValue({
      id: "pi_123",
      client_secret: "pi_123_secret_456",
    } as any);

    const request = new NextRequest("http://localhost/api/merch/checkout", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
        customerEmail: "john@example.com",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.clientSecret).toBe("pi_123_secret_456");
    expect(data.orderId).toBe("order_1");
    expect(data.orderNumber).toBe("SL-20240101-TEST");
  });

  it("should calculate shipping correctly for UK with free shipping", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockCart = {
      id: "cart_1",
      userId: "user_1",
      items: [
        {
          productId: "prod_1",
          variantId: null,
          quantity: 3,
          product: {
            name: "Postcard",
            retailPrice: 20.0,
          },
          variant: null,
          image: {
            originalUrl: "https://example.com/test.jpg",
            originalR2Key: "images/test.jpg",
          },
        },
      ],
    };

    vi.mocked(prisma.merchCart.findUnique).mockResolvedValue(mockCart as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      stripeCustomerId: "cus_123",
    } as any);
    vi.mocked(prisma.merchOrder.create).mockResolvedValue(
      { id: "order_1" } as any,
    );
    vi.mocked(prisma.merchOrder.update).mockResolvedValue(
      { id: "order_1" } as any,
    );

    mockStripePaymentIntents.create.mockResolvedValue({
      id: "pi_123",
      client_secret: "secret",
    } as any);

    const request = new NextRequest("http://localhost/api/merch/checkout", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
        customerEmail: "john@example.com",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.summary.subtotal).toBe(60); // 3 * 20
    expect(data.summary.shipping).toBe(0); // Free over £55
    expect(data.summary.total).toBe(60);
  });

  it("should calculate shipping correctly for UK below threshold", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockCart = {
      id: "cart_1",
      userId: "user_1",
      items: [
        {
          productId: "prod_1",
          variantId: null,
          quantity: 1,
          product: {
            retailPrice: 25.0,
          },
          variant: null,
          image: {
            originalUrl: "test.jpg",
            originalR2Key: "test.jpg",
          },
        },
      ],
    };

    vi.mocked(prisma.merchCart.findUnique).mockResolvedValue(mockCart as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      stripeCustomerId: "cus_123",
    } as any);
    vi.mocked(prisma.merchOrder.create).mockResolvedValue(
      { id: "order_1" } as any,
    );
    vi.mocked(prisma.merchOrder.update).mockResolvedValue(
      { id: "order_1" } as any,
    );

    mockStripePaymentIntents.create.mockResolvedValue({
      id: "pi_123",
      client_secret: "secret",
    } as any);

    const request = new NextRequest("http://localhost/api/merch/checkout", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
        customerEmail: "john@example.com",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.summary.shipping).toBe(4.99);
    expect(data.summary.total).toBe(29.99); // 25 + 4.99
  });

  it("should calculate shipping for EU", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockCart = {
      id: "cart_1",
      userId: "user_1",
      items: [
        {
          productId: "prod_1",
          variantId: null,
          quantity: 1,
          product: {
            retailPrice: 30.0,
          },
          variant: null,
          image: {
            originalUrl: "test.jpg",
            originalR2Key: "test.jpg",
          },
        },
      ],
    };

    vi.mocked(prisma.merchCart.findUnique).mockResolvedValue(mockCart as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      stripeCustomerId: "cus_123",
    } as any);
    vi.mocked(prisma.merchOrder.create).mockResolvedValue(
      { id: "order_1" } as any,
    );
    vi.mocked(prisma.merchOrder.update).mockResolvedValue(
      { id: "order_1" } as any,
    );

    mockStripePaymentIntents.create.mockResolvedValue({
      id: "pi_123",
      client_secret: "secret",
    } as any);

    const request = new NextRequest("http://localhost/api/merch/checkout", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: {
          name: "Jean Dupont",
          line1: "123 Rue de la Paix",
          city: "Paris",
          postalCode: "75001",
          countryCode: "FR",
        },
        customerEmail: "jean@example.com",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.summary.shippingZone).toBe("EU");
    expect(data.summary.shipping).toBe(9.99);
  });

  it("should create Stripe customer if none exists", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockCart = {
      id: "cart_1",
      userId: "user_1",
      items: [
        {
          product: { retailPrice: 25.0 },
          variant: null,
          quantity: 1,
          image: { originalUrl: "test.jpg", originalR2Key: "test.jpg" },
        },
      ],
    };

    vi.mocked(prisma.merchCart.findUnique).mockResolvedValue(mockCart as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      stripeCustomerId: null,
      email: "test@example.com",
      name: "Test User",
    } as any);

    mockStripeCustomers.create.mockResolvedValue({
      id: "cus_new123",
    } as any);
    mockStripePaymentIntents.create.mockResolvedValue({
      id: "pi_123",
      client_secret: "secret",
    } as any);

    vi.mocked(prisma.merchOrder.create).mockResolvedValue(
      { id: "order_1" } as any,
    );
    vi.mocked(prisma.merchOrder.update).mockResolvedValue(
      { id: "order_1" } as any,
    );

    const request = new NextRequest("http://localhost/api/merch/checkout", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
        customerEmail: "john@example.com",
      }),
    });

    await POST(request);

    expect(mockStripeCustomers.create).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { stripeCustomerId: "cus_new123" },
    });
  });

  it("should handle missing image", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockCart = {
      id: "cart_1",
      userId: "user_1",
      items: [
        {
          product: { name: "Product", retailPrice: 25.0 },
          variant: null,
          quantity: 1,
          image: null,
          uploadedImageUrl: null,
          uploadedImageR2Key: null,
        },
      ],
    };

    vi.mocked(prisma.merchCart.findUnique).mockResolvedValue(mockCart as any);

    const request = new NextRequest("http://localhost/api/merch/checkout", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
        customerEmail: "john@example.com",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing image");
  });

  it("should clean up order if payment intent fails", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockCart = {
      id: "cart_1",
      items: [
        {
          product: { retailPrice: 25.0 },
          variant: null,
          quantity: 1,
          image: { originalUrl: "test.jpg", originalR2Key: "test.jpg" },
        },
      ],
    };

    vi.mocked(prisma.merchCart.findUnique).mockResolvedValue(mockCart as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      stripeCustomerId: "cus_123",
    } as any);
    vi.mocked(prisma.merchOrder.create).mockResolvedValue(
      { id: "order_1" } as any,
    );

    mockStripePaymentIntents.create.mockRejectedValue(
      new Error("Stripe error"),
    );

    const request = new NextRequest("http://localhost/api/merch/checkout", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
        customerEmail: "john@example.com",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create payment");
    expect(prisma.merchOrder.delete).toHaveBeenCalledWith({
      where: { id: "order_1" },
    });
  });

  it("should handle variant price delta", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockCart = {
      id: "cart_1",
      items: [
        {
          product: {
            retailPrice: 20.0,
          },
          variant: {
            name: "Large",
            priceDelta: 5.0,
          },
          quantity: 2,
          image: { originalUrl: "test.jpg", originalR2Key: "test.jpg" },
        },
      ],
    };

    vi.mocked(prisma.merchCart.findUnique).mockResolvedValue(mockCart as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      stripeCustomerId: "cus_123",
    } as any);
    vi.mocked(prisma.merchOrder.create).mockResolvedValue(
      { id: "order_1" } as any,
    );
    vi.mocked(prisma.merchOrder.update).mockResolvedValue(
      { id: "order_1" } as any,
    );

    mockStripePaymentIntents.create.mockResolvedValue({
      id: "pi_123",
      client_secret: "secret",
    } as any);

    const request = new NextRequest("http://localhost/api/merch/checkout", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: {
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
        customerEmail: "john@example.com",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.summary.subtotal).toBe(50); // 2 * (20 + 5)
  });
});
