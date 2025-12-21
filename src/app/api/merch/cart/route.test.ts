/**
 * Tests for Merch Cart API
 */

import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    merchCart: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    merchCartItem: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    merchProduct: {
      findUnique: vi.fn(),
    },
    enhancedImage: {
      findUnique: vi.fn(),
    },
  },
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;

describe("GET /api/merch/cart", () => {
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

  it("should return empty cart for new user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchCart.upsert).mockResolvedValue({
      id: "cart_1",
      userId: "user_1",
      items: [],
    } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.cart.items).toHaveLength(0);
    expect(data.cart.itemCount).toBe(0);
    expect(data.cart.subtotal).toBe(0);
  });

  it("should return cart with items", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockCart = {
      id: "cart_1",
      userId: "user_1",
      items: [
        {
          id: "item_1",
          productId: "prod_1",
          variantId: null,
          quantity: 2,
          product: {
            id: "prod_1",
            name: "Postcard",
            basePrice: 15.0,
            retailPrice: 25.0,
            category: { id: "cat_1", name: "Postcards" },
          },
          variant: null,
          image: {
            id: "img_1",
            name: "test.jpg",
            originalUrl: "https://example.com/test.jpg",
            originalWidth: 2000,
            originalHeight: 2000,
          },
        },
      ],
    };

    vi.mocked(prisma.merchCart.upsert).mockResolvedValue(mockCart as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cart.items).toHaveLength(1);
    expect(data.cart.itemCount).toBe(2);
    expect(data.cart.subtotal).toBe(50); // 2 * 25
    expect(data.cart.items[0].unitPrice).toBe(25);
    expect(data.cart.items[0].lineTotal).toBe(50);
  });

  it("should calculate totals with variant price delta", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockCart = {
      id: "cart_1",
      userId: "user_1",
      items: [
        {
          id: "item_1",
          quantity: 1,
          product: {
            basePrice: 20.0,
            retailPrice: 30.0,
            category: {},
          },
          variant: {
            priceDelta: 5.0,
          },
          image: { originalUrl: "test.jpg" },
        },
      ],
    };

    vi.mocked(prisma.merchCart.upsert).mockResolvedValue(mockCart as any);

    const response = await GET();
    const data = await response.json();

    expect(data.cart.items[0].unitPrice).toBe(35); // 30 + 5
    expect(data.cart.subtotal).toBe(35);
  });

  it("should handle database errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchCart.upsert).mockRejectedValue(
      new Error("Database error"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch cart");
  });
});

