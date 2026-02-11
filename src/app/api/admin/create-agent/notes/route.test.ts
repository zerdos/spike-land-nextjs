import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    agentLearningNote: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { GET } from "./route";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockRequireAdmin = requireAdminByUserId as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  agentLearningNote: {
    groupBy: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
};

describe("GET /api/admin/create-agent/notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockRequireAdmin.mockResolvedValue(undefined);
    mockPrisma.agentLearningNote.groupBy.mockResolvedValue([]);
    mockPrisma.agentLearningNote.findMany.mockResolvedValue([]);
    mockPrisma.agentLearningNote.count.mockResolvedValue(0);
    mockPrisma.agentLearningNote.aggregate.mockResolvedValue({
      _avg: { confidenceScore: null },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {} });
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

  it("returns 200 with notes analytics data", async () => {
    mockPrisma.agentLearningNote.groupBy.mockResolvedValue([
      { status: "ACTIVE", _count: 15 },
      { status: "CANDIDATE", _count: 8 },
      { status: "DEPRECATED", _count: 3 },
    ]);
    mockPrisma.agentLearningNote.findMany
      .mockResolvedValueOnce([
        {
          id: "1",
          trigger: "React hooks",
          helpCount: 10,
          failCount: 1,
          confidenceScore: 0.85,
          status: "ACTIVE",
          lesson: "Use hooks properly",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "2",
          trigger: "Bad pattern",
          helpCount: 1,
          failCount: 8,
          confidenceScore: 0.2,
          status: "CANDIDATE",
          lesson: "Avoid this",
        },
      ]);
    mockPrisma.agentLearningNote.count.mockResolvedValue(26);
    mockPrisma.agentLearningNote.aggregate.mockResolvedValue({
      _avg: { confidenceScore: 0.65 },
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.byStatus).toHaveLength(3);
    expect(data.topEffective).toHaveLength(1);
    expect(data.bottomFailing).toHaveLength(1);
    expect(data.totalNotes).toBe(26);
    expect(data.averageConfidence).toBe(0.65);
  });

  it("returns defaults when prisma queries fail", async () => {
    mockPrisma.agentLearningNote.groupBy.mockRejectedValue(
      new Error("DB error"),
    );
    mockPrisma.agentLearningNote.findMany.mockRejectedValue(
      new Error("DB error"),
    );
    mockPrisma.agentLearningNote.count.mockRejectedValue(
      new Error("DB error"),
    );
    mockPrisma.agentLearningNote.aggregate.mockRejectedValue(
      new Error("DB error"),
    );

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.byStatus).toEqual([]);
    expect(data.topEffective).toEqual([]);
    expect(data.bottomFailing).toEqual([]);
    expect(data.totalNotes).toBe(0);
    expect(data.averageConfidence).toBe(0);
  });
});
