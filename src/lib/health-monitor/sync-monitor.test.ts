/**
 * Sync Monitor Tests
 *
 * Tests for sync status tracking functions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";

import { getOrCreateHealth, updateHealth } from "./health-calculator";
import {
  getAccountsNeedingSync,
  getAccountsWithSyncIssues,
  getSyncStatus,
  needsSync,
  recordFailedSync,
  recordSuccessfulSync,
  resetDailyErrorCounters,
} from "./sync-monitor";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccountHealth: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    socialAccount: {
      findMany: vi.fn(),
    },
  },
}));

// Mock health calculator functions
vi.mock("./health-calculator", () => ({
  getOrCreateHealth: vi.fn(),
  updateHealth: vi.fn(),
}));

describe("Sync Monitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("recordSuccessfulSync", () => {
    it("updates health record on successful sync", async () => {
      const mockHealth = {
        id: "health-1",
        accountId: "account-1",
        consecutiveErrors: 3,
        totalErrorsLast24h: 5,
      };

      vi.mocked(getOrCreateHealth).mockResolvedValue(mockHealth as never);
      vi.mocked(updateHealth).mockResolvedValue({
        ...mockHealth,
        consecutiveErrors: 0,
        lastSuccessfulSync: new Date(),
        lastSyncAttempt: new Date(),
      } as never);

      await recordSuccessfulSync("account-1");

      expect(getOrCreateHealth).toHaveBeenCalledWith("account-1");
      expect(updateHealth).toHaveBeenCalledWith(
        "account-1",
        expect.objectContaining({
          consecutiveErrors: 0,
          lastSuccessfulSync: expect.any(Date),
          lastSyncAttempt: expect.any(Date),
        }),
      );
    });
  });

  describe("recordFailedSync", () => {
    it("increments error counters on failed sync", async () => {
      const mockHealth = {
        id: "health-1",
        accountId: "account-1",
        consecutiveErrors: 2,
        totalErrorsLast24h: 5,
      };

      vi.mocked(getOrCreateHealth).mockResolvedValue(mockHealth as never);
      vi.mocked(updateHealth).mockResolvedValue({
        ...mockHealth,
        consecutiveErrors: 3,
        totalErrorsLast24h: 6,
      } as never);

      await recordFailedSync("account-1", "Connection timeout");

      expect(updateHealth).toHaveBeenCalledWith(
        "account-1",
        expect.objectContaining({
          consecutiveErrors: 3,
          totalErrorsLast24h: 6,
          lastError: "Connection timeout",
          lastErrorAt: expect.any(Date),
          lastSyncAttempt: expect.any(Date),
        }),
      );
    });

    it("records error message", async () => {
      const mockHealth = {
        id: "health-1",
        accountId: "account-1",
        consecutiveErrors: 0,
        totalErrorsLast24h: 0,
      };

      vi.mocked(getOrCreateHealth).mockResolvedValue(mockHealth as never);
      vi.mocked(updateHealth).mockResolvedValue({
        ...mockHealth,
        lastError: "API returned 500",
      } as never);

      await recordFailedSync("account-1", "API returned 500");

      expect(updateHealth).toHaveBeenCalledWith(
        "account-1",
        expect.objectContaining({
          lastError: "API returned 500",
        }),
      );
    });
  });

  describe("getSyncStatus", () => {
    it("returns sync status for account", async () => {
      const mockHealth = {
        id: "health-1",
        accountId: "account-1",
        lastSuccessfulSync: new Date(),
        lastSyncAttempt: new Date(),
        consecutiveErrors: 0,
        totalErrorsLast24h: 2,
        lastError: null,
        lastErrorAt: null,
      };

      vi.mocked(getOrCreateHealth).mockResolvedValue(mockHealth as never);

      const status = await getSyncStatus("account-1");

      expect(status).toEqual({
        lastSuccessfulSync: mockHealth.lastSuccessfulSync,
        lastSyncAttempt: mockHealth.lastSyncAttempt,
        consecutiveErrors: 0,
        lastError: null,
        isSyncing: false,
        syncHealthy: true,
      });
    });

    it("returns syncHealthy=false for old sync", async () => {
      const mockHealth = {
        id: "health-1",
        accountId: "account-1",
        lastSuccessfulSync: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        lastSyncAttempt: new Date(),
        consecutiveErrors: 0,
        totalErrorsLast24h: 0,
        lastError: null,
        lastErrorAt: null,
      };

      vi.mocked(getOrCreateHealth).mockResolvedValue(mockHealth as never);

      const status = await getSyncStatus("account-1");

      expect(status.syncHealthy).toBe(false);
    });

    it("returns syncHealthy=false for null lastSuccessfulSync", async () => {
      const mockHealth = {
        id: "health-1",
        accountId: "account-1",
        lastSuccessfulSync: null,
        lastSyncAttempt: new Date(),
        consecutiveErrors: 0,
        totalErrorsLast24h: 0,
        lastError: null,
        lastErrorAt: null,
      };

      vi.mocked(getOrCreateHealth).mockResolvedValue(mockHealth as never);

      const status = await getSyncStatus("account-1");

      expect(status.syncHealthy).toBe(false);
    });
  });

  describe("resetDailyErrorCounters", () => {
    it("resets all error counters for workspace", async () => {
      vi.mocked(prisma.socialAccountHealth.updateMany).mockResolvedValue({
        count: 10,
      });

      const count = await resetDailyErrorCounters("workspace-1");

      expect(prisma.socialAccountHealth.updateMany).toHaveBeenCalledWith({
        where: {
          account: { workspaceId: "workspace-1" },
        },
        data: {
          totalErrorsLast24h: 0,
        },
      });
      expect(count).toBe(10);
    });
  });

  describe("getAccountsWithSyncIssues", () => {
    it("returns accounts with sync issues", async () => {
      const mockAccounts = [
        {
          id: "account-1",
          accountName: "test1",
          platform: "TWITTER",
          health: {
            lastSuccessfulSync: new Date(Date.now() - 48 * 60 * 60 * 1000),
            consecutiveErrors: 5,
            lastError: "Connection failed",
          },
        },
      ];

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue(
        mockAccounts as never,
      );

      const accounts = await getAccountsWithSyncIssues("workspace-1");

      expect(prisma.socialAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: "workspace-1",
          }),
        }),
      );
      expect(accounts).toHaveLength(1);
      expect(accounts[0]!.accountId).toBe("account-1");
    });

    it("filters out accounts without health record", async () => {
      const mockAccounts = [
        {
          id: "account-1",
          accountName: "test1",
          platform: "TWITTER",
          health: null,
        },
      ];

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue(
        mockAccounts as never,
      );

      const accounts = await getAccountsWithSyncIssues("workspace-1");

      expect(accounts).toHaveLength(0);
    });
  });

  describe("needsSync", () => {
    it("returns true when lastSuccessfulSync is old", async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const mockHealth = {
        lastSuccessfulSync: oldDate,
      };

      vi.mocked(prisma.socialAccountHealth.findUnique).mockResolvedValue(
        mockHealth as never,
      );

      const result = await needsSync("account-1");

      expect(result).toBe(true);
    });

    it("returns false when lastSuccessfulSync is recent", async () => {
      const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const mockHealth = {
        lastSuccessfulSync: recentDate,
      };

      vi.mocked(prisma.socialAccountHealth.findUnique).mockResolvedValue(
        mockHealth as never,
      );

      const result = await needsSync("account-1");

      expect(result).toBe(false);
    });

    it("returns true when no health record exists", async () => {
      vi.mocked(prisma.socialAccountHealth.findUnique).mockResolvedValue(null);

      const result = await needsSync("account-1");

      expect(result).toBe(true);
    });

    it("returns true when lastSuccessfulSync is null", async () => {
      const mockHealth = {
        lastSuccessfulSync: null,
      };

      vi.mocked(prisma.socialAccountHealth.findUnique).mockResolvedValue(
        mockHealth as never,
      );

      const result = await needsSync("account-1");

      expect(result).toBe(true);
    });

    it("respects custom maxAgeHours", async () => {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const mockHealth = {
        lastSuccessfulSync: sixHoursAgo,
      };

      vi.mocked(prisma.socialAccountHealth.findUnique).mockResolvedValue(
        mockHealth as never,
      );

      // With default 24h, should not need sync
      expect(await needsSync("account-1", 24)).toBe(false);

      // With 4h max age, should need sync
      expect(await needsSync("account-1", 4)).toBe(true);
    });
  });

  describe("getAccountsNeedingSync", () => {
    it("returns accounts that need sync", async () => {
      const mockAccounts = [
        { id: "account-1" },
        { id: "account-2" },
      ];

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue(
        mockAccounts as never,
      );

      const accounts = await getAccountsNeedingSync("workspace-1");

      expect(prisma.socialAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: "workspace-1",
            status: "ACTIVE",
          }),
        }),
      );
      expect(accounts).toEqual(["account-1", "account-2"]);
    });

    it("returns empty array when no accounts need sync", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

      const accounts = await getAccountsNeedingSync("workspace-1");

      expect(accounts).toHaveLength(0);
    });

    it("respects custom maxAgeHours", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

      await getAccountsNeedingSync("workspace-1", 12);

      expect(prisma.socialAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                health: expect.objectContaining({
                  lastSuccessfulSync: expect.objectContaining({
                    lt: expect.any(Date),
                  }),
                }),
              }),
            ]),
          }),
        }),
      );
    });
  });
});
