import prisma from "@/lib/prisma";
import { AppBuildStatus, CreatedAppStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLatestShowcaseApps } from "./showcase-feed";

vi.mock("@/lib/prisma", () => ({
  default: {
    app: { findMany: vi.fn() },
    createdApp: { findMany: vi.fn() },
  },
}));

describe("getLatestShowcaseApps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should merge and sort apps from both sources by lastActivity desc", async () => {
    vi.mocked(prisma.app.findMany).mockResolvedValue([
      {
        id: "app-1",
        name: "My App",
        description: "An app",
        slug: "my-app",
        codespaceId: "cs-1",
        updatedAt: new Date("2025-01-01"),
      },
    ] as any);

    vi.mocked(prisma.createdApp.findMany).mockResolvedValue([
      {
        id: "ca-1",
        title: "Created App",
        description: "A created app",
        slug: "created-app",
        codespaceId: "cs-2",
        generatedAt: new Date("2025-01-02"),
        viewCount: 42,
      },
    ] as any);

    const result = await getLatestShowcaseApps(10);

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("ca-1");
    expect(result[0]!.source).toBe("created-app");
    expect(result[0]!.viewCount).toBe(42);
    expect(result[1]!.id).toBe("app-1");
    expect(result[1]!.source).toBe("app");
  });

  it("should de-duplicate by codespaceId keeping the most recent", async () => {
    vi.mocked(prisma.app.findMany).mockResolvedValue([
      {
        id: "app-1",
        name: "App Version",
        description: "desc",
        slug: "app-v",
        codespaceId: "cs-shared",
        updatedAt: new Date("2025-01-03"),
      },
    ] as any);

    vi.mocked(prisma.createdApp.findMany).mockResolvedValue([
      {
        id: "ca-1",
        title: "Created Version",
        description: "desc",
        slug: "created-v",
        codespaceId: "cs-shared",
        generatedAt: new Date("2025-01-01"),
        viewCount: 5,
      },
    ] as any);

    const result = await getLatestShowcaseApps(10);

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("app-1");
  });

  it("should respect the limit parameter", async () => {
    vi.mocked(prisma.app.findMany).mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        id: `app-${i}`,
        name: `App ${i}`,
        description: `desc ${i}`,
        slug: `app-${i}`,
        codespaceId: `cs-app-${i}`,
        updatedAt: new Date(`2025-01-${10 - i}`),
      })) as any,
    );

    vi.mocked(prisma.createdApp.findMany).mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        id: `ca-${i}`,
        title: `Created ${i}`,
        description: `desc ${i}`,
        slug: `created-${i}`,
        codespaceId: `cs-ca-${i}`,
        generatedAt: new Date(`2025-01-${10 - i}`),
        viewCount: i,
      })) as any,
    );

    const result = await getLatestShowcaseApps(3);

    expect(result).toHaveLength(3);
  });

  it("should return empty array when both queries fail", async () => {
    vi.mocked(prisma.app.findMany).mockRejectedValue(
      new Error("DB down"),
    );
    vi.mocked(prisma.createdApp.findMany).mockRejectedValue(
      new Error("DB down"),
    );

    const result = await getLatestShowcaseApps();

    expect(result).toEqual([]);
  });

  it("should return results from one source when the other fails", async () => {
    vi.mocked(prisma.app.findMany).mockRejectedValue(
      new Error("DB down"),
    );
    vi.mocked(prisma.createdApp.findMany).mockResolvedValue([
      {
        id: "ca-1",
        title: "Created App",
        description: "desc",
        slug: "created-app",
        codespaceId: "cs-1",
        generatedAt: new Date("2025-01-01"),
        viewCount: 0,
      },
    ] as any);

    const result = await getLatestShowcaseApps();

    expect(result).toHaveLength(1);
    expect(result[0]!.source).toBe("created-app");
  });

  it("should return empty array when both sources return empty", async () => {
    vi.mocked(prisma.app.findMany).mockResolvedValue([]);
    vi.mocked(prisma.createdApp.findMany).mockResolvedValue([]);

    const result = await getLatestShowcaseApps();

    expect(result).toEqual([]);
  });

  it("should use correct query parameters", async () => {
    vi.mocked(prisma.app.findMany).mockResolvedValue([]);
    vi.mocked(prisma.createdApp.findMany).mockResolvedValue([]);

    await getLatestShowcaseApps(5);

    expect(prisma.app.findMany).toHaveBeenCalledWith({
      where: {
        isPublic: true,
        status: AppBuildStatus.LIVE,
        codespaceId: { not: null },
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        codespaceId: true,
        updatedAt: true,
      },
    });

    expect(prisma.createdApp.findMany).toHaveBeenCalledWith({
      where: {
        status: CreatedAppStatus.PUBLISHED,
        codespaceId: { not: "" },
      },
      orderBy: { generatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        description: true,
        slug: true,
        codespaceId: true,
        generatedAt: true,
        viewCount: true,
      },
    });
  });

  it("should use app id as slug fallback when slug is null", async () => {
    vi.mocked(prisma.app.findMany).mockResolvedValue([
      {
        id: "app-no-slug",
        name: "No Slug App",
        description: null,
        slug: null,
        codespaceId: "cs-1",
        updatedAt: new Date("2025-01-01"),
      },
    ] as any);
    vi.mocked(prisma.createdApp.findMany).mockResolvedValue([]);

    const result = await getLatestShowcaseApps();

    expect(result[0]!.slug).toBe("app-no-slug");
    expect(result[0]!.description).toBe("");
  });
});
