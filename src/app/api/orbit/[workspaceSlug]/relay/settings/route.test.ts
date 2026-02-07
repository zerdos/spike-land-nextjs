/**
 * Relay Approval Settings API Tests
 *
 * Unit tests for the approval settings API endpoints.
 * Resolves #569
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock relay functions
vi.mock("@/lib/relay", () => ({
  getApprovalSettings: vi.fn(),
  updateApprovalSettings: vi.fn(),
}));

// Import after mocks
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getApprovalSettings, updateApprovalSettings } from "@/lib/relay";
import { NextRequest } from "next/server";
import { GET, PUT } from "./route";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockGetSettings = getApprovalSettings as ReturnType<typeof vi.fn>;
const mockUpdateSettings = updateApprovalSettings as ReturnType<typeof vi.fn>;

describe("Relay Settings API", () => {
  const mockSession = {
    user: { id: "user-123", email: "test@example.com" },
  };

  const mockWorkspace = {
    id: "workspace-123",
    name: "Test Workspace",
    settings: {},
  };

  const mockSettings = {
    enabled: true,
    requiredApprovals: 1,
    autoApproveThreshold: 0.9,
    escalationTimeoutHours: 24,
    approverRoles: ["ADMIN"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue(
      mockWorkspace as never,
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // GET /api/orbit/[workspaceSlug]/relay/settings
  // ============================================

  describe("GET", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/settings",
      );
      const response = await GET(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });
      expect(response.status).toBe(401);
    });

    it("returns 404 when workspace not found", async () => {
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);
      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/settings",
      );
      const response = await GET(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });
      expect(response.status).toBe(404);
    });

    it("returns settings successfully", async () => {
      mockGetSettings.mockReturnValue(mockSettings);

      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/settings",
      );
      const response = await GET(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.settings).toEqual(mockSettings);
    });
  });

  // ============================================
  // PUT /api/orbit/[workspaceSlug]/relay/settings
  // ============================================

  describe("PUT", () => {
    const createRequest = (body: any) =>
      new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/settings",
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
      );

    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const request = createRequest({ enabled: false });
      const response = await PUT(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });
      expect(response.status).toBe(401);
    });

    it("returns 404 when workspace not found or not admin", async () => {
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);
      const request = createRequest({ enabled: false });
      const response = await PUT(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });
      expect(response.status).toBe(404);
    });

    it("validates autoApproveThreshold", async () => {
      const request = createRequest({ autoApproveThreshold: 1.5 });
      const response = await PUT(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("autoApproveThreshold");
    });

    it("validates escalationTimeoutHours", async () => {
      const request = createRequest({ escalationTimeoutHours: -1 });
      const response = await PUT(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("escalationTimeoutHours");
    });

    it("validates approverRoles", async () => {
      const request = createRequest({ approverRoles: ["INVALID"] });
      const response = await PUT(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("approverRoles");
    });

    it("updates settings successfully", async () => {
      mockUpdateSettings.mockResolvedValue({
        ...mockSettings,
        enabled: false,
      });

      const request = createRequest({ enabled: false });
      const response = await PUT(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.settings.enabled).toBe(false);
      expect(mockUpdateSettings).toHaveBeenCalledWith("workspace-123", {
        enabled: false,
      });
    });

    it("handles update failure", async () => {
      mockUpdateSettings.mockRejectedValue(new Error("DB Error"));

      const request = createRequest({ enabled: false });
      const response = await PUT(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("Failed to update");
    });
  });
});
