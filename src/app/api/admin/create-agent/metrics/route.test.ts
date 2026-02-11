import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    $queryRaw: vi.fn(),
    agentLearningNote: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/create/cost-calculator", () => ({
  calculateTokenCost: vi.fn().mockReturnValue({
    totalCost: 0.5,
    inputCost: 0.3,
    outputCost: 0.15,
    cachedCost: 0.05,
  }),
}));

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { GET } from "./route";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockRequireAdmin = requireAdminByUserId as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  $queryRaw: ReturnType<typeof vi.fn>;
  agentLearningNote: {
    count: ReturnType<typeof vi.fn>;
  };
};

describe("GET /api/admin/create-agent/metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockRequireAdmin.mockResolvedValue(undefined);
    // Default mock responses for all queries
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ total: 100n, successes: 80n }]) // 24h success rate
      .mockResolvedValueOnce([{ total: 500n, successes: 400n }]) // 7d success rate
      .mockResolvedValueOnce([{ p50: 15000, p75: 25000, p95: 45000 }]) // latency
      .mockResolvedValueOnce([
        { iterations: 1, count: 50n },
        { iterations: 2, count: 30n },
      ]) // iterations
      .mockResolvedValueOnce([
        // model comparison
        {
          model: "opus",
          total: 200n,
          successes: 170n,
          avg_duration: 30000,
          total_input_tokens: 1000000n,
          total_output_tokens: 500000n,
          total_cached_tokens: 100000n,
        },
      ]);
    mockPrisma.agentLearningNote.count.mockResolvedValue(25);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    mockRequireAdmin.mockRejectedValue(
      new Error("Forbidden: Admin access required"),
    );
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 500 when auth throws", async () => {
    mockAuth.mockRejectedValue(new Error("Auth service down"));
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("returns 200 with complete metrics data", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.successRate.last24h.total).toBe(100);
    expect(data.successRate.last24h.successes).toBe(80);
    expect(data.successRate.last24h.rate).toBe(80);
    expect(data.latency.p50).toBe(15000);
    expect(data.latency.p95).toBe(45000);
    expect(data.iterationsHistogram).toHaveLength(2);
    expect(data.modelComparison).toHaveLength(1);
    expect(data.modelComparison[0].model).toBe("opus");
    expect(data.activeNotes).toBe(25);
    expect(data.totalCost).toBeGreaterThanOrEqual(0);
  });

  it("returns defaults when all queries fail", async () => {
    mockPrisma.$queryRaw.mockReset().mockRejectedValue(new Error("DB error"));
    mockPrisma.agentLearningNote.count.mockRejectedValue(
      new Error("DB error"),
    );

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.successRate.last24h.total).toBe(0);
    expect(data.latency.p50).toBe(0);
    expect(data.iterationsHistogram).toEqual([]);
    expect(data.modelComparison).toEqual([]);
    expect(data.activeNotes).toBe(0);
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {} });
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
