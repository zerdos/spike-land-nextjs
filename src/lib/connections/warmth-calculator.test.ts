import { calculateWarmth } from "./warmth-calculator";
// Mock prisma
import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    connection: {
      findUnique: vi.fn(),
    },
    inboxItem: {
      findMany: vi.fn(),
    },
  },
}));

describe("calculateWarmth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0 if connection not found or no platform presence", async () => {
    (prisma.connection.findUnique as any).mockResolvedValue(null);
    const score = await calculateWarmth("123");
    expect(score).toBe(0);
  });

  it("calculates score based on interactions", async () => {
    (prisma.connection.findUnique as any).mockResolvedValue({
      id: "123",
      workspaceId: "ws1",
      platformPresence: [{ handle: "@test", platform: "TWITTER" }],
    });

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    (prisma.inboxItem.findMany as any).mockResolvedValue([
      { receivedAt: yesterday, content: "Hello", sentimentScore: 0.8 },
      { receivedAt: yesterday, content: "World", sentimentScore: 0.5 },
    ]);

    const score = await calculateWarmth("123");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