describe("POST /api/merch/cart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/merch/cart", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_1",
        imageId: "img_1",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should validate required product ID", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const request = new NextRequest("http://localhost/api/merch/cart", {
      method: "POST",
      body: JSON.stringify({
        imageId: "img_1",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Product ID is required");
  });

  it("should validate image source requirement", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const request = new NextRequest("http://localhost/api/merch/cart", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_1",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Either imageId or uploadedImageR2Key is required");
  });

  it("should validate product exists", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchProduct.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/merch/cart", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_999",
        imageId: "img_1",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Product not found");
  });

  it("should validate variant exists", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchProduct.findUnique).mockResolvedValue({
      id: "prod_1",
      variants: [
        { id: "var_1", isActive: true },
      ],
    } as any);

    const request = new NextRequest("http://localhost/api/merch/cart", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_1",
        variantId: "var_999",
        imageId: "img_1",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Variant not found");
  });

  it("should validate image exists and ownership", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchProduct.findUnique).mockResolvedValue({
      id: "prod_1",
      minWidth: 1800,
      minHeight: 1800,
      variants: [],
    } as any);

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue({
      id: "img_1",
      userId: "user_2", // Different user
      originalWidth: 2000,
      originalHeight: 2000,
    } as any);

    const request = new NextRequest("http://localhost/api/merch/cart", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_1",
        imageId: "img_1",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("You do not have access to this image");
  });

  it("should validate image dimensions", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchProduct.findUnique).mockResolvedValue({
      id: "prod_1",
      minWidth: 2000,
      minHeight: 2000,
      variants: [],
    } as any);

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue({
      id: "img_1",
      userId: "user_1",
      originalWidth: 1500,
      originalHeight: 1500,
    } as any);

    const request = new NextRequest("http://localhost/api/merch/cart", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_1",
        imageId: "img_1",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Image too small");
  });

  it("should create new cart item successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchProduct.findUnique).mockResolvedValue({
      id: "prod_1",
      minWidth: 1800,
      minHeight: 1800,
      variants: [],
    } as any);

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue({
      id: "img_1",
      userId: "user_1",
      originalWidth: 2000,
      originalHeight: 2000,
    } as any);

    vi.mocked(prisma.merchCart.upsert).mockResolvedValue({
      id: "cart_1",
      userId: "user_1",
    } as any);

    vi.mocked(prisma.merchCartItem.findFirst).mockResolvedValue(null);

    vi.mocked(prisma.merchCartItem.create).mockResolvedValue({
      id: "item_1",
      productId: "prod_1",
      variantId: null,
      imageId: "img_1",
      quantity: 1,
      product: {
        basePrice: 15.0,
        retailPrice: 25.0,
      },
      variant: null,
    } as any);

    const request = new NextRequest("http://localhost/api/merch/cart", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_1",
        imageId: "img_1",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.action).toBe("created");
    expect(data.item.quantity).toBe(1);
  });

  it("should update existing cart item quantity", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchProduct.findUnique).mockResolvedValue({
      id: "prod_1",
      minWidth: 1800,
      minHeight: 1800,
      variants: [],
    } as any);

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue({
      id: "img_1",
      userId: "user_1",
      originalWidth: 2000,
      originalHeight: 2000,
    } as any);

    vi.mocked(prisma.merchCart.upsert).mockResolvedValue({
      id: "cart_1",
      userId: "user_1",
    } as any);

    vi.mocked(prisma.merchCartItem.findFirst).mockResolvedValue({
      id: "item_1",
      quantity: 2,
    } as any);

    vi.mocked(prisma.merchCartItem.update).mockResolvedValue({
      id: "item_1",
      quantity: 3,
      product: {
        basePrice: 15.0,
        retailPrice: 25.0,
      },
      variant: null,
    } as any);

    const request = new NextRequest("http://localhost/api/merch/cart", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_1",
        imageId: "img_1",
        quantity: 1,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.action).toBe("updated");
    expect(data.item.quantity).toBe(3);
  });

  it("should handle uploaded image with R2 key", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchProduct.findUnique).mockResolvedValue({
      id: "prod_1",
      variants: [],
    } as any);

    vi.mocked(prisma.merchCart.upsert).mockResolvedValue({
      id: "cart_1",
    } as any);

    vi.mocked(prisma.merchCartItem.findFirst).mockResolvedValue(null);

    vi.mocked(prisma.merchCartItem.create).mockResolvedValue({
      id: "item_1",
      uploadedImageR2Key: "uploads/test.jpg",
      uploadedImageUrl: "https://example.com/test.jpg",
      product: { basePrice: 15.0, retailPrice: 25.0 },
      variant: null,
    } as any);

    const request = new NextRequest("http://localhost/api/merch/cart", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_1",
        uploadedImageR2Key: "uploads/test.jpg",
        uploadedImageUrl: "https://example.com/test.jpg",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should handle custom text", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchProduct.findUnique).mockResolvedValue({
      id: "prod_1",
      variants: [],
    } as any);

    vi.mocked(prisma.merchCart.upsert).mockResolvedValue({
      id: "cart_1",
    } as any);

    vi.mocked(prisma.merchCartItem.findFirst).mockResolvedValue(null);

    vi.mocked(prisma.merchCartItem.create).mockResolvedValue({
      id: "item_1",
      customText: "Happy Birthday!",
      product: { basePrice: 15.0, retailPrice: 25.0 },
      variant: null,
    } as any);

    const request = new NextRequest("http://localhost/api/merch/cart", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod_1",
        uploadedImageR2Key: "test.jpg",
        customText: "Happy Birthday!",
      }),
    });

    const _response = await POST(request);

    expect(prisma.merchCartItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customText: "Happy Birthday!",
        }),
      }),
    );
  });

  it("should handle invalid request body", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const request = new NextRequest("http://localhost/api/merch/cart", {
      method: "POST",
      body: "invalid json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });
});
