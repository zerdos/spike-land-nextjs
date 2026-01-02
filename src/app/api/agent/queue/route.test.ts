import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth/agent", () => ({
  verifyAgentAuth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    app: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/upstash", () => ({
  getAppsWithPending: vi.fn(),
  getPendingCount: vi.fn(),
}));

const { verifyAgentAuth } = await import("@/lib/auth/agent");
const prisma = (await import("@/lib/prisma")).default;
const { getAppsWithPending, getPendingCount } = await import("@/lib/upstash");

describe("GET /api/agent/queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if agent is not authenticated", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(false);

    const request = new NextRequest("http://localhost/api/agent/queue", {
      headers: { Authorization: "Bearer invalid-key" },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return empty array when no apps have pending messages", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(getAppsWithPending).mockResolvedValue([]);

    const request = new NextRequest("http://localhost/api/agent/queue", {
      headers: { Authorization: "Bearer valid-key" },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.apps).toEqual([]);
  });

  it("should return apps with pending messages", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(getAppsWithPending).mockResolvedValue(["app-1", "app-2"]);
    vi.mocked(prisma.app.findMany).mockResolvedValue([
      {
        id: "app-1",
        name: "Test App 1",
        slug: "test-app-1",
        status: "WAITING",
        codespaceId: "test-app-1",
        codespaceUrl: "https://testing.spike.land/live/test-app-1/",
        lastAgentActivity: null,
        _count: { messages: 2 },
      },
      {
        id: "app-2",
        name: "Test App 2",
        slug: "test-app-2",
        status: "BUILDING",
        codespaceId: "test-app-2",
        codespaceUrl: "https://testing.spike.land/live/test-app-2/",
        lastAgentActivity: new Date(),
        _count: { messages: 1 },
      },
    ] as never);
    vi.mocked(getPendingCount).mockResolvedValue(1);

    const request = new NextRequest("http://localhost/api/agent/queue", {
      headers: { Authorization: "Bearer valid-key" },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.apps).toHaveLength(2);
    expect(data.apps[0].pendingCount).toBe(1);
    expect(data.totalPending).toBe(2);
  });
});
