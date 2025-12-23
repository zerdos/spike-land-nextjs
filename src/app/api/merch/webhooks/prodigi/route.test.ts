/**
 * Tests for Prodigi Webhook Handler
 */

import crypto from "crypto";
import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/prisma", () => ({
  default: {
    merchWebhookEvent: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/pod", () => ({
  updateOrderFromWebhook: vi.fn(),
}));

const prisma = (await import("@/lib/prisma")).default;
const { updateOrderFromWebhook } = await import("@/lib/pod");

function createWebhookEvent(type: string, overrides: object = {}) {
  return {
    specversion: "1.0",
    type,
    source: "prodigi",
    id: `evt_${Date.now()}`,
    time: new Date().toISOString(),
    datacontenttype: "application/json",
    data: {
      order: {
        id: "ord_prodigi_123",
        merchantReference: "SL-20240101-TEST",
        status: {
          stage: "InProduction",
          details: {
            downloadAssets: "Complete",
            printReadyAssetsPrepared: "Complete",
            allocateProductionLocation: "Complete",
            inProduction: "InProgress",
            shipping: "NotStarted",
          },
        },
        shipments: [],
        ...overrides,
      },
    },
  };
}

function createSignedRequest(
  body: object,
  secret: string | null = null,
): NextRequest {
  const payload = JSON.stringify(body);
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (secret) {
    const signature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    headers["x-prodigi-signature"] = signature;
  }

  return new NextRequest("http://localhost/api/merch/webhooks/prodigi", {
    method: "POST",
    body: payload,
    headers,
  });
}

describe("POST /api/merch/webhooks/prodigi", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    vi.mocked(prisma.merchWebhookEvent.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.merchWebhookEvent.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.merchWebhookEvent.update).mockResolvedValue({} as never);
    vi.mocked(updateOrderFromWebhook).mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Signature Verification", () => {
    it("should accept request with valid signature", async () => {
      process.env.PRODIGI_WEBHOOK_SECRET = "test_secret";
      const event = createWebhookEvent("order.status.stage.changed");
      const request = createSignedRequest(event, "test_secret");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should reject request with invalid signature", async () => {
      process.env.PRODIGI_WEBHOOK_SECRET = "test_secret";
      const event = createWebhookEvent("order.status.stage.changed");
      const request = createSignedRequest(event, "wrong_secret");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid signature");
    });

    it("should reject request in production without webhook secret configured", async () => {
      vi.stubEnv("NODE_ENV", "production");
      delete process.env.PRODIGI_WEBHOOK_SECRET;
      const event = createWebhookEvent("order.status.stage.changed");
      const request = createSignedRequest(event);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Webhook secret not configured");
    });

    it("should allow request in development without webhook secret", async () => {
      vi.stubEnv("NODE_ENV", "development");
      delete process.env.PRODIGI_WEBHOOK_SECRET;
      const event = createWebhookEvent("order.status.stage.changed");
      const request = createSignedRequest(event);

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe("Event Handling", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
      delete process.env.PRODIGI_WEBHOOK_SECRET;
    });

    it("should process order.created event", async () => {
      const event = createWebhookEvent("order.created");
      const request = createSignedRequest(event);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // order.created doesn't call updateOrderFromWebhook
      expect(updateOrderFromWebhook).not.toHaveBeenCalled();
    });

    it("should process order.status.stage.changed event", async () => {
      const event = createWebhookEvent("order.status.stage.changed");
      const request = createSignedRequest(event);

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(updateOrderFromWebhook).toHaveBeenCalledWith(
        "ord_prodigi_123",
        "PRODIGI",
        "InProduction",
        undefined,
        undefined,
        undefined,
      );
    });

    it("should process order.shipment.created event with tracking", async () => {
      const event = createWebhookEvent("order.shipment.created", {
        shipments: [
          {
            id: "shp_123",
            status: "Shipped",
            carrier: {
              name: "Royal Mail",
              service: "Standard",
            },
            tracking: {
              number: "TRACK123",
              url: "https://track.example.com/TRACK123",
            },
          },
        ],
      });
      const request = createSignedRequest(event);

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(updateOrderFromWebhook).toHaveBeenCalledWith(
        "ord_prodigi_123",
        "PRODIGI",
        "Shipped",
        "TRACK123",
        "https://track.example.com/TRACK123",
        "Royal Mail",
      );
    });

    it("should handle unrecognized event types gracefully", async () => {
      const event = createWebhookEvent("order.unknown.event");
      const request = createSignedRequest(event);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Idempotency", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
      delete process.env.PRODIGI_WEBHOOK_SECRET;
    });

    it("should skip already processed events", async () => {
      vi.mocked(prisma.merchWebhookEvent.findUnique).mockResolvedValue({
        id: "1",
        eventId: "evt_123",
        processed: true,
        processedAt: new Date(),
      } as never);

      const event = createWebhookEvent("order.status.stage.changed");
      const request = createSignedRequest(event);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Event already processed");
      expect(updateOrderFromWebhook).not.toHaveBeenCalled();
    });

    it("should store event before processing", async () => {
      const event = createWebhookEvent("order.status.stage.changed");
      const request = createSignedRequest(event);

      await POST(request);

      expect(prisma.merchWebhookEvent.upsert).toHaveBeenCalledWith({
        where: { eventId: event.id },
        create: expect.objectContaining({
          eventId: event.id,
          provider: "PRODIGI",
          eventType: "order.status.stage.changed",
        }),
        update: {},
      });
    });

    it("should mark event as processed after successful handling", async () => {
      const event = createWebhookEvent("order.status.stage.changed");
      const request = createSignedRequest(event);

      await POST(request);

      expect(prisma.merchWebhookEvent.update).toHaveBeenCalledWith({
        where: { eventId: event.id },
        data: {
          processed: true,
          processedAt: expect.any(Date),
        },
      });
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
      delete process.env.PRODIGI_WEBHOOK_SECRET;
    });

    it("should reject invalid JSON payload", async () => {
      const request = new NextRequest(
        "http://localhost/api/merch/webhooks/prodigi",
        {
          method: "POST",
          body: "not valid json",
          headers: { "content-type": "application/json" },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid payload");
    });

    it("should return 500 if processing fails", async () => {
      vi.mocked(updateOrderFromWebhook).mockRejectedValue(
        new Error("Database error"),
      );

      const event = createWebhookEvent("order.status.stage.changed");
      const request = createSignedRequest(event);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to process webhook");
    });
  });
});
