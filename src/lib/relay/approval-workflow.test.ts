/**
 * Approval Workflow Service Tests
 *
 * Unit tests for draft editing, approval/rejection, and audit logging.
 * Resolves #569
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    relayDraft: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    draftEditHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    draftAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    inboxItem: {
      update: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import prisma from "@/lib/prisma";
import {
  _classifyEditType,
  _levenshteinDistance,
  approveDraftWorkflow,
  createAuditLog,
  editDraft,
  getApprovalSettings,
  getAuditLogs,
  getDraftWithHistory,
  getEditHistory,
  markDraftAsFailed,
  markDraftAsSent,
  rejectDraftWorkflow,
  updateApprovalSettings,
} from "./approval-workflow";
import { DEFAULT_APPROVAL_SETTINGS } from "./approval-workflow-types";

describe("approval-workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Levenshtein Distance Tests
  // ============================================

  describe("levenshteinDistance", () => {
    it("returns 0 for identical strings", () => {
      expect(_levenshteinDistance("hello", "hello")).toBe(0);
    });

    it("returns string length for empty comparison", () => {
      expect(_levenshteinDistance("hello", "")).toBe(5);
      expect(_levenshteinDistance("", "hello")).toBe(5);
    });

    it("calculates correct distance for substitutions", () => {
      expect(_levenshteinDistance("cat", "bat")).toBe(1);
      expect(_levenshteinDistance("cat", "car")).toBe(1);
    });

    it("calculates correct distance for insertions", () => {
      expect(_levenshteinDistance("cat", "cats")).toBe(1);
      expect(_levenshteinDistance("cat", "scat")).toBe(1);
    });

    it("calculates correct distance for deletions", () => {
      expect(_levenshteinDistance("cats", "cat")).toBe(1);
    });

    it("calculates correct distance for complex changes", () => {
      expect(_levenshteinDistance("kitten", "sitting")).toBe(3);
    });
  });

  // ============================================
  // Edit Type Classification Tests
  // ============================================

  describe("classifyEditType", () => {
    it("classifies minor tweaks correctly", () => {
      // Very long text with minimal change (less than 5% edit ratio)
      const original =
        "Thank you so much for your wonderful feedback about our product and service. We really appreciate it!";
      const edited =
        "Thank you so much for your wonderful feedback about our product and service. We really appreciate it.";
      const distance = _levenshteinDistance(original, edited);

      expect(_classifyEditType(original, edited, distance)).toBe("MINOR_TWEAK");
    });

    it("classifies complete rewrites correctly", () => {
      const original = "Hello world!";
      const edited = "Completely different text here now.";
      const distance = _levenshteinDistance(original, edited);

      expect(_classifyEditType(original, edited, distance)).toBe(
        "COMPLETE_REWRITE",
      );
    });

    it("classifies platform formatting changes correctly", () => {
      // Hashtags added - the algorithm checks for hashtag/mention count differences
      const original = "Check this out today!";
      const edited = "Check this out today! #awesome";
      const distance = _levenshteinDistance(original, edited);

      expect(_classifyEditType(original, edited, distance)).toBe(
        "PLATFORM_FORMATTING",
      );
    });

    it("classifies mention changes as platform formatting", () => {
      const original = "Thanks for the feedback!";
      const edited = "Thanks for the feedback! @user123";
      const distance = _levenshteinDistance(original, edited);

      expect(_classifyEditType(original, edited, distance)).toBe(
        "PLATFORM_FORMATTING",
      );
    });

    it("classifies tone adjustments correctly", () => {
      // Length diff < 20, edit ratio 5-30%
      const original = "We really appreciate your feedback today.";
      const edited = "We truly appreciate your feedback today!";
      const distance = _levenshteinDistance(original, edited);
      // Verify conditions: lengthDiff < 20 and editRatio < 0.3
      const lengthDiff = Math.abs(original.length - edited.length);
      const editRatio = distance / original.length;
      expect(lengthDiff).toBeLessThan(20);
      expect(editRatio).toBeLessThan(0.3);
      expect(editRatio).toBeGreaterThanOrEqual(0.05);

      expect(_classifyEditType(original, edited, distance)).toBe(
        "TONE_ADJUSTMENT",
      );
    });

    it("classifies content revisions correctly", () => {
      // More than 30% changed but less than 70% - use longer text
      const original =
        "Thank you so much for reaching out to our customer support team today about your concerns.";
      const edited =
        "Thanks for contacting us about your concerns. We are happy to assist you with this issue.";
      const distance = _levenshteinDistance(original, edited);
      // Verify we're in the content revision range
      const editRatio = distance / original.length;
      expect(editRatio).toBeLessThan(0.7);
      expect(editRatio).toBeGreaterThan(0.3);

      expect(_classifyEditType(original, edited, distance)).toBe(
        "CONTENT_REVISION",
      );
    });
  });

  // ============================================
  // Audit Log Tests
  // ============================================

  describe("createAuditLog", () => {
    it("creates an audit log entry", async () => {
      const mockAuditLog = {
        id: "audit-123",
        draftId: "draft-123",
        action: "APPROVED",
        details: { note: "Looks good" },
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        performedById: "user-123",
        createdAt: new Date(),
        performedBy: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
        },
      };

      vi.mocked(prisma.draftAuditLog.create).mockResolvedValue(
        mockAuditLog as never,
      );

      const result = await createAuditLog({
        draftId: "draft-123",
        action: "APPROVED",
        performedById: "user-123",
        details: { note: "Looks good" },
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
      });

      expect(result.id).toBe("audit-123");
      expect(result.action).toBe("APPROVED");
      expect(result.performedBy?.name).toBe("Test User");
    });
  });

  describe("getAuditLogs", () => {
    it("retrieves audit logs for a draft", async () => {
      const mockLogs = [
        {
          id: "audit-1",
          draftId: "draft-123",
          action: "CREATED",
          details: null,
          ipAddress: null,
          userAgent: null,
          performedById: "user-123",
          createdAt: new Date(),
          performedBy: {
            id: "user-123",
            name: "Test User",
            email: "test@example.com",
          },
        },
        {
          id: "audit-2",
          draftId: "draft-123",
          action: "APPROVED",
          details: null,
          ipAddress: null,
          userAgent: null,
          performedById: "user-456",
          createdAt: new Date(),
          performedBy: {
            id: "user-456",
            name: "Approver",
            email: "approver@example.com",
          },
        },
      ];

      vi.mocked(prisma.draftAuditLog.findMany).mockResolvedValue(
        mockLogs as never,
      );

      const result = await getAuditLogs("draft-123");

      expect(result).toHaveLength(2);
      expect(result[0]!.action).toBe("CREATED");
      expect(result[1]!.action).toBe("APPROVED");
    });
  });

  // ============================================
  // Edit Draft Tests
  // ============================================

  describe("editDraft", () => {
    const mockDraft = {
      id: "draft-123",
      content: "Original content here.",
      confidenceScore: 0.85,
      status: "PENDING",
      isPreferred: true,
      reason: "Balanced response",
      metadata: null,
      sentAt: null,
      errorMessage: null,
      inboxItemId: "inbox-123",
      reviewedById: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("edits a draft and creates edit history", async () => {
      vi.mocked(prisma.relayDraft.findUnique).mockResolvedValue(
        mockDraft as never,
      );

      const updatedDraft = { ...mockDraft, content: "Edited content here!" };
      const editHistory = {
        id: "edit-123",
        draftId: "draft-123",
        originalContent: "Original content here.",
        editedContent: "Edited content here!",
        editType: "CONTENT_REVISION",
        changesSummary: null,
        editDistance: 7,
        editedById: "user-123",
        createdAt: new Date(),
      };
      const auditLog = {
        id: "audit-123",
        draftId: "draft-123",
        action: "EDITED",
        details: { editType: "CONTENT_REVISION" },
        ipAddress: null,
        userAgent: null,
        performedById: "user-123",
        createdAt: new Date(),
      };

      vi.mocked(prisma.$transaction).mockResolvedValue([
        updatedDraft,
        editHistory,
        auditLog,
      ] as never);

      const result = await editDraft(
        {
          draftId: "draft-123",
          content: "Edited content here!",
        },
        "user-123",
      );

      expect(result.draft.content).toBe("Edited content here!");
      expect(result.editHistory.originalContent).toBe("Original content here.");
      expect(result.editHistory.editedContent).toBe("Edited content here!");
    });

    it("throws error if draft not found", async () => {
      vi.mocked(prisma.relayDraft.findUnique).mockResolvedValue(null);

      await expect(
        editDraft(
          {
            draftId: "nonexistent",
            content: "New content",
          },
          "user-123",
        ),
      ).rejects.toThrow("Draft not found");
    });

    it("throws error if draft is not pending", async () => {
      vi.mocked(prisma.relayDraft.findUnique).mockResolvedValue({
        ...mockDraft,
        status: "APPROVED",
      } as never);

      await expect(
        editDraft(
          {
            draftId: "draft-123",
            content: "New content",
          },
          "user-123",
        ),
      ).rejects.toThrow("Cannot edit draft with status APPROVED");
    });
  });

  describe("getEditHistory", () => {
    it("retrieves edit history for a draft", async () => {
      const mockHistory = [
        {
          id: "edit-1",
          draftId: "draft-123",
          originalContent: "Original",
          editedContent: "Edited once",
          editType: "MINOR_TWEAK",
          changesSummary: null,
          editDistance: 5,
          editedById: "user-123",
          createdAt: new Date(),
        },
        {
          id: "edit-2",
          draftId: "draft-123",
          originalContent: "Edited once",
          editedContent: "Edited twice",
          editType: "TONE_ADJUSTMENT",
          changesSummary: null,
          editDistance: 10,
          editedById: "user-456",
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.draftEditHistory.findMany).mockResolvedValue(
        mockHistory as never,
      );

      const result = await getEditHistory("draft-123");

      expect(result).toHaveLength(2);
      expect(result[0]!.editType).toBe("MINOR_TWEAK");
      expect(result[1]!.editType).toBe("TONE_ADJUSTMENT");
    });
  });

  // ============================================
  // Workflow Action Tests
  // ============================================

  describe("approveDraftWorkflow", () => {
    const mockDraft = {
      id: "draft-123",
      content: "Draft content",
      confidenceScore: 0.9,
      status: "PENDING",
      isPreferred: true,
      reason: null,
      metadata: null,
      sentAt: null,
      errorMessage: null,
      inboxItemId: "inbox-123",
      reviewedById: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("approves a pending draft", async () => {
      vi.mocked(prisma.relayDraft.findUnique).mockResolvedValue(
        mockDraft as never,
      );

      const approvedDraft = {
        ...mockDraft,
        status: "APPROVED",
        reviewedById: "user-123",
        reviewedAt: new Date(),
      };
      const auditLog = {
        id: "audit-123",
        draftId: "draft-123",
        action: "APPROVED",
        details: null,
        ipAddress: null,
        userAgent: null,
        performedById: "user-123",
        createdAt: new Date(),
        performedBy: {
          id: "user-123",
          name: "Approver",
          email: "approver@example.com",
        },
      };

      vi.mocked(prisma.$transaction).mockResolvedValue(
        [approvedDraft, auditLog] as never,
      );

      const result = await approveDraftWorkflow(
        { draftId: "draft-123" },
        "user-123",
      );

      expect(result.success).toBe(true);
      expect(result.draft.status).toBe("APPROVED");
      expect(result.message).toBe("Draft approved successfully");
    });

    it("throws error if draft not found", async () => {
      vi.mocked(prisma.relayDraft.findUnique).mockResolvedValue(null);

      await expect(
        approveDraftWorkflow({ draftId: "nonexistent" }, "user-123"),
      ).rejects.toThrow("Draft not found");
    });

    it("throws error if draft is not pending", async () => {
      vi.mocked(prisma.relayDraft.findUnique).mockResolvedValue({
        ...mockDraft,
        status: "REJECTED",
      } as never);

      await expect(
        approveDraftWorkflow({ draftId: "draft-123" }, "user-123"),
      ).rejects.toThrow("Cannot approve draft with status REJECTED");
    });
  });

  describe("rejectDraftWorkflow", () => {
    const mockDraft = {
      id: "draft-123",
      content: "Draft content",
      confidenceScore: 0.9,
      status: "PENDING",
      isPreferred: true,
      reason: null,
      metadata: null,
      sentAt: null,
      errorMessage: null,
      inboxItemId: "inbox-123",
      reviewedById: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("rejects a pending draft with reason", async () => {
      vi.mocked(prisma.relayDraft.findUnique).mockResolvedValue(
        mockDraft as never,
      );

      const rejectedDraft = {
        ...mockDraft,
        status: "REJECTED",
        reviewedById: "user-123",
        reviewedAt: new Date(),
      };
      const auditLog = {
        id: "audit-123",
        draftId: "draft-123",
        action: "REJECTED",
        details: { reason: "Tone is too casual" },
        ipAddress: null,
        userAgent: null,
        performedById: "user-123",
        createdAt: new Date(),
        performedBy: {
          id: "user-123",
          name: "Reviewer",
          email: "reviewer@example.com",
        },
      };

      vi.mocked(prisma.$transaction).mockResolvedValue(
        [rejectedDraft, auditLog] as never,
      );

      const result = await rejectDraftWorkflow(
        { draftId: "draft-123", reason: "Tone is too casual" },
        "user-123",
      );

      expect(result.success).toBe(true);
      expect(result.draft.status).toBe("REJECTED");
      expect(result.message).toBe("Draft rejected");
    });
  });

  describe("markDraftAsSent", () => {
    const mockDraft = {
      id: "draft-123",
      content: "Draft content",
      confidenceScore: 0.9,
      status: "APPROVED",
      isPreferred: true,
      reason: null,
      metadata: null,
      sentAt: null,
      errorMessage: null,
      inboxItemId: "inbox-123",
      reviewedById: "user-456",
      reviewedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      inboxItem: {
        id: "inbox-123",
      },
    };

    it("marks an approved draft as sent", async () => {
      vi.mocked(prisma.relayDraft.findUnique).mockResolvedValue(
        mockDraft as never,
      );

      const sentDraft = {
        ...mockDraft,
        status: "SENT",
        sentAt: new Date(),
      };
      const updatedInboxItem = { id: "inbox-123", status: "REPLIED" };
      const auditLog = {
        id: "audit-123",
        draftId: "draft-123",
        action: "SENT",
        details: null,
        ipAddress: null,
        userAgent: null,
        performedById: "user-123",
        createdAt: new Date(),
        performedBy: {
          id: "user-123",
          name: "Sender",
          email: "sender@example.com",
        },
      };

      vi.mocked(prisma.$transaction).mockResolvedValue([
        sentDraft,
        updatedInboxItem,
        auditLog,
      ] as never);

      const result = await markDraftAsSent("draft-123", "user-123");

      expect(result.success).toBe(true);
      expect(result.draft.status).toBe("SENT");
      expect(result.message).toBe("Draft sent successfully");
    });

    it("throws error if draft is not approved", async () => {
      vi.mocked(prisma.relayDraft.findUnique).mockResolvedValue({
        ...mockDraft,
        status: "PENDING",
      } as never);

      await expect(markDraftAsSent("draft-123", "user-123")).rejects.toThrow(
        "Cannot send draft with status PENDING",
      );
    });
  });

  describe("markDraftAsFailed", () => {
    const mockDraft = {
      id: "draft-123",
      content: "Draft content",
      confidenceScore: 0.9,
      status: "APPROVED",
      isPreferred: true,
      reason: null,
      metadata: null,
      sentAt: null,
      errorMessage: null,
      inboxItemId: "inbox-123",
      reviewedById: "user-456",
      reviewedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("marks a draft as failed with error message", async () => {
      vi.mocked(prisma.relayDraft.findUnique).mockResolvedValue(
        mockDraft as never,
      );

      const failedDraft = {
        ...mockDraft,
        status: "FAILED",
        errorMessage: "API rate limit exceeded",
      };
      const auditLog = {
        id: "audit-123",
        draftId: "draft-123",
        action: "SEND_FAILED",
        details: { errorMessage: "API rate limit exceeded" },
        ipAddress: null,
        userAgent: null,
        performedById: "user-123",
        createdAt: new Date(),
        performedBy: {
          id: "user-123",
          name: "System",
          email: "system@example.com",
        },
      };

      vi.mocked(prisma.$transaction).mockResolvedValue(
        [failedDraft, auditLog] as never,
      );

      const result = await markDraftAsFailed(
        "draft-123",
        "API rate limit exceeded",
        "user-123",
      );

      expect(result.success).toBe(false);
      expect(result.draft.status).toBe("FAILED");
      expect(result.draft.errorMessage).toBe("API rate limit exceeded");
    });
  });

  // ============================================
  // Approval Settings Tests
  // ============================================

  describe("getApprovalSettings", () => {
    it("returns default settings when no settings exist", () => {
      const result = getApprovalSettings(null);

      expect(result).toEqual(DEFAULT_APPROVAL_SETTINGS);
    });

    it("returns default settings when relay settings missing", () => {
      const result = getApprovalSettings({ someOtherSetting: true });

      expect(result).toEqual(DEFAULT_APPROVAL_SETTINGS);
    });

    it("merges partial settings with defaults", () => {
      const result = getApprovalSettings({
        relay: {
          requireApproval: false,
          autoApproveThreshold: 0.9,
        },
      });

      expect(result.requireApproval).toBe(false);
      expect(result.autoApproveThreshold).toBe(0.9);
      expect(result.approverRoles).toEqual(
        DEFAULT_APPROVAL_SETTINGS.approverRoles,
      );
      expect(result.notifyApprovers).toBe(
        DEFAULT_APPROVAL_SETTINGS.notifyApprovers,
      );
    });
  });

  describe("updateApprovalSettings", () => {
    it("updates approval settings for a workspace", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "workspace-123",
        settings: {
          relay: {
            requireApproval: true,
            autoApproveHighConfidence: false,
          },
        },
      } as never);

      vi.mocked(prisma.workspace.update).mockResolvedValue({
        id: "workspace-123",
        settings: {
          relay: {
            requireApproval: false,
            autoApproveHighConfidence: true,
          },
        },
      } as never);

      const result = await updateApprovalSettings("workspace-123", {
        requireApproval: false,
        autoApproveHighConfidence: true,
      });

      expect(result.requireApproval).toBe(false);
      expect(result.autoApproveHighConfidence).toBe(true);
    });

    it("throws error if workspace not found", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

      await expect(
        updateApprovalSettings("nonexistent", { requireApproval: false }),
      ).rejects.toThrow("Workspace not found");
    });
  });

  // ============================================
  // Draft with History Tests
  // ============================================

  describe("getDraftWithHistory", () => {
    it("returns draft with full history", async () => {
      const mockDraftWithHistory = {
        id: "draft-123",
        content: "Draft content",
        confidenceScore: 0.9,
        status: "PENDING",
        isPreferred: true,
        reason: null,
        metadata: null,
        sentAt: null,
        errorMessage: null,
        inboxItemId: "inbox-123",
        reviewedById: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        editHistory: [
          {
            id: "edit-1",
            draftId: "draft-123",
            originalContent: "Original",
            editedContent: "Edited",
            editType: "MINOR_TWEAK",
            changesSummary: null,
            editDistance: 5,
            editedById: "user-123",
            createdAt: new Date(),
          },
        ],
        auditLogs: [
          {
            id: "audit-1",
            draftId: "draft-123",
            action: "CREATED",
            details: null,
            ipAddress: null,
            userAgent: null,
            performedById: "user-123",
            createdAt: new Date(),
            performedBy: {
              id: "user-123",
              name: "Creator",
              email: "creator@example.com",
            },
          },
        ],
        reviewedBy: null,
      };

      vi.mocked(prisma.relayDraft.findUnique).mockResolvedValue(
        mockDraftWithHistory as never,
      );

      const result = await getDraftWithHistory("draft-123");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("draft-123");
      expect(result!.editHistory).toHaveLength(1);
      expect(result!.auditLogs).toHaveLength(1);
    });

    it("returns null if draft not found", async () => {
      vi.mocked(prisma.relayDraft.findUnique).mockResolvedValue(null);

      const result = await getDraftWithHistory("nonexistent");

      expect(result).toBeNull();
    });
  });
});
