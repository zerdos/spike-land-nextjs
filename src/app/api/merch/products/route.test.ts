/**
 * Tests for Merch Products API
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
    merchProduct: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;

describe("GET /api/merch/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return active products", async () => {
    const mockProducts = [
      {
        id: "prod_1",
        name: "Postcard 4x6",
        description: "High quality postcard",
        provider: "PRODIGI",
        providerSku: "GLOBAL-POSTC-4X6",
        basePrice: 15.0,
        retailPrice: 25.0,
        isActive: true,
        category: {
          id: "cat_1",
          name: "Postcards",
          slug: "postcards",
        },
      },
    ];

    vi.mocked(prisma.merchProduct.findMany).mockResolvedValue(
      mockProducts as any,
    );

    const request = new NextRequest("http://localhost/api/merch/products");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.products).toHaveLength(1);
    expect(data.products[0].name).toBe("Postcard 4x6");
    expect(data.products[0].basePrice).toBe(15.0);
    expect(data.pagination).toEqual({
      limit: 50,
      offset: 0,
      hasMore: false,
    });
  });

  it("should filter by category", async () => {
    vi.mocked(prisma.merchProduct.findMany).mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost/api/merch/products?category=postcards",
    );
    await GET(request);

    expect(prisma.merchProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: {
            slug: "postcards",
          },
        }),
      }),
    );
  });

  it("should include variants when requested", async () => {
    const mockProducts = [
      {
        id: "prod_1",
        name: "T-Shirt",
        basePrice: 20.0,
        retailPrice: 35.0,
        category: { id: "cat_1", name: "Apparel" },
        variants: [
          {
            id: "var_1",
            name: "Small",
            priceDelta: 0,
            isActive: true,
          },
          {
            id: "var_2",
            name: "Large",
            priceDelta: 2.0,
            isActive: true,
          },
        ],
      },
    ];

    vi.mocked(prisma.merchProduct.findMany).mockResolvedValue(
      mockProducts as any,
    );

    const request = new NextRequest(
      "http://localhost/api/merch/products?includeVariants=true",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.products[0].variants).toHaveLength(2);
    expect(data.products[0].variants[0].priceDelta).toBe(0);
  });

  it("should respect pagination parameters", async () => {
    vi.mocked(prisma.merchProduct.findMany).mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost/api/merch/products?limit=10&offset=20",
    );
    await GET(request);

    expect(prisma.merchProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 20,
      }),
    );
  });

  it("should indicate hasMore when limit reached", async () => {
    const mockProducts = new Array(10).fill({
      id: "prod_1",
      name: "Product",
      basePrice: 10.0,
      retailPrice: 20.0,
      category: {},
    });

    vi.mocked(prisma.merchProduct.findMany).mockResolvedValue(
      mockProducts as any,
    );

    const request = new NextRequest(
      "http://localhost/api/merch/products?limit=10",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.pagination.hasMore).toBe(true);
  });

  it("should handle database errors", async () => {
    vi.mocked(prisma.merchProduct.findMany).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new NextRequest("http://localhost/api/merch/products");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch products");
  });
});

describe("POST /api/merch/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/merch/products", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Product",
        categoryId: "cat_1",
        provider: "PRODIGI",
        providerSku: "TEST-SKU",
        basePrice: 10,
        retailPrice: 20,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 if not admin", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "user@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      role: "USER",
    } as any);

    const request = new NextRequest("http://localhost/api/merch/products", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Product",
        categoryId: "cat_1",
        provider: "PRODIGI",
        providerSku: "TEST-SKU",
        basePrice: 10,
        retailPrice: 20,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should create product as admin", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "admin@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      role: "ADMIN",
    } as any);

    const mockProduct = {
      id: "prod_1",
      name: "Test Product",
      description: "Test description",
      categoryId: "cat_1",
      provider: "PRODIGI",
      providerSku: "TEST-SKU",
      basePrice: 10.0,
      retailPrice: 20.0,
      minDpi: 150,
      minWidth: 1800,
      minHeight: 1800,
      category: {
        id: "cat_1",
        name: "Test Category",
      },
    };

    vi.mocked(prisma.merchProduct.create).mockResolvedValue(mockProduct as any);

    const request = new NextRequest("http://localhost/api/merch/products", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Product",
        description: "Test description",
        categoryId: "cat_1",
        provider: "PRODIGI",
        providerSku: "TEST-SKU",
        basePrice: 10,
        retailPrice: 20,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.product.name).toBe("Test Product");
    expect(data.product.basePrice).toBe(10.0);
  });

  it("should create product as super admin", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "super@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      role: "SUPER_ADMIN",
    } as any);

    vi.mocked(prisma.merchProduct.create).mockResolvedValue({
      id: "prod_1",
      name: "Test Product",
      basePrice: 10.0,
      retailPrice: 20.0,
      category: {},
    } as any);

    const request = new NextRequest("http://localhost/api/merch/products", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Product",
        categoryId: "cat_1",
        provider: "PRODIGI",
        providerSku: "TEST-SKU",
        basePrice: 10,
        retailPrice: 20,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("should validate required fields", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "admin@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      role: "ADMIN",
    } as any);

    const request = new NextRequest("http://localhost/api/merch/products", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Product",
        // Missing categoryId, provider, providerSku
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });

  it("should validate positive prices", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "admin@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      role: "ADMIN",
    } as any);

    const request = new NextRequest("http://localhost/api/merch/products", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Product",
        categoryId: "cat_1",
        provider: "PRODIGI",
        providerSku: "TEST-SKU",
        basePrice: -10,
        retailPrice: 20,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Prices must be positive");
  });

  it("should handle invalid request body", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "admin@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      role: "ADMIN",
    } as any);

    const request = new NextRequest("http://localhost/api/merch/products", {
      method: "POST",
      body: "invalid json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("should use default values for optional fields", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "admin@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      role: "ADMIN",
    } as any);

    vi.mocked(prisma.merchProduct.create).mockResolvedValue({
      id: "prod_1",
      name: "Test Product",
      basePrice: 10.0,
      retailPrice: 20.0,
      minDpi: 150,
      minWidth: 1800,
      minHeight: 1800,
      category: {},
    } as any);

    const request = new NextRequest("http://localhost/api/merch/products", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Product",
        categoryId: "cat_1",
        provider: "PRODIGI",
        providerSku: "TEST-SKU",
        basePrice: 10,
        retailPrice: 20,
      }),
    });

    await POST(request);

    expect(prisma.merchProduct.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        minDpi: 150,
        minWidth: 1800,
        minHeight: 1800,
      }),
      include: { category: true },
    });
  });

  it("should handle database errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "admin@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      role: "ADMIN",
    } as any);

    vi.mocked(prisma.merchProduct.create).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new NextRequest("http://localhost/api/merch/products", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Product",
        categoryId: "cat_1",
        provider: "PRODIGI",
        providerSku: "TEST-SKU",
        basePrice: 10,
        retailPrice: 20,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create product");
  });
});
