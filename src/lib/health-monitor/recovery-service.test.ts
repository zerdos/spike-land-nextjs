/**
 * Recovery Service Tests
 *
 * Tests for recovery guidance functions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";

import {
  getAllRecoveryGuidance,
  getRecoveryGuidance,
  getUnresolvedIssues,
  markIssueResolved,
  upsertRecoveryGuidance,
} from "./recovery-service";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    recoveryGuidance: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    accountHealthEvent: {
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("Recovery Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRecoveryGuidance", () => {
    it("returns platform-specific guidance when available", async () => {
      const mockGuidance = {
        id: "guidance-1",
        platform: "TWITTER",
        issueType: "TOKEN_EXPIRED",
        severity: "ERROR",
        title: "Twitter Token Expired",
        description: "Your Twitter token has expired.",
        steps: [{ order: 1, title: "Step 1", description: "Do this" }],
        estimatedTime: "5 minutes",
        requiresAction: true,
        autoRecoverable: false,
      };

      vi.mocked(prisma.recoveryGuidance.findFirst).mockResolvedValue(
        mockGuidance as never,
      );

      const result = await getRecoveryGuidance("TOKEN_EXPIRED", "TWITTER");

      expect(prisma.recoveryGuidance.findFirst).toHaveBeenCalledWith({
        where: {
          issueType: "TOKEN_EXPIRED",
          platform: "TWITTER",
        },
      });
      expect(result).toEqual({
        id: "guidance-1",
        issueType: "TOKEN_EXPIRED",
        severity: "ERROR",
        title: "Twitter Token Expired",
        description: "Your Twitter token has expired.",
        steps: [{ order: 1, title: "Step 1", description: "Do this" }],
        estimatedTime: "5 minutes",
        requiresAction: true,
        autoRecoverable: false,
      });
    });

    it("falls back to generic guidance when platform-specific not found", async () => {
      const mockGenericGuidance = {
        id: "guidance-generic",
        platform: null,
        issueType: "TOKEN_EXPIRED",
        severity: "ERROR",
        title: "Token Expired",
        description: "Your token has expired.",
        steps: [{ order: 1, title: "Step 1", description: "Reconnect" }],
        estimatedTime: "5 minutes",
        requiresAction: true,
        autoRecoverable: false,
      };

      vi.mocked(prisma.recoveryGuidance.findFirst)
        .mockResolvedValueOnce(null) // Platform-specific not found
        .mockResolvedValueOnce(mockGenericGuidance as never); // Generic found

      const result = await getRecoveryGuidance("TOKEN_EXPIRED", "TWITTER");

      expect(prisma.recoveryGuidance.findFirst).toHaveBeenCalledTimes(2);
      expect(result?.title).toBe("Token Expired");
    });

    it("returns null when no guidance found", async () => {
      vi.mocked(prisma.recoveryGuidance.findFirst).mockResolvedValue(null);

      const result = await getRecoveryGuidance("TOKEN_EXPIRED");

      expect(result).toBeNull();
    });
  });

  describe("getAllRecoveryGuidance", () => {
    it("returns all guidance templates", async () => {
      const mockGuidanceList = [
        {
          id: "guidance-1",
          platform: null,
          issueType: "TOKEN_EXPIRED",
          severity: "ERROR",
          title: "Token Expired",
          description: "Token expired",
          steps: [],
          estimatedTime: "5 min",
          requiresAction: true,
          autoRecoverable: false,
        },
        {
          id: "guidance-2",
          platform: null,
          issueType: "RATE_LIMITED",
          severity: "WARNING",
          title: "Rate Limited",
          description: "Rate limited",
          steps: [],
          estimatedTime: "15 min",
          requiresAction: false,
          autoRecoverable: true,
        },
      ];

      vi.mocked(prisma.recoveryGuidance.findMany).mockResolvedValue(
        mockGuidanceList as never,
      );

      const result = await getAllRecoveryGuidance();

      expect(result).toHaveLength(2);
      expect(prisma.recoveryGuidance.findMany).toHaveBeenCalledWith({
        orderBy: [{ severity: "desc" }, { issueType: "asc" }],
      });
    });
  });

  describe("upsertRecoveryGuidance", () => {
    it("creates new guidance when not exists", async () => {
      const newGuidance = {
        platform: null,
        issueType: "API_ERROR" as const,
        severity: "ERROR" as const,
        title: "API Error",
        description: "An API error occurred.",
        steps: [{ order: 1, title: "Wait", description: "Wait and retry" }],
        estimatedTime: "10 minutes",
        requiresAction: false,
        autoRecoverable: true,
      };

      // Mock no existing guidance
      vi.mocked(prisma.recoveryGuidance.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.recoveryGuidance.create).mockResolvedValue({
        id: "new-guidance",
        ...newGuidance,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await upsertRecoveryGuidance(newGuidance);

      expect(prisma.recoveryGuidance.findFirst).toHaveBeenCalledWith({
        where: {
          platform: null,
          issueType: "API_ERROR",
        },
      });
      expect(prisma.recoveryGuidance.create).toHaveBeenCalled();
      expect(result.title).toBe("API Error");
    });

    it("updates existing guidance", async () => {
      const updateData = {
        platform: "TWITTER" as const,
        issueType: "TOKEN_EXPIRED" as const,
        severity: "CRITICAL" as const,
        title: "Updated Title",
        description: "Updated description",
        steps: [],
      };

      // Mock existing guidance found
      vi.mocked(prisma.recoveryGuidance.findFirst).mockResolvedValue({
        id: "existing-guidance",
        platform: "TWITTER",
        issueType: "TOKEN_EXPIRED",
        severity: "ERROR",
        title: "Old Title",
        description: "Old description",
        steps: [],
        estimatedTime: null,
        requiresAction: true,
        autoRecoverable: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      vi.mocked(prisma.recoveryGuidance.update).mockResolvedValue({
        id: "existing-guidance",
        ...updateData,
        estimatedTime: null,
        requiresAction: true,
        autoRecoverable: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await upsertRecoveryGuidance(updateData);

      expect(prisma.recoveryGuidance.update).toHaveBeenCalled();
      expect(result.title).toBe("Updated Title");
      expect(result.severity).toBe("CRITICAL");
    });
  });

  describe("markIssueResolved", () => {
    it("marks event as resolved with user and notes", async () => {
      vi.mocked(prisma.accountHealthEvent.update).mockResolvedValue({
        id: "event-1",
        resolvedAt: new Date(),
        resolvedById: "user-1",
        resolutionNotes: "Fixed manually",
      } as never);

      await markIssueResolved("event-1", "user-1", "Fixed manually");

      expect(prisma.accountHealthEvent.update).toHaveBeenCalledWith({
        where: { id: "event-1" },
        data: {
          resolvedAt: expect.any(Date),
          resolvedById: "user-1",
          resolutionNotes: "Fixed manually",
        },
      });
    });

    it("marks event as resolved without notes", async () => {
      vi.mocked(prisma.accountHealthEvent.update).mockResolvedValue({
        id: "event-1",
        resolvedAt: new Date(),
        resolvedById: "user-1",
        resolutionNotes: undefined,
      } as never);

      await markIssueResolved("event-1", "user-1");

      expect(prisma.accountHealthEvent.update).toHaveBeenCalledWith({
        where: { id: "event-1" },
        data: {
          resolvedAt: expect.any(Date),
          resolvedById: "user-1",
          resolutionNotes: undefined,
        },
      });
    });
  });

  describe("getUnresolvedIssues", () => {
    it("returns unresolved issues for account", async () => {
      const mockEvents = [
        {
          id: "event-1",
          eventType: "ERROR_OCCURRED",
          severity: "ERROR",
          message: "Connection failed",
          createdAt: new Date(),
        },
        {
          id: "event-2",
          eventType: "TOKEN_EXPIRED",
          severity: "CRITICAL",
          message: "Token expired",
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.accountHealthEvent.findMany).mockResolvedValue(
        mockEvents as never,
      );

      const result = await getUnresolvedIssues("account-1");

      expect(prisma.accountHealthEvent.findMany).toHaveBeenCalledWith({
        where: {
          accountId: "account-1",
          resolvedAt: null,
          eventType: {
            in: [
              "ERROR_OCCURRED",
              "TOKEN_EXPIRED",
              "RATE_LIMIT_HIT",
              "STATUS_CHANGED",
            ],
          },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toHaveLength(2);
      expect(result[0]!.eventType).toBe("ERROR_OCCURRED");
    });

    it("returns empty array when no unresolved issues", async () => {
      vi.mocked(prisma.accountHealthEvent.findMany).mockResolvedValue([]);

      const result = await getUnresolvedIssues("account-1");

      expect(result).toHaveLength(0);
    });
  });
});
