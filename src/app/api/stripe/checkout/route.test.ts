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
    hobby: { tokensPerMonth: 30, priceGBP: 4.99, maxRollover: 30, name: "Hobby" },
    creator: { tokensPerMonth: 100, priceGBP: 12.99, maxRollover: 100, name: "Creator" },
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

  it("returns 401 when user is not authenticated", async () => {
    (auth as Mock).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ packageId: "starter", mode: "payment" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when payment mode is missing packageId", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "123", email: "test@test.com" },
    });

    const request = new NextRequest("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ mode: "payment" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Package ID required for payment");
  });

  it("returns 400 when subscription mode is missing planId", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "123", email: "test@test.com" },
    });

    const request = new NextRequest("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ mode: "subscription" }),
    });

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

    const request = new NextRequest("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ packageId: "invalid", mode: "payment" }),
    });

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

    const request = new NextRequest("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ planId: "invalid", mode: "subscription" }),
    });

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

    const request = new NextRequest("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ packageId: "starter", mode: "payment" }),
    });

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

    const request = new NextRequest("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ packageId: "starter", mode: "payment" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "123" },
      data: { stripeCustomerId: "cus_123" },
    });
  });

  it("creates checkout session for valid subscription request", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "123", email: "test@test.com", name: "Test User" },
    });
    (prisma.user.findUnique as Mock).mockResolvedValue({
      stripeCustomerId: "cus_existing",
    });
    (prisma.subscription.findUnique as Mock).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ planId: "hobby", mode: "subscription" }),
    });

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

    const request = new NextRequest("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ planId: "hobby", mode: "subscription" }),
    });

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

    const request = new NextRequest("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ mode: "unknown" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request");
  });
});
