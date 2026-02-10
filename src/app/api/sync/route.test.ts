import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/agent", () => ({
  verifyAgentAuth: vi.fn(),
}));

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

const { verifyAgentAuth } = await import("@/lib/auth/agent");
const { POST } = await import("./route");

describe("POST /api/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBridgeMindClient.isAvailable.mockReturnValue(true);
    mockGitHubProjectsClient.isAvailable.mockReturnValue(true);
  });

  it("should return 401 if agent is not authenticated", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(false);

    const request = new NextRequest("http://localhost/api/sync", {
      method: "POST",
      headers: { Authorization: "Bearer invalid" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 503 if BridgeMind is not configured", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    mockBridgeMindClient.isAvailable.mockReturnValue(false);

    const request = new NextRequest("http://localhost/api/sync", {
      method: "POST",
      headers: { Authorization: "Bearer valid-key" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe("BridgeMind is not configured");
  });

  it("should return 503 if GitHub Projects is not configured", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    mockBridgeMindClient.isAvailable.mockReturnValue(true);
    mockGitHubProjectsClient.isAvailable.mockReturnValue(false);

    const request = new NextRequest("http://localhost/api/sync", {
      method: "POST",
      headers: { Authorization: "Bearer valid-key" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe("GitHub Projects is not configured");
  });

  it("should return sync result on success", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    mockSyncBridgeMindToGitHub.mockResolvedValue({
      success: true,
      created: 3,
      updated: 1,
      skipped: 5,
      errors: [],
      durationMs: 1234,
    });

    const request = new NextRequest("http://localhost/api/sync", {
      method: "POST",
      headers: { Authorization: "Bearer valid-key" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.created).toBe(3);
    expect(data.updated).toBe(1);
    expect(data.skipped).toBe(5);
    expect(data.errors).toHaveLength(0);
    expect(data.durationMs).toBe(1234);
    expect(data.timestamp).toBeDefined();
  });

  it("should return 500 when sync throws an exception", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    mockSyncBridgeMindToGitHub.mockRejectedValue(new Error("Database down"));

    const request = new NextRequest("http://localhost/api/sync", {
      method: "POST",
      headers: { Authorization: "Bearer valid-key" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Database down");
    expect(data.timestamp).toBeDefined();
  });

  it("should pass clients to syncBridgeMindToGitHub", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    mockSyncBridgeMindToGitHub.mockResolvedValue({
      success: true,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      durationMs: 50,
    });

    const request = new NextRequest("http://localhost/api/sync", {
      method: "POST",
      headers: { Authorization: "Bearer valid-key" },
    });

    await POST(request);

    expect(mockSyncBridgeMindToGitHub).toHaveBeenCalledTimes(1);
    expect(mockSyncBridgeMindToGitHub).toHaveBeenCalledWith({
      bridgemind: mockBridgeMindClient,
      github: mockGitHubProjectsClient,
    });
  });
});
