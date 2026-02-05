import prisma from "@/lib/prisma";
import { CreatedAppStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCreatedApp,
  getRecentApps,
  getTopApps,
  incrementViewCount,
  markAsGenerating,
  updateAppStatus,
} from "./content-service";

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      createdApp: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

describe("content-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCreatedApp", () => {
    it("should return app with user", async () => {
      const mockApp = { slug: "test", generatedBy: { name: "User", image: "img" } };
      (prisma.createdApp.findUnique as any).mockResolvedValue(mockApp);

      const result = await getCreatedApp("test");
      expect(result).toEqual(mockApp);
    });
  });

  describe("markAsGenerating", () => {
    it("should upsert app with generating status", async () => {
      const mockApp = { slug: "test", status: CreatedAppStatus.GENERATING };
      (prisma.createdApp.upsert as any).mockResolvedValue(mockApp);

      const result = await markAsGenerating(
        "test",
        ["test"],
        "Title",
        "Desc",
        "id",
        "url",
        "prompt",
      );

      expect(result).toEqual(mockApp);
      expect(prisma.createdApp.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { slug: "test" },
        update: expect.objectContaining({ status: CreatedAppStatus.GENERATING }),
        create: expect.objectContaining({ status: CreatedAppStatus.GENERATING }),
      }));
    });
  });

  describe("updateAppStatus", () => {
    it("should update status", async () => {
      const mockApp = { slug: "test", status: CreatedAppStatus.PUBLISHED };
      (prisma.createdApp.update as any).mockResolvedValue(mockApp);

      const result = await updateAppStatus("test", CreatedAppStatus.PUBLISHED);

      expect(result).toEqual(mockApp);
      expect(prisma.createdApp.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { slug: "test" },
        data: expect.objectContaining({ status: CreatedAppStatus.PUBLISHED }),
      }));
    });
  });

  describe("incrementViewCount", () => {
    it("should increment view count", async () => {
      await incrementViewCount("test");

      expect(prisma.createdApp.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { slug: "test" },
        data: { viewCount: { increment: 1 } },
      }));
    });
  });

  describe("getTopApps", () => {
    it("should return top apps", async () => {
      const apps = [{ slug: "test" }];
      (prisma.createdApp.findMany as any).mockResolvedValue(apps);

      const result = await getTopApps();
      expect(result).toEqual(apps);
      expect(prisma.createdApp.findMany).toHaveBeenCalledWith(expect.objectContaining({
        orderBy: { viewCount: "desc" },
      }));
    });
  });

  describe("getRecentApps", () => {
    it("should return recent apps", async () => {
      const apps = [{ slug: "test" }];
      (prisma.createdApp.findMany as any).mockResolvedValue(apps);

      const result = await getRecentApps();
      expect(result).toEqual(apps);
      expect(prisma.createdApp.findMany).toHaveBeenCalledWith(expect.objectContaining({
        orderBy: { generatedAt: "desc" },
      }));
    });
  });
});
