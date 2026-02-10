import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

const mockSyncBridgeMindToGitHub = vi.fn();
vi.mock("@/lib/sync/bridgemind-github-sync", () => ({
  syncBridgeMindToGitHub: (...args: unknown[]) => mockSyncBridgeMindToGitHub(...args),
}));

const mockBridgeMindClient = {
  isAvailable: vi.fn(),
  listTasks: vi.fn(),
};

const mockGitHubProjectsClient = {
  isAvailable: vi.fn(),
  createIssue: vi.fn(),
  addItemToProject: vi.fn(),
};

vi.mock("@/lib/sync/create-sync-clients", () => ({
  createBridgeMindClient: () => mockBridgeMindClient,
  createGitHubProjectsClient: () => mockGitHubProjectsClient,
}));

const { GET } = await import("./route");

function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/cron/sync-bridgemind", {
    method: "GET",
    headers: new Headers(headers),
  });
}

describe("GET /api/cron/sync-bridgemind", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    mockBridgeMindClient.isAvailable.mockReturnValue(true);
    mockGitHubProjectsClient.isAvailable.mockReturnValue(true);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return 401 if no CRON_SECRET configured in production", async () => {
    (process.env as Record<string, string | undefined>)["NODE_ENV"] = "production";
    delete process.env.CRON_SECRET;

    const request = createMockRequest();
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 if wrong cron secret provided", async () => {
    process.env.CRON_SECRET = "correct-secret";

    const request = createMockRequest({
      authorization: "Bearer wrong-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("should accept valid Bearer token", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockSyncBridgeMindToGitHub.mockResolvedValue({
      success: true,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      durationMs: 100,
    });

    const request = createMockRequest({
      authorization: "Bearer test-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("should accept valid x-cron-secret header", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockSyncBridgeMindToGitHub.mockResolvedValue({
      success: true,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      durationMs: 50,
    });

    const request = createMockRequest({
      "x-cron-secret": "test-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("should allow requests in development without secret", async () => {
    (process.env as Record<string, string | undefined>)["NODE_ENV"] = "development";
    delete process.env.CRON_SECRET;
    mockSyncBridgeMindToGitHub.mockResolvedValue({
      success: true,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      durationMs: 50,
    });

    const request = createMockRequest();
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("should skip sync when BridgeMind is not configured", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockBridgeMindClient.isAvailable.mockReturnValue(false);

    const request = createMockRequest({
      authorization: "Bearer test-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("skipped");
    expect(mockSyncBridgeMindToGitHub).not.toHaveBeenCalled();
  });

  it("should skip sync when GitHub Projects is not configured", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockGitHubProjectsClient.isAvailable.mockReturnValue(false);

    const request = createMockRequest({
      authorization: "Bearer test-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("skipped");
  });

  it("should return sync results on success", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockSyncBridgeMindToGitHub.mockResolvedValue({
      success: true,
      created: 5,
      updated: 2,
      skipped: 10,
      errors: [],
      durationMs: 2500,
    });

    const request = createMockRequest({
      authorization: "Bearer test-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.created).toBe(5);
    expect(data.updated).toBe(2);
    expect(data.skipped).toBe(10);
    expect(data.durationMs).toBe(2500);
    expect(data.timestamp).toBeDefined();
  });

  it("should return 500 on sync failure", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockSyncBridgeMindToGitHub.mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = createMockRequest({
      authorization: "Bearer test-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("Database connection failed");
  });

  it("should return errors array from sync result", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockSyncBridgeMindToGitHub.mockResolvedValue({
      success: true,
      created: 1,
      updated: 0,
      skipped: 3,
      errors: ["Failed to create issue for bm-5: Rate limit"],
      durationMs: 1000,
    });

    const request = createMockRequest({
      authorization: "Bearer test-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0]).toContain("Rate limit");
  });
});
