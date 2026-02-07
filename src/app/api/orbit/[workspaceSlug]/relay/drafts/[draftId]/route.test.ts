/**
 * Relay Draft Actions API Tests
 *
 * Unit tests for individual draft operations (approve, reject, edit, send).
 * Resolves #555, #569
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
    relayDraft: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock relay functions
vi.mock("@/lib/relay", () => ({
  approveDraftWorkflow: vi.fn(),
  rejectDraftWorkflow: vi.fn(),
  editDraft: vi.fn(),
  markDraftAsSent: vi.fn(),
  markDraftAsFailed: vi.fn(),
  getDraftWithHistory: vi.fn(),
}));

// Import after mocks
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  approveDraftWorkflow,
  editDraft,
  getDraftWithHistory,
  markDraftAsFailed,
  markDraftAsSent,
  rejectDraftWorkflow,
} from "@/lib/relay";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockApprove = approveDraftWorkflow as ReturnType<typeof vi.fn>;
const mockReject = rejectDraftWorkflow as ReturnType<typeof vi.fn>;
const mockEdit = editDraft as ReturnType<typeof vi.fn>;
const mockSend = markDraftAsSent as ReturnType<typeof vi.fn>;
const mockFail = markDraftAsFailed as ReturnType<typeof vi.fn>;
const mockGetHistory = getDraftWithHistory as ReturnType<typeof vi.fn>;

describe("Relay Draft Actions API", () => {
  const mockSession = {
    user: { id: "user-123", email: "test@example.com" },
  };

  const mockWorkspace = {
    id: "workspace-123",
    name: "Test Workspace",
  };

  const mockDraft = {
    id: "draft-123",
    content: "Draft content",
    status: "PENDING",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.relayDraft.findFirst).mockResolvedValue(
      mockDraft as never,
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // PATCH /api/orbit/[workspaceSlug]/relay/drafts/[draftId]
  // ============================================

  describe("PATCH", () => {
    const createRequest = (body: any) =>
      new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/drafts/draft-123",
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      );

    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const request = createRequest({ action: "approve" });
      const response = await PATCH(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });
      expect(response.status).toBe(401);
    });

    it("returns 404 when workspace not found", async () => {
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);
      const request = createRequest({ action: "approve" });
      const response = await PATCH(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });
      expect(response.status).toBe(404);
    });

    it("returns 400 for invalid action", async () => {
      const request = createRequest({ action: "invalid" });
      const response = await PATCH(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("action must be one of");
    });

    it("returns 400 when edit content is missing", async () => {
      const request = createRequest({ action: "edit" });
      const response = await PATCH(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("content is required");
    });

    it("returns 400 when reject reason is missing", async () => {
      const request = createRequest({ action: "reject" });
      const response = await PATCH(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("reason is required");
    });

    it("returns 400 when fail errorMessage is missing", async () => {
      const request = createRequest({ action: "fail" });
      const response = await PATCH(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("errorMessage is required");
    });

    it("returns 404 when draft not found", async () => {
      vi.mocked(prisma.relayDraft.findFirst).mockResolvedValue(null);
      const request = createRequest({ action: "approve" });
      const response = await PATCH(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });
      expect(response.status).toBe(404);
    });

    it("approves draft successfully", async () => {
      mockApprove.mockResolvedValue({
        success: true,
        draft: { ...mockDraft, status: "APPROVED" },
        auditLog: { id: "log-1" },
        message: "Approved",
      });

      const request = createRequest({ action: "approve", note: "Good job" });
      const response = await PATCH(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.draft.status).toBe("APPROVED");
      expect(mockApprove).toHaveBeenCalledWith(
        { draftId: "draft-123", note: "Good job" },
        "user-123",
        undefined,
        undefined,
      );
    });

    it("rejects draft successfully", async () => {
      mockReject.mockResolvedValue({
        success: true,
        draft: { ...mockDraft, status: "REJECTED" },
        auditLog: { id: "log-1" },
        message: "Rejected",
      });

      const request = createRequest({ action: "reject", reason: "Too long" });
      const response = await PATCH(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });

      expect(response.status).toBe(200);
      expect(mockReject).toHaveBeenCalledWith(
        { draftId: "draft-123", reason: "Too long" },
        "user-123",
        undefined,
        undefined,
      );
    });

    it("edits draft successfully", async () => {
      mockEdit.mockResolvedValue({
        success: true,
        draft: { ...mockDraft, content: "New content" },
        editHistory: { id: "hist-1" },
        editType: "CONTENT_REVISION",
        message: "Edited",
      });

      const request = createRequest({
        action: "edit",
        content: "New content",
        reason: "Fix typo",
      });
      const response = await PATCH(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });

      expect(response.status).toBe(200);
      expect(mockEdit).toHaveBeenCalledWith(
        { draftId: "draft-123", content: "New content", reason: "Fix typo" },
        "user-123",
        undefined,
        undefined,
      );
    });

    it("sends draft successfully", async () => {
      mockSend.mockResolvedValue({
        success: true,
        draft: { ...mockDraft, status: "SENT" },
        auditLog: { id: "log-1" },
        message: "Sent",
      });

      const request = createRequest({ action: "send" });
      const response = await PATCH(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });

      expect(response.status).toBe(200);
      expect(mockSend).toHaveBeenCalledWith(
        "draft-123",
        "user-123",
        undefined,
        undefined,
      );
    });

    it("fails draft successfully", async () => {
      mockFail.mockResolvedValue({
        success: false,
        draft: { ...mockDraft, status: "FAILED" },
        auditLog: { id: "log-1" },
        message: "Failed",
      });

      const request = createRequest({ action: "fail", errorMessage: "API Error" });
      const response = await PATCH(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(mockFail).toHaveBeenCalledWith(
        "draft-123",
        "API Error",
        "user-123",
        undefined,
        undefined,
      );
    });

    it("handles service errors gracefully", async () => {
      mockApprove.mockRejectedValue(new Error("Service error"));

      const request = createRequest({ action: "approve" });
      const response = await PATCH(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("Failed to approve draft");
    });
  });

  // ============================================
  // GET /api/orbit/[workspaceSlug]/relay/drafts/[draftId]
  // ============================================

  describe("GET", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/drafts/draft-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });
      expect(response.status).toBe(401);
    });

    it("returns basic draft details", async () => {
      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/drafts/draft-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.draft.id).toBe("draft-123");
    });

    it("returns draft with history when requested", async () => {
      mockGetHistory.mockResolvedValue({
        id: "draft-123",
        content: "Content",
        editHistory: [],
        auditLogs: [],
      });

      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/drafts/draft-123?includeHistory=true",
      );
      const response = await GET(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.editHistory).toBeDefined();
      expect(data.auditLogs).toBeDefined();
    });

    it("returns 404 when draft not found (basic)", async () => {
      vi.mocked(prisma.relayDraft.findFirst).mockResolvedValue(null);
      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/drafts/draft-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });
      expect(response.status).toBe(404);
    });

    it("returns 404 when draft not found (history)", async () => {
      mockGetHistory.mockResolvedValue(null);
      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/drafts/draft-123?includeHistory=true",
      );
      const response = await GET(request, {
        params: Promise.resolve({
          workspaceSlug: "test-workspace",
          draftId: "draft-123",
        }),
      });
      expect(response.status).toBe(404);
    });
  });
});
