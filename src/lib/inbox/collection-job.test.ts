/**
 * Collection Job Tests
 *
 * Tests for the collection job orchestrator.
 */

import type { SocialAccount, Workspace } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccount: {
      findMany: vi.fn(),
    },
    inboxItem: {
      findUnique: vi.fn(),
    },
    workspace: {
      findMany: vi.fn(),
    },
  },
}));

// Mock inbox-manager
vi.mock("./inbox-manager", () => ({
  upsertInboxItem: vi.fn(),
}));

// Import after mocks
import prisma from "@/lib/prisma";

import {
  collectFromAccount,
  getCollector,
  getWorkspaceAccounts,
  runGlobalCollectionJob,
  runWorkspaceCollectionJob,
  summarizeCollectionResults,
} from "./collection-job";
import type { CollectableAccount, CollectionJobResult } from "./collector-types";

describe("Collection Job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCollector", () => {
    it("should return Twitter collector", () => {
      const collector = getCollector("TWITTER");
      expect(collector).toBeDefined();
      expect(collector?.platform).toBe("TWITTER");
    });

    it("should return Facebook collector", () => {
      const collector = getCollector("FACEBOOK");
      expect(collector).toBeDefined();
      expect(collector?.platform).toBe("FACEBOOK");
    });

    it("should return Instagram collector", () => {
      const collector = getCollector("INSTAGRAM");
      expect(collector).toBeDefined();
      expect(collector?.platform).toBe("INSTAGRAM");
    });

    it("should return undefined for unsupported platform", () => {
      const collector = getCollector("LINKEDIN" as "TWITTER");
      expect(collector).toBeUndefined();
    });
  });

  describe("getWorkspaceAccounts", () => {
    it("should fetch active accounts with access tokens", async () => {
      const tokenExpiresAt = new Date();
      const mockAccounts = [
        {
          id: "acc-1",
          workspaceId: "ws-1",
          platform: "TWITTER" as const,
          accountId: "twitter-123",
          accessTokenEncrypted: "encrypted-token-1",
          refreshTokenEncrypted: "encrypted-refresh-1",
          tokenExpiresAt,
        },
        {
          id: "acc-2",
          workspaceId: "ws-1",
          platform: "FACEBOOK" as const,
          accountId: "fb-456",
          accessTokenEncrypted: "encrypted-token-2",
          refreshTokenEncrypted: null,
          tokenExpiresAt: null,
        },
      ] as unknown as SocialAccount[];

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue(mockAccounts);

      const accounts = await getWorkspaceAccounts("ws-1");

      expect(accounts).toHaveLength(2);
      expect(accounts[0]).toEqual({
        id: "acc-1",
        workspaceId: "ws-1",
        platform: "TWITTER",
        platformAccountId: "twitter-123",
        accessToken: "encrypted-token-1",
        refreshToken: "encrypted-refresh-1",
        tokenExpiresAt,
      });
      expect(accounts[1]?.refreshToken).toBeUndefined();
    });

    it("should filter out accounts without access tokens", async () => {
      const mockAccounts = [
        {
          id: "acc-1",
          workspaceId: "ws-1",
          platform: "TWITTER" as const,
          accountId: "twitter-123",
          accessTokenEncrypted: "",
          refreshTokenEncrypted: null,
          tokenExpiresAt: null,
        },
      ] as unknown as SocialAccount[];

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue(mockAccounts);

      const accounts = await getWorkspaceAccounts("ws-1");

      expect(accounts).toHaveLength(0);
    });
  });

  describe("collectFromAccount", () => {
    const mockAccount: CollectableAccount = {
      id: "acc-1",
      workspaceId: "ws-1",
      platform: "TWITTER",
      platformAccountId: "twitter-123",
      accessToken: "valid-token",
    };

    it("should return failed status when no collector available", async () => {
      const invalidAccount: CollectableAccount = {
        ...mockAccount,
        platform: "LINKEDIN" as "TWITTER",
      };

      const result = await collectFromAccount(invalidAccount);

      expect(result.status).toBe("FAILED");
      expect(result.error).toContain("No collector available");
    });
  });

  describe("summarizeCollectionResults", () => {
    it("should summarize collection results", () => {
      const results: CollectionJobResult[] = [
        {
          status: "COMPLETED",
          platform: "TWITTER",
          accountId: "acc-1",
          messagesCollected: 10,
          newMessages: 8,
          duplicatesSkipped: 2,
          startedAt: new Date(),
          completedAt: new Date(),
        },
        {
          status: "FAILED",
          platform: "FACEBOOK",
          accountId: "acc-2",
          messagesCollected: 0,
          newMessages: 0,
          duplicatesSkipped: 0,
          error: "Token expired",
          startedAt: new Date(),
          completedAt: new Date(),
        },
        {
          status: "RATE_LIMITED",
          platform: "INSTAGRAM",
          accountId: "acc-3",
          messagesCollected: 5,
          newMessages: 5,
          duplicatesSkipped: 0,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      ];

      const summary = summarizeCollectionResults("ws-1", results);

      expect(summary.workspaceId).toBe("ws-1");
      expect(summary.totalAccounts).toBe(3);
      expect(summary.successfulCollections).toBe(1);
      expect(summary.failedCollections).toBe(1);
      expect(summary.rateLimitedCollections).toBe(1);
      expect(summary.totalMessagesCollected).toBe(15);
      expect(summary.totalNewMessages).toBe(13);
      expect(summary.totalDuplicatesSkipped).toBe(2);
    });

    it("should handle empty results", () => {
      const summary = summarizeCollectionResults("ws-1", []);

      expect(summary.totalAccounts).toBe(0);
      expect(summary.successfulCollections).toBe(0);
      expect(summary.failedCollections).toBe(0);
      expect(summary.totalMessagesCollected).toBe(0);
    });
  });

  describe("runWorkspaceCollectionJob", () => {
    it("should return empty results when no accounts", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

      const results = await runWorkspaceCollectionJob("ws-1");

      expect(results).toHaveLength(0);
    });
  });

  describe("runGlobalCollectionJob", () => {
    it("should return empty map when no workspaces have active accounts", async () => {
      vi.mocked(prisma.workspace.findMany).mockResolvedValue([]);

      const results = await runGlobalCollectionJob();

      expect(results.size).toBe(0);
    });

    it("should collect from all workspaces", async () => {
      vi.mocked(prisma.workspace.findMany).mockResolvedValue([
        { id: "ws-1" },
        { id: "ws-2" },
      ] as unknown as Workspace[]);
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

      const results = await runGlobalCollectionJob();

      expect(results.size).toBe(2);
      expect(results.has("ws-1")).toBe(true);
      expect(results.has("ws-2")).toBe(true);
    });
  });
});
