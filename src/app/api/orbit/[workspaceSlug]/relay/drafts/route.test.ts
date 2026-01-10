/**
 * Relay Draft API Route Tests
 *
 * Unit tests for the draft generation API endpoints.
 * Resolves #555
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
    inboxItem: {
      findFirst: vi.fn(),
    },
    relayDraft: {
      findMany: vi.fn(),
    },
  },
}));

// Mock relay functions
vi.mock("@/lib/relay", () => ({
  generateDrafts: vi.fn(),
  saveDraftsToDatabase: vi.fn(),
}));

// Import after mocks
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateDrafts, saveDraftsToDatabase } from "@/lib/relay";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockGenerateDrafts = generateDrafts as ReturnType<typeof vi.fn>;
const mockSaveDraftsToDatabase = saveDraftsToDatabase as ReturnType<
  typeof vi.fn
>;

describe("Relay Drafts API", () => {
  const mockSession = {
    user: { id: "user-123", email: "test@example.com" },
  };

  const mockWorkspace = {
    id: "workspace-123",
    name: "Test Workspace",
  };

  const mockInboxItem = {
    id: "inbox-123",
    type: "COMMENT",
    status: "UNREAD",
    platform: "TWITTER",
    platformItemId: "tweet-456",
    content: "Great product!",
    senderName: "John Doe",
    senderHandle: "johndoe",
    senderAvatarUrl: null,
    originalPostId: null,
    originalPostContent: null,
    metadata: null,
    receivedAt: new Date(),
    readAt: null,
    repliedAt: null,
    workspaceId: "workspace-123",
    accountId: "account-123",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDraftsResponse = {
    drafts: [
      {
        content: "Thank you for your feedback!",
        confidenceScore: 0.9,
        isPreferred: true,
        reason: "Balanced response",
        metadata: {
          toneMatch: { alignment: 85 },
          withinCharacterLimit: true,
          characterCount: 30,
          platformLimit: 280,
        },
      },
    ],
    inboxItemId: "inbox-123",
    hasBrandProfile: true,
    messageAnalysis: {
      sentiment: "positive",
      intent: "praise",
      topics: ["product"],
      urgency: "low",
      hasQuestion: false,
      hasComplaint: false,
      needsEscalation: false,
    },
    generatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // POST /api/orbit/[workspaceSlug]/relay/drafts
  // ============================================

  describe("POST", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/drafts",
        {
          method: "POST",
          body: JSON.stringify({ inboxItemId: "inbox-123" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 when workspace not found", async () => {
      mockAuth.mockResolvedValue(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/drafts",
        {
          method: "POST",
          body: JSON.stringify({ inboxItemId: "inbox-123" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Workspace not found or access denied");
    });

    it("returns 400 for invalid request body", async () => {
      mockAuth.mockResolvedValue(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(
        mockWorkspace as never,
      );

      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/drafts",
        {
          method: "POST",
          body: JSON.stringify({}), // Missing inboxItemId
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Validation error");
    });

    it("returns 404 when inbox item not found", async () => {
      mockAuth.mockResolvedValue(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(
        mockWorkspace as never,
      );
      vi.mocked(prisma.inboxItem.findFirst).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/drafts",
        {
          method: "POST",
          body: JSON.stringify({ inboxItemId: "inbox-123" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Inbox item not found");
    });

    it("generates drafts successfully", async () => {
      mockAuth.mockResolvedValue(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(
        mockWorkspace as never,
      );
      vi.mocked(prisma.inboxItem.findFirst).mockResolvedValue(
        mockInboxItem as never,
      );
      mockGenerateDrafts.mockResolvedValue(mockDraftsResponse);
      mockSaveDraftsToDatabase.mockResolvedValue({ count: 1 });

      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/drafts",
        {
          method: "POST",
          body: JSON.stringify({ inboxItemId: "inbox-123", numDrafts: 3 }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.drafts).toHaveLength(1);
      expect(data.saved).toBe(true);
      expect(data.inboxItemId).toBe("inbox-123");
    });

    it("returns drafts with warning when save fails", async () => {
      mockAuth.mockResolvedValue(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(
        mockWorkspace as never,
      );
      vi.mocked(prisma.inboxItem.findFirst).mockResolvedValue(
        mockInboxItem as never,
      );
      mockGenerateDrafts.mockResolvedValue(mockDraftsResponse);
      mockSaveDraftsToDatabase.mockRejectedValue(new Error("DB Error"));

      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/drafts",
        {
          method: "POST",
          body: JSON.stringify({ inboxItemId: "inbox-123" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.saved).toBe(false);
      expect(data.warning).toContain("failed to save");
    });

    it("returns 500 when draft generation fails", async () => {
      mockAuth.mockResolvedValue(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(
        mockWorkspace as never,
      );
      vi.mocked(prisma.inboxItem.findFirst).mockResolvedValue(
        mockInboxItem as never,
      );
      mockGenerateDrafts.mockRejectedValue(new Error("AI Error"));

      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/drafts",
        {
          method: "POST",
          body: JSON.stringify({ inboxItemId: "inbox-123" }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to generate drafts");
    });
  });

  // ============================================
  // GET /api/orbit/[workspaceSlug]/relay/drafts
  // ============================================

  describe("GET", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/drafts?inboxItemId=inbox-123",
      );

      const response = await GET(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 400 when inboxItemId missing", async () => {
      mockAuth.mockResolvedValue(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(
        mockWorkspace as never,
      );

      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/drafts",
      );

      const response = await GET(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("inboxItemId is required");
    });

    it("returns drafts successfully", async () => {
      mockAuth.mockResolvedValue(mockSession);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(
        mockWorkspace as never,
      );
      vi.mocked(prisma.inboxItem.findFirst).mockResolvedValue(
        { id: "inbox-123" } as never,
      );
      vi.mocked(prisma.relayDraft.findMany).mockResolvedValue([
        {
          id: "draft-1",
          content: "Thank you!",
          confidenceScore: 0.9,
          isPreferred: true,
        },
      ] as never);

      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/drafts?inboxItemId=inbox-123",
      );

      const response = await GET(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.drafts).toHaveLength(1);
      expect(data.drafts[0].content).toBe("Thank you!");
    });
  });
});
