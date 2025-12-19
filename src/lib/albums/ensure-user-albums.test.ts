import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureUserAlbums,
  getOrCreatePrivateAlbum,
  getOrCreatePublicAlbum,
} from "./ensure-user-albums";

vi.mock("@/lib/prisma", () => ({
  default: {
    album: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

const mockAlbum = (overrides: Partial<{
  id: string;
  userId: string;
  name: string;
  privacy: "PRIVATE" | "PUBLIC" | "UNLISTED";
  defaultTier: "TIER_1K" | "TIER_2K" | "TIER_4K";
  description: string | null;
}> = {}) => ({
  id: "album-1",
  userId: "user-1",
  name: "Test Album",
  description: null,
  coverImageId: null,
  privacy: "PRIVATE" as const,
  defaultTier: "TIER_1K" as const,
  shareToken: null,
  sortOrder: 0,
  pipelineId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("ensureUserAlbums", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing albums when both exist", async () => {
    const privateAlbum = mockAlbum({
      id: "private-1",
      name: "Private Gallery",
      privacy: "PRIVATE",
    });
    const publicAlbum = mockAlbum({
      id: "public-1",
      name: "Public Gallery",
      privacy: "PUBLIC",
    });

    vi.mocked(prisma.album.findMany).mockResolvedValue([
      privateAlbum,
      publicAlbum,
    ]);

    const result = await ensureUserAlbums("user-1");

    expect(result.privateAlbum).toEqual(privateAlbum);
    expect(result.publicAlbum).toEqual(publicAlbum);
    expect(prisma.album.createMany).not.toHaveBeenCalled();
  });

  it("creates missing private album", async () => {
    const publicAlbum = mockAlbum({
      id: "public-1",
      name: "Public Gallery",
      privacy: "PUBLIC",
    });
    const newPrivateAlbum = mockAlbum({
      id: "private-new",
      name: "Private Gallery",
      privacy: "PRIVATE",
    });

    vi.mocked(prisma.album.findMany).mockResolvedValue([publicAlbum]);
    vi.mocked(prisma.album.createMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.album.findFirst).mockResolvedValue(newPrivateAlbum);

    const result = await ensureUserAlbums("user-1");

    expect(prisma.album.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "user-1",
          name: "Private Gallery",
          privacy: "PRIVATE",
          defaultTier: "TIER_1K",
          description: "My private photos",
        },
      ],
      skipDuplicates: true,
    });
    expect(result.privateAlbum).toEqual(newPrivateAlbum);
    expect(result.publicAlbum).toEqual(publicAlbum);
  });

  it("creates missing public album", async () => {
    const privateAlbum = mockAlbum({
      id: "private-1",
      name: "Private Gallery",
      privacy: "PRIVATE",
    });
    const newPublicAlbum = mockAlbum({
      id: "public-new",
      name: "Public Gallery",
      privacy: "PUBLIC",
    });

    vi.mocked(prisma.album.findMany).mockResolvedValue([privateAlbum]);
    vi.mocked(prisma.album.createMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.album.findFirst).mockResolvedValue(newPublicAlbum);

    const result = await ensureUserAlbums("user-1");

    expect(prisma.album.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "user-1",
          name: "Public Gallery",
          privacy: "PUBLIC",
          defaultTier: "TIER_1K",
          description: "My public enhancements",
        },
      ],
      skipDuplicates: true,
    });
    expect(result.privateAlbum).toEqual(privateAlbum);
    expect(result.publicAlbum).toEqual(newPublicAlbum);
  });

  it("creates both albums when none exist", async () => {
    const newPrivateAlbum = mockAlbum({
      id: "private-new",
      name: "Private Gallery",
      privacy: "PRIVATE",
    });
    const newPublicAlbum = mockAlbum({
      id: "public-new",
      name: "Public Gallery",
      privacy: "PUBLIC",
    });

    vi.mocked(prisma.album.findMany).mockResolvedValue([]);
    vi.mocked(prisma.album.createMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.album.findFirst)
      .mockResolvedValueOnce(newPrivateAlbum)
      .mockResolvedValueOnce(newPublicAlbum);

    const result = await ensureUserAlbums("user-1");

    expect(prisma.album.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: "user-1",
          name: "Private Gallery",
          privacy: "PRIVATE",
        }),
        expect.objectContaining({
          userId: "user-1",
          name: "Public Gallery",
          privacy: "PUBLIC",
        }),
      ]),
      skipDuplicates: true,
    });
    expect(result.privateAlbum).toEqual(newPrivateAlbum);
    expect(result.publicAlbum).toEqual(newPublicAlbum);
  });

  it("throws error if albums cannot be created", async () => {
    vi.mocked(prisma.album.findMany).mockResolvedValue([]);
    vi.mocked(prisma.album.createMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.album.findFirst).mockResolvedValue(null);

    await expect(ensureUserAlbums("user-1")).rejects.toThrow(
      "Failed to ensure albums for user user-1",
    );
  });

  it("throws error if findMany fails", async () => {
    vi.mocked(prisma.album.findMany).mockRejectedValue(
      new Error("Database connection failed"),
    );

    await expect(ensureUserAlbums("user-1")).rejects.toThrow(
      "Failed to fetch albums for user user-1: Database connection failed",
    );
  });

  it("throws error if createMany fails", async () => {
    vi.mocked(prisma.album.findMany).mockResolvedValue([]);
    vi.mocked(prisma.album.createMany).mockRejectedValue(
      new Error("Insert failed"),
    );

    await expect(ensureUserAlbums("user-1")).rejects.toThrow(
      "Failed to create albums for user user-1: Insert failed",
    );
  });

  it("throws error if final fetch fails", async () => {
    const privateAlbum = mockAlbum({
      id: "private-1",
      name: "Private Gallery",
      privacy: "PRIVATE",
    });

    vi.mocked(prisma.album.findMany).mockResolvedValue([privateAlbum]);
    vi.mocked(prisma.album.createMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.album.findFirst).mockRejectedValue(
      new Error("Fetch failed"),
    );

    await expect(ensureUserAlbums("user-1")).rejects.toThrow(
      "Failed to fetch albums for user user-1: Fetch failed",
    );
  });
});

describe("getOrCreatePrivateAlbum", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the private album", async () => {
    const privateAlbum = mockAlbum({
      id: "private-1",
      name: "Private Gallery",
      privacy: "PRIVATE",
    });
    const publicAlbum = mockAlbum({
      id: "public-1",
      name: "Public Gallery",
      privacy: "PUBLIC",
    });

    vi.mocked(prisma.album.findMany).mockResolvedValue([
      privateAlbum,
      publicAlbum,
    ]);

    const result = await getOrCreatePrivateAlbum("user-1");

    expect(result).toEqual(privateAlbum);
  });
});

describe("getOrCreatePublicAlbum", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the public album", async () => {
    const privateAlbum = mockAlbum({
      id: "private-1",
      name: "Private Gallery",
      privacy: "PRIVATE",
    });
    const publicAlbum = mockAlbum({
      id: "public-1",
      name: "Public Gallery",
      privacy: "PUBLIC",
    });

    vi.mocked(prisma.album.findMany).mockResolvedValue([
      privateAlbum,
      publicAlbum,
    ]);

    const result = await getOrCreatePublicAlbum("user-1");

    expect(result).toEqual(publicAlbum);
  });
});
