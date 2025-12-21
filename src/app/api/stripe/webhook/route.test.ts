import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Create mock functions using vi.hoisted to ensure they're available in vi.mock
const {
  mockConstructEvent,
  mockSubscriptionsRetrieve,
  mockPrismaTransaction,
  mockPrismaSubscriptionFindUnique,
  mockPrismaSubscriptionUpdate,
  mockPrismaSubscriptionUpdateMany,
  mockPrismaUserFindFirst,
} = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockSubscriptionsRetrieve: vi.fn(),
  mockPrismaTransaction: vi.fn(),
  mockPrismaSubscriptionFindUnique: vi.fn(),
  mockPrismaSubscriptionUpdate: vi.fn(),
  mockPrismaSubscriptionUpdateMany: vi.fn(),
  mockPrismaUserFindFirst: vi.fn(),
}));

// Mock Stripe
vi.mock("@/lib/stripe/client", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
    subscriptions: {
      retrieve: mockSubscriptionsRetrieve,
    },
  }),
}));

// Mock attribution tracking to prevent prisma calls during tests
vi.mock("@/lib/tracking/attribution", () => ({
  attributeConversion: vi.fn().mockResolvedValue(undefined),
}));

// Mock Prisma with dynamic mock implementation
vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: mockPrismaTransaction,
    subscription: {
      findUnique: mockPrismaSubscriptionFindUnique,
      update: mockPrismaSubscriptionUpdate,
      updateMany: mockPrismaSubscriptionUpdateMany,
    },
    user: {
      findFirst: mockPrismaUserFindFirst,
    },
  },
}));

import { POST } from "./route";

