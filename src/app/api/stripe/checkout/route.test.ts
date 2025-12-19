import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { POST } from "./route";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock Stripe
vi.mock("@/lib/stripe/client", () => ({
  getStripe: vi.fn(() => ({
    customers: {
      create: vi.fn().mockResolvedValue({ id: "cus_123" }),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: "cs_123",
          url: "https://checkout.stripe.com/session",
        }),
      },
    },
  })),
  TOKEN_PACKAGES: {
    starter: { tokens: 10, price: 2.99, name: "Starter Pack" },
    basic: { tokens: 50, price: 9.99, name: "Basic Pack" },
  },
  SUBSCRIPTION_PLANS: {
    hobby: {
      tokensPerMonth: 30,
      priceGBP: 4.99,
      maxRollover: 30,
      name: "Hobby",
    },
    creator: {
      tokensPerMonth: 100,
      priceGBP: 12.99,
      maxRollover: 100,
      name: "Creator",
    },
  },
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from "@/auth";
import prisma from "@/lib/prisma";

describe("POST /api/stripe/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 413 when request body is too large", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/stripe/checkout",
      {
        method: "POST",
        headers: {
          "content-length": "20000", // Larger than MAX_BODY_SIZE (10KB)
        },
        body: JSON.stringify({ packageId: "starter", mode: "payment" }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(413);
    expect(data.error).toBe("Request too large");
  });

  it("returns 401 when user is not authenticated", async () => {
    (auth as Mock).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/checkout",
      {
        method: "POST",
        body: JSON.stringify({ packageId: "starter", mode: "payment" }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when payment mode is missing packageId", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "123", email: "test@test.com" },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/checkout",
      {
        method: "POST",
        body: JSON.stringify({ mode: "payment" }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Package ID required for payment");
  });

  it("returns 400 when subscription mode is missing planId", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "123", email: "test@test.com" },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/checkout",
      {
        method: "POST",
        body: JSON.stringify({ mode: "subscription" }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Plan ID required for subscription");
  });

  it("returns 400 when package ID is invalid", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "123", email: "test@test.com" },
    });
    (prisma.user.findUnique as Mock).mockResolvedValue({
      stripeCustomerId: "cus_existing",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/checkout",
      {
        method: "POST",
        body: JSON.stringify({ packageId: "invalid", mode: "payment" }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid package ID");
  });

  it("returns 400 when plan ID is invalid", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "123", email: "test@test.com" },
    });
    (prisma.user.findUnique as Mock).mockResolvedValue({
      stripeCustomerId: "cus_existing",
    });
    (prisma.subscription.findUnique as Mock).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/checkout",
      {
        method: "POST",
        body: JSON.stringify({ planId: "invalid", mode: "subscription" }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid plan ID");
  });

  it("creates checkout session for valid payment request", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "123", email: "test@test.com", name: "Test User" },
    });
    (prisma.user.findUnique as Mock).mockResolvedValue({
      stripeCustomerId: "cus_existing",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/checkout",
      {
        method: "POST",
        body: JSON.stringify({ packageId: "starter", mode: "payment" }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sessionId).toBe("cs_123");
    expect(data.url).toBe("https://checkout.stripe.com/session");
  });

  it("creates Stripe customer if user does not have one", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "123", email: "test@test.com", name: "Test User" },
    });
    (prisma.user.findUnique as Mock).mockResolvedValue({
      stripeCustomerId: null,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/checkout",
      {
        method: "POST",
        body: JSON.stringify({ packageId: "starter", mode: "payment" }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "123" },
      data: { stripeCustomerId: "cus_123" },
    });
  });

  it("creates Stripe customer without name when user has no name", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "123", email: "test@test.com", name: null },
    });
    (prisma.user.findUnique as Mock).mockResolvedValue({
      stripeCustomerId: null,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/checkout",
      {
        method: "POST",
        body: JSON.stringify({ packageId: "starter", mode: "payment" }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("creates checkout session for valid subscription request", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "123", email: "test@test.com", name: "Test User" },
    });
    (prisma.user.findUnique as Mock).mockResolvedValue({
      stripeCustomerId: "cus_existing",
    });
    (prisma.subscription.findUnique as Mock).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/checkout",
      {
        method: "POST",
        body: JSON.stringify({ planId: "hobby", mode: "subscription" }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sessionId).toBe("cs_123");
  });

  it("returns 400 when user already has an active subscription", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "123", email: "test@test.com" },
    });
    (prisma.user.findUnique as Mock).mockResolvedValue({
      stripeCustomerId: "cus_existing",
    });
    (prisma.subscription.findUnique as Mock).mockResolvedValue({
      status: "ACTIVE",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/checkout",
      {
        method: "POST",
        body: JSON.stringify({ planId: "hobby", mode: "subscription" }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("already have an active subscription");
  });

  it("returns 400 for invalid request with no packageId or planId", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "123", email: "test@test.com" },
    });
    (prisma.user.findUnique as Mock).mockResolvedValue({
      stripeCustomerId: "cus_existing",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/checkout",
      {
        method: "POST",
        body: JSON.stringify({ mode: "unknown" }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request");
  });

  it("returns 500 when package has invalid price configuration", async () => {
    // Reset mocks and reconfigure with invalid price for package
    vi.resetModules();

    vi.doMock("@/lib/stripe/client", () => ({
      getStripe: vi.fn(() => ({
        customers: {
          create: vi.fn().mockResolvedValue({ id: "cus_123" }),
        },
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue({
              id: "cs_123",
              url: "https://checkout.stripe.com/session",
            }),
          },
        },
      })),
      TOKEN_PACKAGES: {
        starter: { tokens: 10, price: -1, name: "Starter Pack" }, // Invalid negative price
      },
      SUBSCRIPTION_PLANS: {
        hobby: {
          tokensPerMonth: 30,
          priceGBP: 4.99,
          maxRollover: 30,
          name: "Hobby",
        },
      },
    }));

    vi.doMock("@/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "123", email: "test@test.com", name: "Test User" },
      }),
    }));

    vi.doMock("@/lib/prisma", () => ({
      default: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            stripeCustomerId: "cus_existing",
          }),
          update: vi.fn(),
        },
        subscription: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      },
    }));

    const { POST: POSTWithInvalidPackagePrice } = await import("./route");

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/checkout",
      {
        method: "POST",
        body: JSON.stringify({ packageId: "starter", mode: "payment" }),
      },
    );

    const response = await POSTWithInvalidPackagePrice(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Invalid package configuration");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Invalid price configuration for package starter",
      ),
    );

    consoleErrorSpy.mockRestore();
  });

  it("returns 500 when plan has invalid price configuration", async () => {
    // Reset mocks and reconfigure with invalid price
    vi.resetModules();

    // Re-mock with invalid price for plan
    vi.doMock("@/lib/stripe/client", () => ({
      getStripe: vi.fn(() => ({
        customers: {
          create: vi.fn().mockResolvedValue({ id: "cus_123" }),
        },
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue({
              id: "cs_123",
              url: "https://checkout.stripe.com/session",
            }),
          },
        },
      })),
      TOKEN_PACKAGES: {
        starter: { tokens: 10, price: 2.99, name: "Starter Pack" },
      },
      SUBSCRIPTION_PLANS: {
        hobby: {
          tokensPerMonth: 30,
          priceGBP: -1,
          maxRollover: 30,
          name: "Hobby",
        }, // Invalid negative price
      },
    }));

    vi.doMock("@/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "123", email: "test@test.com", name: "Test User" },
      }),
    }));

    vi.doMock("@/lib/prisma", () => ({
      default: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            stripeCustomerId: "cus_existing",
          }),
          update: vi.fn(),
        },
        subscription: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      },
    }));

    const { POST: POSTWithInvalidPrice } = await import("./route");

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/checkout",
      {
        method: "POST",
        body: JSON.stringify({ planId: "hobby", mode: "subscription" }),
      },
    );

    const response = await POSTWithInvalidPrice(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Invalid plan configuration");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid price configuration for plan hobby"),
    );

    consoleErrorSpy.mockRestore();
  });

  it("returns 500 when database error occurs while fetching user", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "123", email: "test@test.com" },
    });
    // Simulate an error by making prisma.user.findUnique throw
    (prisma.user.findUnique as Mock).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/checkout",
      {
        method: "POST",
        body: JSON.stringify({ packageId: "starter", mode: "payment" }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch user");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching user:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
