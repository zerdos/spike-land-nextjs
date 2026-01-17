import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupExpiredBinApps, getBinStats } from "./bin-cleanup";

vi.mock("@/lib/prisma", () => ({
  default: {
    app: {
      findMany: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

vi.mock("@/lib/try-catch", () => ({
  tryCatch: vi.fn(async (promise) => {
    try {
      const data = await promise;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }),
}));

describe("bin-cleanup utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cleanupExpiredBinApps", () => {
    it("should delete expired apps", async () => {
      const now = new Date();
      const expiredDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

      const expiredApps = [
        { id: "app-1", name: "Expired App", userId: "user-1", deletedAt: expiredDate },
      ];

      vi.mocked(prisma.app.findMany).mockResolvedValue(expiredApps as any);
      vi.mocked(prisma.app.delete).mockResolvedValue({} as any);

      const result = await cleanupExpiredBinApps();

      expect(result.totalFound).toBe(1);
      expect(result.deleted).toBe(1);
      expect(prisma.app.delete).toHaveBeenCalledWith({
        where: { id: "app-1" },
      });
    });

    it("should not delete anything in dry run mode", async () => {
      const expiredApps = [
        { id: "app-1", name: "Expired App", userId: "user-1", deletedAt: new Date() },
      ];

      vi.mocked(prisma.app.findMany).mockResolvedValue(expiredApps as any);

      const result = await cleanupExpiredBinApps({ dryRun: true });

      expect(result.totalFound).toBe(1);
      expect(result.deleted).toBe(1); // Result reports it as "deleted" (planned)
      expect(result.dryRun).toBe(true);
      expect(prisma.app.delete).not.toHaveBeenCalled();
    });

    it("should handle partial failures", async () => {
      const expiredApps = [
        { id: "app-1", name: "App 1", userId: "u1", deletedAt: new Date() },
        { id: "app-2", name: "App 2", userId: "u1", deletedAt: new Date() },
      ];

      vi.mocked(prisma.app.findMany).mockResolvedValue(expiredApps as any);
      vi.mocked(prisma.app.delete)
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce(new Error("Failed to delete"));

      const result = await cleanupExpiredBinApps();

      expect(result.totalFound).toBe(2);
      expect(result.deleted).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("getBinStats", () => {
    it("should calculate correct stats", async () => {
      vi.mocked(prisma.app.groupBy).mockResolvedValue([{ id: "1" }, { id: "2" }] as any);

      const now = new Date();
      // One expiring in 24 hours, one in 5 days
      const apps = [
        { deletedAt: new Date(now.getTime() - (30 * 24 - 1) * 60 * 60 * 1000) }, // Expires in 1 hour
        { deletedAt: new Date(now.getTime() - (30 - 5) * 24 * 60 * 60 * 1000) }, // Expires in 5 days
      ];

      vi.mocked(prisma.app.findMany).mockResolvedValue(apps as any);

      const stats = await getBinStats();

      expect(stats.totalInBin).toBe(2);
      expect(stats.expiringWithin24Hours).toBe(1);
      expect(stats.expiringWithin7Days).toBe(2);
    });
  });
});
