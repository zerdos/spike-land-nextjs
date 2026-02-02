/**
 * Collection Job Tests
 *
 * Tests for the collection job orchestrator.
 */

import type { SocialAccount, Workspace } from "@prisma/client";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";

// Hoist mock instance so it's available in vi.mock
const { mockCollectorInstance } = vi.hoisted(() => {
  return {
    mockCollectorInstance: {
      canCollect: vi.fn(),
      collectMentions: vi.fn(),
      collectDirectMessages: vi.fn(),
      collectComments: vi.fn(),
      getRateLimitStatus: vi.fn(),
    },
  };
});

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


// Use standard functions for mock implementations to support 'new' keyword
vi.mock("./collectors/twitter-collector", () => ({
  TwitterCollector: class {
    platform = "TWITTER";
    canCollect = mockCollectorInstance.canCollect;
    collectMentions = mockCollectorInstance.collectMentions;
    collectDirectMessages = mockCollectorInstance.collectDirectMessages;
    collectComments = mockCollectorInstance.collectComments;
    getRateLimitStatus = mockCollectorInstance.getRateLimitStatus;
  },
}));

vi.mock("./collectors/facebook-collector", () => ({
  FacebookCollector: class {
    platform = "FACEBOOK";
    canCollect = mockCollectorInstance.canCollect;
    collectMentions = mockCollectorInstance.collectMentions;
    collectDirectMessages = mockCollectorInstance.collectDirectMessages;
    collectComments = mockCollectorInstance.collectComments;
    getRateLimitStatus = mockCollectorInstance.getRateLimitStatus;
  },
}));

vi.mock("./collectors/instagram-collector", () => ({
  InstagramCollector: class {
    platform = "INSTAGRAM";
    canCollect = mockCollectorInstance.canCollect;
    collectMentions = mockCollectorInstance.collectMentions;
    collectDirectMessages = mockCollectorInstance.collectDirectMessages;
    collectComments = mockCollectorInstance.collectComments;
    getRateLimitStatus = mockCollectorInstance.getRateLimitStatus;
  },
}));

// Import after mocks
import prisma from "@/lib/prisma";
import { upsertInboxItem } from "./inbox-manager";

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

    // Default mock implementation
    mockCollectorInstance.canCollect.mockResolvedValue(true);
    mockCollectorInstance.collectMentions.mockResolvedValue({ messages: [] });
    mockCollectorInstance.collectDirectMessages.mockResolvedValue({ messages: [] });
    mockCollectorInstance.collectComments.mockResolvedValue({ messages: [] });
    mockCollectorInstance.getRateLimitStatus.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
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

    it("should return failed status when canCollect returns false", async () => {
        mockCollectorInstance.canCollect.mockResolvedValue(false);

        const result = await collectFromAccount(mockAccount);

        expect(result.status).toBe("FAILED");
        expect(result.error).toContain("invalid or expired token");
        expect(mockCollectorInstance.canCollect).toHaveBeenCalledWith(mockAccount.accessToken);
    });

    it("should successfully collect messages and upsert them", async () => {
        const mockMessages = [{
            platformItemId: "msg-1",
            type: "MENTION",
            content: "Hello",
            senderName: "User",
            receivedAt: new Date(),
            rawData: {}
        }];

        mockCollectorInstance.collectMentions.mockResolvedValue({
            platform: "TWITTER",
            messages: mockMessages
        });

        // Mock that the item does NOT exist yet
        vi.mocked(prisma.inboxItem.findUnique).mockResolvedValue(null);

        const result = await collectFromAccount(mockAccount);

        expect(result.status).toBe("COMPLETED");
        expect(result.messagesCollected).toBe(1);
        expect(result.newMessages).toBe(1);
        expect(upsertInboxItem).toHaveBeenCalled();
        expect(mockCollectorInstance.collectMentions).toHaveBeenCalled();
        expect(mockCollectorInstance.collectDirectMessages).toHaveBeenCalled();
        expect(mockCollectorInstance.collectComments).toHaveBeenCalled();
    });

    it("should handle duplicates properly", async () => {
        const mockMessages = [{
            platformItemId: "msg-1",
            type: "MENTION",
            content: "Hello",
            senderName: "User",
            receivedAt: new Date(),
            rawData: {}
        }];

        mockCollectorInstance.collectMentions.mockResolvedValue({
            platform: "TWITTER",
            messages: mockMessages
        });

        // Mock that the item DOES exist
        vi.mocked(prisma.inboxItem.findUnique).mockResolvedValue({ id: "existing" } as any);

        const result = await collectFromAccount(mockAccount);

        expect(result.status).toBe("COMPLETED");
        expect(result.messagesCollected).toBe(1);
        expect(result.newMessages).toBe(0); // Should be 0 new messages
        expect(result.duplicatesSkipped).toBe(1);
        expect(upsertInboxItem).not.toHaveBeenCalled();
    });

    it("should handle rate limits", async () => {
        const error = new Error("Rate limit exceeded");
        mockCollectorInstance.collectMentions.mockRejectedValue(error);

        const resetDate = new Date(Date.now() + 60000);
        mockCollectorInstance.getRateLimitStatus.mockReturnValue({
            resetAt: resetDate,
            isLimited: true,
            remaining: 0,
            limit: 100
        });

        const result = await collectFromAccount(mockAccount);

        expect(result.status).toBe("RATE_LIMITED");
        expect(result.rateLimitStatus).toBeDefined();
    });

    it("should handle generic errors", async () => {
        mockCollectorInstance.collectMentions.mockRejectedValue(new Error("API Error"));

        const result = await collectFromAccount(mockAccount);

        expect(result.status).toBe("FAILED");
        expect(result.error).toBe("API Error");
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

    it("should pause when rate limited", async () => {
        vi.useFakeTimers();

        // Mock two accounts
        const mockAccounts = [
            {
              id: "acc-1",
              workspaceId: "ws-1",
              platform: "TWITTER" as const,
              accountId: "twitter-123",
              accessTokenEncrypted: "encrypted-token-1",
              refreshTokenEncrypted: "encrypted-refresh-1",
            },
            {
              id: "acc-2",
              workspaceId: "ws-1",
              platform: "FACEBOOK" as const,
              accountId: "fb-456",
              accessTokenEncrypted: "encrypted-token-2",
            }
        ] as unknown as SocialAccount[];

        vi.mocked(prisma.socialAccount.findMany).mockResolvedValue(mockAccounts);

        // First account triggers rate limit
        const resetTime = new Date(Date.now() + 5000); // 5 seconds wait

        mockCollectorInstance.collectMentions
            .mockRejectedValueOnce(new Error("Rate limit")) // For Twitter
            .mockResolvedValue({ messages: [] });   // For Facebook

        mockCollectorInstance.getRateLimitStatus
            .mockReturnValueOnce({ // For Twitter failure
                resetAt: resetTime,
                isLimited: true,
                remaining: 0,
                limit: 100
            })
            .mockReturnValue(null); // For others

        // Start the job
        const jobPromise = runWorkspaceCollectionJob("ws-1");

        // We expect a delay of 5000 + 1000 = 6000ms.
        await vi.advanceTimersByTimeAsync(6000);

        const results = await jobPromise;

        expect(results).toHaveLength(2);
        expect(results[0].status).toBe("RATE_LIMITED");
        expect(results[1].status).toBe("COMPLETED");
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
