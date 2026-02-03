import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyAutoTags, extractTagsFromAnalysis } from "./auto-tagger";

vi.mock("@/lib/prisma", () => ({
  default: {
    imageEnhancementJob: {
      findFirst: vi.fn(),
    },
    enhancedImage: {
      update: vi.fn(),
    },
  },
}));

describe("extractTagsFromAnalysis", () => {
  it("extracts tags from objects, colors, style, mood", () => {
    const analysis = {
      objects: ["Dog", "Park"],
      colors: ["Green", "Blue"],
      style: "Realistic",
      mood: "Happy",
    };
    const tags = extractTagsFromAnalysis(analysis);
    expect(tags).toEqual(
      expect.arrayContaining(["dog", "park", "green", "blue", "realistic", "happy"]),
    );
    expect(tags).toHaveLength(6);
  });

  it("handles missing fields gracefully", () => {
    const analysis = {
      objects: ["Cat"],
    };
    const tags = extractTagsFromAnalysis(analysis);
    expect(tags).toEqual(["cat"]);
  });

  it("deduplicates tags", () => {
    const analysis = {
      objects: ["Cat", "cat"],
      style: "CAT",
    };
    const tags = extractTagsFromAnalysis(analysis);
    expect(tags).toEqual(["cat"]);
  });

  it("limits tags to 15", () => {
    const analysis = {
      objects: Array.from({ length: 20 }, (_, i) => `obj${i}`),
    };
    const tags = extractTagsFromAnalysis(analysis);
    expect(tags).toHaveLength(15);
  });

  it("handles null/invalid input", () => {
    expect(extractTagsFromAnalysis(null)).toEqual([]);
    expect(extractTagsFromAnalysis("string")).toEqual([]);
  });
});

describe("applyAutoTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches job and updates image tags", async () => {
    const mockJob = {
      analysisResult: {
        objects: ["Tree"],
      },
    };
    (prisma.imageEnhancementJob.findFirst as any).mockResolvedValue(mockJob);

    await applyAutoTags("img-123");

    expect(prisma.imageEnhancementJob.findFirst).toHaveBeenCalledWith({
      where: { imageId: "img-123", analysisResult: expect.anything() },
      orderBy: { createdAt: "desc" },
      select: { analysisResult: true },
    });

    expect(prisma.enhancedImage.update).toHaveBeenCalledWith({
      where: { id: "img-123" },
      data: { tags: ["tree"] },
    });
  });

  it("does nothing if no job found", async () => {
    (prisma.imageEnhancementJob.findFirst as any).mockResolvedValue(null);
    await applyAutoTags("img-123");
    expect(prisma.enhancedImage.update).not.toHaveBeenCalled();
  });
});
