/**
 * Tests for Merch Cart Item API
 */

import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    merchCartItem: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;

describe("PATCH /api/merch/cart/[itemId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/merch/cart/item_1",
      {
        method: "PATCH",
        body: JSON.stringify({ quantity: 2 }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ itemId: "item_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if item not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchCartItem.findUnique).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/merch/cart/item_999",
      {
        method: "PATCH",
        body: JSON.stringify({ quantity: 2 }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ itemId: "item_999" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Cart item not found");
  });

  it("should return 403 if user does not own the cart", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchCartItem.findUnique).mockResolvedValue({
      id: "item_1",
      cart: {
        userId: "user_2", // Different user
      },
    } as any);

    const request = new NextRequest(
      "http://localhost/api/merch/cart/item_1",
      {
        method: "PATCH",
        body: JSON.stringify({ quantity: 2 }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ itemId: "item_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("You do not have access to this cart item");
  });

  it("should validate quantity minimum", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchCartItem.findUnique).mockResolvedValue({
      id: "item_1",
      cart: { userId: "user_1" },
    } as any);

    const request = new NextRequest(
      "http://localhost/api/merch/cart/item_1",
      {
        method: "PATCH",
        body: JSON.stringify({ quantity: 0 }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ itemId: "item_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Quantity must be between 1 and 100");
  });

  it("should update quantity successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchCartItem.findUnique).mockResolvedValue({
      id: "item_1",
      cart: { userId: "user_1" },
    } as any);

    vi.mocked(prisma.merchCartItem.update).mockResolvedValue({
      id: "item_1",
      quantity: 5,
      product: {
        basePrice: 15.0,
        retailPrice: 25.0,
      },
      variant: null,
    } as any);

    const request = new NextRequest(
      "http://localhost/api/merch/cart/item_1",
      {
        method: "PATCH",
        body: JSON.stringify({ quantity: 5 }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ itemId: "item_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.item.quantity).toBe(5);
  });

  it("should update custom text successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchCartItem.findUnique).mockResolvedValue({
      id: "item_1",
      cart: { userId: "user_1" },
    } as any);

    vi.mocked(prisma.merchCartItem.update).mockResolvedValue({
      id: "item_1",
      customText: "Updated text",
      product: {
        basePrice: 15.0,
        retailPrice: 25.0,
      },
      variant: null,
    } as any);

    const request = new NextRequest(
      "http://localhost/api/merch/cart/item_1",
      {
        method: "PATCH",
        body: JSON.stringify({ customText: "Updated text" }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ itemId: "item_1" }),
    });
    await response.json();

    expect(response.status).toBe(200);
    expect(prisma.merchCartItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customText: "Updated text",
        }),
      }),
    );
  });

  it("should update both quantity and custom text", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchCartItem.findUnique).mockResolvedValue({
      id: "item_1",
      cart: { userId: "user_1" },
    } as any);

    vi.mocked(prisma.merchCartItem.update).mockResolvedValue({
      id: "item_1",
      quantity: 3,
      customText: "New text",
      product: {
        basePrice: 15.0,
        retailPrice: 25.0,
      },
      variant: null,
    } as any);

    const request = new NextRequest(
      "http://localhost/api/merch/cart/item_1",
      {
        method: "PATCH",
        body: JSON.stringify({ quantity: 3, customText: "New text" }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ itemId: "item_1" }),
    });

    expect(response.status).toBe(200);
    expect(prisma.merchCartItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          quantity: 3,
          customText: "New text",
        },
      }),
    );
  });

  it("should handle invalid request body", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const request = new NextRequest(
      "http://localhost/api/merch/cart/item_1",
      {
        method: "PATCH",
        body: "invalid json",
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ itemId: "item_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("should handle database errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchCartItem.findUnique).mockResolvedValue({
      id: "item_1",
      cart: { userId: "user_1" },
    } as any);

    vi.mocked(prisma.merchCartItem.update).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new NextRequest(
      "http://localhost/api/merch/cart/item_1",
      {
        method: "PATCH",
        body: JSON.stringify({ quantity: 2 }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ itemId: "item_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update cart item");
  });
});

describe("DELETE /api/merch/cart/[itemId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/merch/cart/item_1",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ itemId: "item_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if item not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchCartItem.findUnique).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/merch/cart/item_999",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ itemId: "item_999" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Cart item not found");
  });

  it("should return 403 if user does not own the cart", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchCartItem.findUnique).mockResolvedValue({
      id: "item_1",
      cart: {
        userId: "user_2", // Different user
      },
    } as any);

    const request = new NextRequest(
      "http://localhost/api/merch/cart/item_1",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ itemId: "item_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("You do not have access to this cart item");
  });

  it("should delete item successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchCartItem.findUnique).mockResolvedValue({
      id: "item_1",
      cart: { userId: "user_1" },
    } as any);

    vi.mocked(prisma.merchCartItem.delete).mockResolvedValue({
      id: "item_1",
    } as any);

    const request = new NextRequest(
      "http://localhost/api/merch/cart/item_1",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ itemId: "item_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Item removed from cart");
    expect(prisma.merchCartItem.delete).toHaveBeenCalledWith({
      where: { id: "item_1" },
    });
  });

  it("should handle database errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.merchCartItem.findUnique).mockResolvedValue({
      id: "item_1",
      cart: { userId: "user_1" },
    } as any);

    vi.mocked(prisma.merchCartItem.delete).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new NextRequest(
      "http://localhost/api/merch/cart/item_1",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ itemId: "item_1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete cart item");
  });
});