describe("POST /api/stripe/webhook", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";

    // Default mock implementations
    mockPrismaTransaction.mockImplementation((fn) =>
      fn({
        userTokenBalance: {
          findUnique: vi.fn().mockResolvedValue({ balance: 10 }),
          create: vi.fn().mockResolvedValue({ balance: 0 }),
          update: vi.fn().mockResolvedValue({}),
        },
        tokenTransaction: {
          create: vi.fn().mockResolvedValue({}),
        },
        tokensPackage: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        stripePayment: {
          create: vi.fn().mockResolvedValue({}),
        },
        subscription: {
          upsert: vi.fn().mockResolvedValue({}),
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn().mockResolvedValue({}),
          updateMany: vi.fn().mockResolvedValue({}),
        },
      })
    );
    mockPrismaSubscriptionFindUnique.mockResolvedValue(null);
    mockPrismaSubscriptionUpdate.mockResolvedValue({});
    mockPrismaSubscriptionUpdateMany.mockResolvedValue({});
    mockPrismaUserFindFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 413 when content-length exceeds maximum", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/stripe/webhook",
      {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-length": "100000" },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(413);
    expect(data.error).toBe("Request too large");
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/stripe/webhook",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing stripe-signature header");
  });

  it("returns 500 when webhook secret is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/webhook",
      {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "stripe-signature": "sig_test" },
      },
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Webhook secret not configured");
    consoleSpy.mockRestore();
  });

  it("returns 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/webhook",
      {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "stripe-signature": "sig_invalid" },
      },
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Webhook signature verification failed");
    consoleSpy.mockRestore();
  });

  describe("checkout.session.completed - token purchase", () => {
    it("handles token purchase with existing balance", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            metadata: {
              userId: "user_123",
              type: "token_purchase",
              tokens: "50",
              packageId: "basic",
            },
            amount_total: 999,
            payment_intent: "pi_123",
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[Stripe] Credited 50 tokens to user user_123",
      );
      consoleSpy.mockRestore();
    });

    it("handles token purchase when no balance exists (creates new balance)", async () => {
      mockPrismaTransaction.mockImplementation((fn) =>
        fn({
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ balance: 0 }),
            update: vi.fn().mockResolvedValue({}),
          },
          tokenTransaction: {
            create: vi.fn().mockResolvedValue({}),
          },
          tokensPackage: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
          stripePayment: {
            create: vi.fn().mockResolvedValue({}),
          },
          subscription: {
            upsert: vi.fn().mockResolvedValue({}),
          },
        })
      );

      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            metadata: {
              userId: "user_123",
              type: "token_purchase",
              tokens: "50",
              packageId: "basic",
            },
            amount_total: 999,
            payment_intent: "pi_123",
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      consoleSpy.mockRestore();
    });

    it("handles token purchase with existing package (creates StripePayment)", async () => {
      mockPrismaTransaction.mockImplementation((fn) =>
        fn({
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue({ balance: 10 }),
            create: vi.fn().mockResolvedValue({ balance: 0 }),
            update: vi.fn().mockResolvedValue({}),
          },
          tokenTransaction: {
            create: vi.fn().mockResolvedValue({}),
          },
          tokensPackage: {
            findFirst: vi.fn().mockResolvedValue({
              id: "pkg_123",
              name: "Basic Pack",
            }),
          },
          stripePayment: {
            create: vi.fn().mockResolvedValue({}),
          },
          subscription: {
            upsert: vi.fn().mockResolvedValue({}),
          },
        })
      );

      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            metadata: {
              userId: "user_123",
              type: "token_purchase",
              tokens: "50",
              packageId: "basic",
            },
            amount_total: 999,
            payment_intent: "pi_123",
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      consoleSpy.mockRestore();
    });

    it("handles token purchase with no payment_intent (uses session.id)", async () => {
      mockPrismaTransaction.mockImplementation((fn) =>
        fn({
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue({ balance: 10 }),
            create: vi.fn().mockResolvedValue({ balance: 0 }),
            update: vi.fn().mockResolvedValue({}),
          },
          tokenTransaction: {
            create: vi.fn().mockResolvedValue({}),
          },
          tokensPackage: {
            findFirst: vi.fn().mockResolvedValue({
              id: "pkg_123",
              name: "Basic Pack",
            }),
          },
          stripePayment: {
            create: vi.fn().mockResolvedValue({}),
          },
          subscription: {
            upsert: vi.fn().mockResolvedValue({}),
          },
        })
      );

      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            metadata: {
              userId: "user_123",
              type: "token_purchase",
              tokens: "50",
              packageId: "basic",
            },
            amount_total: null,
            payment_intent: null,
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  describe("checkout.session.completed - subscription", () => {
    it("handles subscription with existing balance", async () => {
      const subscriptionStart = Math.floor(Date.now() / 1000);
      const subscriptionEnd = subscriptionStart + 30 * 24 * 60 * 60;

      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            subscription: "sub_123",
            metadata: {
              userId: "user_123",
              type: "subscription",
              planId: "hobby",
              tokensPerMonth: "30",
              maxRollover: "30",
            },
          },
        },
      });
      mockSubscriptionsRetrieve.mockResolvedValue({
        current_period_start: subscriptionStart,
        current_period_end: subscriptionEnd,
        items: {
          data: [
            {
              price: { id: "price_123" },
              current_period_start: subscriptionStart,
              current_period_end: subscriptionEnd,
            },
          ],
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[Stripe] Created subscription for user user_123, credited 30 tokens",
      );
      consoleSpy.mockRestore();
    });

    it("handles subscription when no balance exists (creates new balance)", async () => {
      const subscriptionStart = Math.floor(Date.now() / 1000);
      const subscriptionEnd = subscriptionStart + 30 * 24 * 60 * 60;

      mockPrismaTransaction.mockImplementation((fn) =>
        fn({
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ balance: 0 }),
            update: vi.fn().mockResolvedValue({}),
          },
          tokenTransaction: {
            create: vi.fn().mockResolvedValue({}),
          },
          tokensPackage: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
          stripePayment: {
            create: vi.fn().mockResolvedValue({}),
          },
          subscription: {
            upsert: vi.fn().mockResolvedValue({}),
          },
        })
      );

      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            subscription: "sub_123",
            metadata: {
              userId: "user_123",
              type: "subscription",
              planId: "hobby",
              tokensPerMonth: "30",
            },
          },
        },
      });
      mockSubscriptionsRetrieve.mockResolvedValue({
        current_period_start: subscriptionStart,
        current_period_end: subscriptionEnd,
        items: {
          data: [
            {
              price: { id: "price_123" },
              current_period_start: subscriptionStart,
              current_period_end: subscriptionEnd,
            },
          ],
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      consoleSpy.mockRestore();
    });

    it("handles subscription with empty items.data array (uses defaults)", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            subscription: "sub_123",
            metadata: {
              userId: "user_123",
              type: "subscription",
              planId: "hobby",
              tokensPerMonth: "30",
              maxRollover: "30",
            },
          },
        },
      });
      mockSubscriptionsRetrieve.mockResolvedValue({
        items: {
          data: [],
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  it("ignores event when userId is missing from metadata", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_123",
          metadata: {},
        },
      },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/webhook",
      {
        method: "POST",
        body: "test_body",
        headers: { "stripe-signature": "sig_valid" },
      },
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      "No userId in checkout session metadata",
    );
    consoleSpy.mockRestore();
  });

  it("handles checkout session when metadata is null/undefined", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_123",
          metadata: null,
        },
      },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/webhook",
      {
        method: "POST",
        body: "test_body",
        headers: { "stripe-signature": "sig_valid" },
      },
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      "No userId in checkout session metadata",
    );
    consoleSpy.mockRestore();
  });

  describe("invoice.paid", () => {
    it("handles invoice.paid for subscription renewal with existing user and balance", async () => {
      const subscriptionStart = Math.floor(Date.now() / 1000);
      const subscriptionEnd = subscriptionStart + 30 * 24 * 60 * 60;

      mockConstructEvent.mockReturnValue({
        type: "invoice.paid",
        data: {
          object: {
            id: "in_123",
            customer: "cus_123",
            billing_reason: "subscription_cycle",
            parent: {
              subscription_details: {
                subscription: "sub_123",
              },
            },
          },
        },
      });

      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        items: {
          data: [
            {
              price: { id: "price_123" },
              current_period_start: subscriptionStart,
              current_period_end: subscriptionEnd,
            },
          ],
        },
      });

      mockPrismaUserFindFirst.mockResolvedValue({
        id: "user_123",
        stripeCustomerId: "cus_123",
        subscription: {
          id: "sub_db_123",
          stripeSubscriptionId: "sub_123",
          tokensPerMonth: 30,
          maxRollover: 30,
        },
      });

      mockPrismaTransaction.mockImplementation((fn) =>
        fn({
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue({ balance: 25 }),
            create: vi.fn().mockResolvedValue({ balance: 0 }),
            update: vi.fn().mockResolvedValue({}),
          },
          tokenTransaction: {
            create: vi.fn().mockResolvedValue({}),
          },
          subscription: {
            update: vi.fn().mockResolvedValue({}),
          },
        })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[Stripe] Renewed subscription for user user_123",
      );
      consoleSpy.mockRestore();
    });

    it("handles invoice.paid when no balance exists (creates new balance)", async () => {
      const subscriptionStart = Math.floor(Date.now() / 1000);
      const subscriptionEnd = subscriptionStart + 30 * 24 * 60 * 60;

      mockConstructEvent.mockReturnValue({
        type: "invoice.paid",
        data: {
          object: {
            id: "in_123",
            customer: "cus_123",
            billing_reason: "subscription_cycle",
            parent: {
              subscription_details: {
                subscription: "sub_123",
              },
            },
          },
        },
      });

      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        items: {
          data: [
            {
              price: { id: "price_123" },
              current_period_start: subscriptionStart,
              current_period_end: subscriptionEnd,
            },
          ],
        },
      });

      mockPrismaUserFindFirst.mockResolvedValue({
        id: "user_123",
        stripeCustomerId: "cus_123",
        subscription: {
          id: "sub_db_123",
          stripeSubscriptionId: "sub_123",
          tokensPerMonth: 30,
          maxRollover: 0,
        },
      });

      mockPrismaTransaction.mockImplementation((fn) =>
        fn({
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ balance: 0 }),
            update: vi.fn().mockResolvedValue({}),
          },
          tokenTransaction: {
            create: vi.fn().mockResolvedValue({}),
          },
          subscription: {
            update: vi.fn().mockResolvedValue({}),
          },
        })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      consoleSpy.mockRestore();
    });

    it("handles invoice.paid with unlimited rollover (maxRollover = 0)", async () => {
      const subscriptionStart = Math.floor(Date.now() / 1000);
      const subscriptionEnd = subscriptionStart + 30 * 24 * 60 * 60;

      mockConstructEvent.mockReturnValue({
        type: "invoice.paid",
        data: {
          object: {
            id: "in_123",
            customer: "cus_123",
            billing_reason: "subscription_cycle",
            parent: {
              subscription_details: {
                subscription: "sub_123",
              },
            },
          },
        },
      });

      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        items: {
          data: [
            {
              price: { id: "price_123" },
              current_period_start: subscriptionStart,
              current_period_end: subscriptionEnd,
            },
          ],
        },
      });

      mockPrismaUserFindFirst.mockResolvedValue({
        id: "user_123",
        stripeCustomerId: "cus_123",
        subscription: {
          id: "sub_db_123",
          stripeSubscriptionId: "sub_123",
          tokensPerMonth: 30,
          maxRollover: 0,
        },
      });

      mockPrismaTransaction.mockImplementation((fn) =>
        fn({
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue({ balance: 100 }),
            create: vi.fn().mockResolvedValue({ balance: 0 }),
            update: vi.fn().mockResolvedValue({}),
          },
          tokenTransaction: {
            create: vi.fn().mockResolvedValue({}),
          },
          subscription: {
            update: vi.fn().mockResolvedValue({}),
          },
        })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      consoleSpy.mockRestore();
    });

    it("skips invoice.paid for subscription_create (initial)", async () => {
      mockConstructEvent.mockReturnValue({
        type: "invoice.paid",
        data: {
          object: {
            id: "in_123",
            customer: "cus_123",
            billing_reason: "subscription_create",
            parent: {
              subscription_details: {
                subscription: "sub_123",
              },
            },
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
    });

    it("skips invoice.paid when no subscription ID", async () => {
      mockConstructEvent.mockReturnValue({
        type: "invoice.paid",
        data: {
          object: {
            id: "in_123",
            customer: "cus_123",
            billing_reason: "manual",
            parent: null,
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
    });

    it("skips invoice.paid when no user found for customer", async () => {
      const subscriptionStart = Math.floor(Date.now() / 1000);
      const subscriptionEnd = subscriptionStart + 30 * 24 * 60 * 60;

      mockConstructEvent.mockReturnValue({
        type: "invoice.paid",
        data: {
          object: {
            id: "in_123",
            customer: "cus_unknown",
            billing_reason: "subscription_cycle",
            parent: {
              subscription_details: {
                subscription: "sub_123",
              },
            },
          },
        },
      });

      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        items: {
          data: [
            {
              price: { id: "price_123" },
              current_period_start: subscriptionStart,
              current_period_end: subscriptionEnd,
            },
          ],
        },
      });

      mockPrismaUserFindFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        "No user or subscription found for customer cus_unknown",
      );
      consoleSpy.mockRestore();
    });

    it("skips invoice.paid when user has no subscription", async () => {
      const subscriptionStart = Math.floor(Date.now() / 1000);
      const subscriptionEnd = subscriptionStart + 30 * 24 * 60 * 60;

      mockConstructEvent.mockReturnValue({
        type: "invoice.paid",
        data: {
          object: {
            id: "in_123",
            customer: "cus_123",
            billing_reason: "subscription_cycle",
            parent: {
              subscription_details: {
                subscription: "sub_123",
              },
            },
          },
        },
      });

      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        items: {
          data: [
            {
              price: { id: "price_123" },
              current_period_start: subscriptionStart,
              current_period_end: subscriptionEnd,
            },
          ],
        },
      });

      mockPrismaUserFindFirst.mockResolvedValue({
        id: "user_123",
        stripeCustomerId: "cus_123",
        subscription: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        "No user or subscription found for customer cus_123",
      );
      consoleSpy.mockRestore();
    });

    it("handles invoice.paid with subscription as object (not string)", async () => {
      const subscriptionStart = Math.floor(Date.now() / 1000);
      const subscriptionEnd = subscriptionStart + 30 * 24 * 60 * 60;

      mockConstructEvent.mockReturnValue({
        type: "invoice.paid",
        data: {
          object: {
            id: "in_123",
            customer: "cus_123",
            billing_reason: "subscription_cycle",
            parent: {
              subscription_details: {
                subscription: { id: "sub_123" },
              },
            },
          },
        },
      });

      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        items: {
          data: [
            {
              price: { id: "price_123" },
              current_period_start: subscriptionStart,
              current_period_end: subscriptionEnd,
            },
          ],
        },
      });

      mockPrismaUserFindFirst.mockResolvedValue({
        id: "user_123",
        stripeCustomerId: "cus_123",
        subscription: {
          id: "sub_db_123",
          stripeSubscriptionId: "sub_123",
          tokensPerMonth: 30,
          maxRollover: 30,
        },
      });

      mockPrismaTransaction.mockImplementation((fn) =>
        fn({
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue({ balance: 25 }),
            create: vi.fn().mockResolvedValue({ balance: 0 }),
            update: vi.fn().mockResolvedValue({}),
          },
          tokenTransaction: {
            create: vi.fn().mockResolvedValue({}),
          },
          subscription: {
            update: vi.fn().mockResolvedValue({}),
          },
        })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      consoleSpy.mockRestore();
    });

    it("handles invoice.paid with empty items.data array (uses defaults)", async () => {
      mockConstructEvent.mockReturnValue({
        type: "invoice.paid",
        data: {
          object: {
            id: "in_123",
            customer: "cus_123",
            billing_reason: "subscription_cycle",
            parent: {
              subscription_details: {
                subscription: "sub_123",
              },
            },
          },
        },
      });

      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        items: {
          data: [],
        },
      });

      mockPrismaUserFindFirst.mockResolvedValue({
        id: "user_123",
        stripeCustomerId: "cus_123",
        subscription: {
          id: "sub_db_123",
          stripeSubscriptionId: "sub_123",
          tokensPerMonth: 30,
          maxRollover: 30,
        },
      });

      mockPrismaTransaction.mockImplementation((fn) =>
        fn({
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue({ balance: 25 }),
            create: vi.fn().mockResolvedValue({ balance: 0 }),
            update: vi.fn().mockResolvedValue({}),
          },
          tokenTransaction: {
            create: vi.fn().mockResolvedValue({}),
          },
          subscription: {
            update: vi.fn().mockResolvedValue({}),
          },
        })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  describe("customer.subscription.updated", () => {
    it("handles subscription updated when subscription exists (active status)", async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      mockPrismaSubscriptionFindUnique.mockResolvedValue({
        id: "sub_db_123",
        stripeSubscriptionId: "sub_123",
      });

      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123",
            status: "active",
            cancel_at_period_end: false,
            items: {
              data: [
                {
                  current_period_end: periodEnd,
                },
              ],
            },
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockPrismaSubscriptionUpdate).toHaveBeenCalled();
    });

    it("handles subscription updated with past_due status", async () => {
      mockPrismaSubscriptionFindUnique.mockResolvedValue({
        id: "sub_db_123",
        stripeSubscriptionId: "sub_123",
      });

      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123",
            status: "past_due",
            cancel_at_period_end: false,
            items: {
              data: [],
            },
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it("handles subscription updated with canceled status", async () => {
      mockPrismaSubscriptionFindUnique.mockResolvedValue({
        id: "sub_db_123",
        stripeSubscriptionId: "sub_123",
      });

      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123",
            status: "canceled",
            cancel_at_period_end: true,
            items: {
              data: [],
            },
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it("handles subscription updated with unpaid status", async () => {
      mockPrismaSubscriptionFindUnique.mockResolvedValue({
        id: "sub_db_123",
        stripeSubscriptionId: "sub_123",
      });

      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123",
            status: "unpaid",
            cancel_at_period_end: false,
            items: {
              data: [],
            },
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it("handles subscription updated with unknown status (defaults to ACTIVE)", async () => {
      mockPrismaSubscriptionFindUnique.mockResolvedValue({
        id: "sub_db_123",
        stripeSubscriptionId: "sub_123",
      });

      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123",
            status: "trialing",
            cancel_at_period_end: false,
            items: {
              data: [],
            },
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it("skips subscription updated when subscription not found in DB", async () => {
      mockPrismaSubscriptionFindUnique.mockResolvedValue(null);

      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_unknown",
            status: "active",
            cancel_at_period_end: false,
            items: {
              data: [],
            },
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockPrismaSubscriptionUpdate).not.toHaveBeenCalled();
    });
  });

  describe("customer.subscription.deleted", () => {
    it("handles subscription deleted", async () => {
      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_123",
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockPrismaSubscriptionUpdateMany).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: "sub_123" },
        data: { status: "CANCELED" },
      });
    });
  });

  describe("checkout.session.completed - tier_upgrade", () => {
    it("handles tier upgrade with valid metadata", async () => {
      // Add upsert method to mock for tier upgrade handler
      mockPrismaTransaction.mockImplementation((fn) =>
        fn({
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue({ balance: 10 }),
            create: vi.fn().mockResolvedValue({ balance: 0 }),
            update: vi.fn().mockResolvedValue({}),
            upsert: vi.fn().mockResolvedValue({ balance: 20, tier: "BASIC" }),
          },
          tokenTransaction: {
            create: vi.fn().mockResolvedValue({}),
          },
          subscription: {
            upsert: vi.fn().mockResolvedValue({}),
          },
        })
      );

      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        items: {
          data: [
            {
              price: { id: "price_123" },
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            },
          ],
        },
      });

      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            subscription: "sub_123",
            metadata: {
              userId: "user_123",
              type: "tier_upgrade",
              tier: "BASIC",
              previousTier: "FREE",
              wellCapacity: "20",
            },
            amount_total: 500,
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[Stripe] Tier upgrade completed for user user_123: FREE → BASIC",
      );
      consoleSpy.mockRestore();
    });

    it("handles tier upgrade without wellCapacity (logs error)", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            subscription: "sub_123",
            metadata: {
              userId: "user_123",
              type: "tier_upgrade",
              tier: "BASIC",
              previousTier: "FREE",
              // wellCapacity missing
            },
            amount_total: 500,
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Missing tier or wellCapacity in tier_upgrade metadata",
      );
      consoleSpy.mockRestore();
    });

    it("handles tier upgrade without subscription ID (logs error)", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            subscription: null, // No subscription
            metadata: {
              userId: "user_123",
              type: "tier_upgrade",
              tier: "BASIC",
              previousTier: "FREE",
              wellCapacity: "20",
            },
            amount_total: 500,
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        "No subscription ID in tier_upgrade session",
      );
      consoleSpy.mockRestore();
    });

    it("handles tier upgrade with invalid tier value (logs error)", async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        items: {
          data: [
            {
              price: { id: "price_123" },
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            },
          ],
        },
      });

      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            subscription: "sub_123",
            metadata: {
              userId: "user_123",
              type: "tier_upgrade",
              tier: "INVALID_TIER",
              previousTier: "FREE",
              wellCapacity: "20",
            },
            amount_total: 500,
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith("Invalid tier value: INVALID_TIER");
      consoleSpy.mockRestore();
    });

    it("handles PREMIUM tier upgrade", async () => {
      // Add upsert method to mock for tier upgrade handler
      mockPrismaTransaction.mockImplementation((fn) =>
        fn({
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue({ balance: 50 }),
            create: vi.fn().mockResolvedValue({ balance: 0 }),
            update: vi.fn().mockResolvedValue({}),
            upsert: vi.fn().mockResolvedValue({ balance: 100, tier: "PREMIUM" }),
          },
          tokenTransaction: {
            create: vi.fn().mockResolvedValue({}),
          },
          subscription: {
            upsert: vi.fn().mockResolvedValue({}),
          },
        })
      );

      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_456",
        items: {
          data: [
            {
              price: { id: "price_premium" },
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            },
          ],
        },
      });

      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_456",
            subscription: "sub_456",
            metadata: {
              userId: "user_456",
              type: "tier_upgrade",
              tier: "PREMIUM",
              previousTier: "STANDARD",
              wellCapacity: "100",
            },
            amount_total: 2000,
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[Stripe] Tier upgrade completed for user user_456: STANDARD → PREMIUM",
      );
      consoleSpy.mockRestore();
    });
  });

  describe("error handling", () => {
    it("returns 500 when webhook processing throws an error", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            metadata: {
              userId: "user_123",
              type: "token_purchase",
              tokens: "50",
              packageId: "basic",
            },
            amount_total: 999,
            payment_intent: "pi_123",
          },
        },
      });

      mockPrismaTransaction.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(
        "http://localhost:3000/api/stripe/webhook",
        {
          method: "POST",
          body: "test_body",
          headers: { "stripe-signature": "sig_valid" },
        },
      );

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Webhook processing failed");
      consoleSpy.mockRestore();
    });
  });

  it("logs unhandled event types", async () => {
    mockConstructEvent.mockReturnValue({
      type: "some.other.event",
      data: { object: {} },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/stripe/webhook",
      {
        method: "POST",
        body: "test_body",
        headers: { "stripe-signature": "sig_valid" },
      },
    );

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Unhandled event type: some.other.event",
    );
    consoleSpy.mockRestore();
  });
});
