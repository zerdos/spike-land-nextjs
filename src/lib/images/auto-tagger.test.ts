import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  extractTagsFromAnalysis,
  applyAutoTags,
  applyAutoTagsBatch,
  type AnalysisDetailedResult,
  type AssetAnalysisResult,
} from "./auto-tagger";
import prisma from "@/lib/prisma";

// Mock the prisma client
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
  it("should extract tags from AnalysisDetailedResult format", () => {
    const analysis: AnalysisDetailedResult = {
      mainSubject: "mountain landscape",
      imageStyle: "photograph",
      defects: {
        isDark: false,
        isBlurry: false,
        hasNoise: true,
        hasVHSArtifacts: false,
        isPixelated: false,
        hasColorCast: false,
      },
      components: ["mountains", "trees", "sky"],
      dominantColors: ["blue", "green", "white"],
      mood: "serene",
    };

    const tags = extractTagsFromAnalysis(analysis);

    expect(tags).toContain("mountain landscape");
    expect(tags).toContain("photograph");
    expect(tags).toContain("mountains");
    expect(tags).toContain("trees");
    expect(tags).toContain("sky");
    expect(tags).toContain("blue");
    expect(tags).toContain("green");
    expect(tags).toContain("white");
    expect(tags).toContain("serene");
    expect(tags).toContain("grainy");
  });

  it("should extract tags from AssetAnalysisResult format", () => {
    const analysis: AssetAnalysisResult = {
      altText: "A beautiful sunset over the ocean",
      qualityScore: 85,
      suggestedTags: ["sunset", "ocean", "landscape", "nature"],
      analysisDetails: {
        mainSubject: "sunset",
        imageStyle: "photo",
        technicalQuality: "high",
        dominantColors: ["orange", "purple", "pink"],
      },
    };

    const tags = extractTagsFromAnalysis(analysis);

    expect(tags).toContain("sunset");
    expect(tags).toContain("ocean");
    expect(tags).toContain("landscape");
    expect(tags).toContain("nature");
    expect(tags).toContain("photo");
    expect(tags).toContain("orange");
    expect(tags).toContain("purple");
    expect(tags).toContain("pink");
  });

  it("should normalize tags (lowercase, trim, remove special chars)", () => {
    const analysis = {
      mainSubject: "  Mountain Peak!  ",
      components: ["Trees@Home", "Sky Blue"],
    };

    const tags = extractTagsFromAnalysis(analysis);

    expect(tags).toContain("mountain peak");
    expect(tags).toContain("treeshome");
    expect(tags).toContain("sky blue");
    expect(tags.every((tag) => tag === tag.toLowerCase())).toBe(true);
  });

  it("should deduplicate tags", () => {
    const analysis = {
      mainSubject: "mountain",
      components: ["mountain", "Mountain", "MOUNTAIN"],
      dominantColors: ["blue", "Blue"],
    };

    const tags = extractTagsFromAnalysis(analysis);
    const mountainCount = tags.filter((tag) => tag === "mountain").length;
    const blueCount = tags.filter((tag) => tag === "blue").length;

    expect(mountainCount).toBe(1);
    expect(blueCount).toBe(1);
  });

  it("should limit tags to 15 maximum", () => {
    const analysis = {
      components: Array.from({ length: 20 }, (_, i) => `tag${i}`),
    };

    const tags = extractTagsFromAnalysis(analysis);

    expect(tags.length).toBeLessThanOrEqual(15);
  });

  it("should filter out profanity", () => {
    const analysis = {
      components: ["landscape", "nsfw", "mountain", "explicit"],
    };

    const tags = extractTagsFromAnalysis(analysis);

    expect(tags).toContain("landscape");
    expect(tags).toContain("mountain");
    expect(tags).not.toContain("nsfw");
    expect(tags).not.toContain("explicit");
  });

  it("should handle null/undefined gracefully", () => {
    expect(extractTagsFromAnalysis(null)).toEqual([]);
    expect(extractTagsFromAnalysis(undefined)).toEqual([]);
    expect(extractTagsFromAnalysis({})).toEqual([]);
  });

  it("should handle empty arrays", () => {
    const analysis = {
      components: [],
      dominantColors: [],
    };

    const tags = extractTagsFromAnalysis(analysis);

    expect(tags).toEqual([]);
  });

  it("should handle invalid JSON structures", () => {
    const analysis = {
      randomField: 123,
      anotherField: true,
      nestedObject: { foo: "bar" },
    };

    const tags = extractTagsFromAnalysis(analysis);

    expect(tags).toEqual([]);
  });

  it("should limit tag length to 50 characters", () => {
    const analysis = {
      mainSubject:
        "this is a very very very very very very very very very long tag that should be truncated",
    };

    const tags = extractTagsFromAnalysis(analysis);

    expect(tags[0]?.length).toBeLessThanOrEqual(50);
  });

  it("should handle mixed valid and invalid components", () => {
    const analysis = {
      components: ["mountain", 123, null, "tree", undefined, "sky"],
    };

    const tags = extractTagsFromAnalysis(analysis);

    expect(tags).toContain("mountain");
    expect(tags).toContain("tree");
    expect(tags).toContain("sky");
    expect(tags.length).toBe(3);
  });

  it("should add quality descriptors based on defects", () => {
    const darkAnalysis: AnalysisDetailedResult = {
      mainSubject: "photo",
      imageStyle: "photograph",
      defects: {
        isDark: true,
        isBlurry: false,
        hasNoise: false,
        hasVHSArtifacts: false,
        isPixelated: false,
        hasColorCast: false,
      },
    };

    const darkTags = extractTagsFromAnalysis(darkAnalysis);
    expect(darkTags).toContain("dark");

    const blurryAnalysis: AnalysisDetailedResult = {
      mainSubject: "photo",
      imageStyle: "photograph",
      defects: {
        isDark: false,
        isBlurry: true,
        hasNoise: false,
        hasVHSArtifacts: false,
        isPixelated: false,
        hasColorCast: false,
      },
    };

    const blurryTags = extractTagsFromAnalysis(blurryAnalysis);
    expect(blurryTags).toContain("blurry");

    const vintageAnalysis: AnalysisDetailedResult = {
      mainSubject: "photo",
      imageStyle: "photograph",
      defects: {
        isDark: false,
        isBlurry: false,
        hasNoise: false,
        hasVHSArtifacts: true,
        isPixelated: false,
        hasColorCast: false,
      },
    };

    const vintageTags = extractTagsFromAnalysis(vintageAnalysis);
    expect(vintageTags).toContain("vintage");
  });
});

describe("applyAutoTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should apply tags to image from latest completed job", async () => {
    const mockJob = {
      id: "job1",
      analysisResult: {
        mainSubject: "mountain",
        imageStyle: "photograph" as const,
        components: ["trees", "sky"],
        defects: {
          isDark: false,
          isBlurry: false,
          hasNoise: false,
          hasVHSArtifacts: false,
          isPixelated: false,
          hasColorCast: false,
        },
      },
    };

    vi.mocked(prisma.imageEnhancementJob.findFirst).mockResolvedValue(
      mockJob as never,
    );
    vi.mocked(prisma.enhancedImage.update).mockResolvedValue({} as never);

    const tags = await applyAutoTags("image1");

    expect(prisma.imageEnhancementJob.findFirst).toHaveBeenCalledWith({
      where: {
        imageId: "image1",
        status: "COMPLETED",
        analysisResult: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, analysisResult: true },
    });

    expect(prisma.enhancedImage.update).toHaveBeenCalledWith({
      where: { id: "image1" },
      data: {
        tags: expect.arrayContaining(["mountain", "photograph", "trees", "sky"]),
      },
    });

    expect(tags).toEqual(
      expect.arrayContaining(["mountain", "photograph", "trees", "sky"]),
    );
  });

  it("should return null if no completed job with analysis exists", async () => {
    vi.mocked(prisma.imageEnhancementJob.findFirst).mockResolvedValue(null);

    const tags = await applyAutoTags("image1");

    expect(tags).toBeNull();
    expect(prisma.enhancedImage.update).not.toHaveBeenCalled();
  });

  it("should return null if job has no analysisResult", async () => {
    const mockJob = {
      id: "job1",
      analysisResult: null,
    };

    vi.mocked(prisma.imageEnhancementJob.findFirst).mockResolvedValue(
      mockJob as never,
    );

    const tags = await applyAutoTags("image1");

    expect(tags).toBeNull();
    expect(prisma.enhancedImage.update).not.toHaveBeenCalled();
  });
});

describe("applyAutoTagsBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process multiple images and return results map", async () => {
    const mockJob1 = {
      id: "job1",
      analysisResult: {
        mainSubject: "mountain",
        imageStyle: "photograph" as const,
        defects: {
          isDark: false,
          isBlurry: false,
          hasNoise: false,
          hasVHSArtifacts: false,
          isPixelated: false,
          hasColorCast: false,
        },
      },
    };

    const mockJob2 = {
      id: "job2",
      analysisResult: {
        mainSubject: "ocean",
        imageStyle: "photograph" as const,
        defects: {
          isDark: false,
          isBlurry: false,
          hasNoise: false,
          hasVHSArtifacts: false,
          isPixelated: false,
          hasColorCast: false,
        },
      },
    };

    vi.mocked(prisma.imageEnhancementJob.findFirst)
      .mockResolvedValueOnce(mockJob1 as never)
      .mockResolvedValueOnce(mockJob2 as never)
      .mockResolvedValueOnce(null);

    vi.mocked(prisma.enhancedImage.update).mockResolvedValue({} as never);

    const results = await applyAutoTagsBatch(["image1", "image2", "image3"]);

    expect(results.size).toBe(3);
    expect(results.get("image1")).toEqual(
      expect.arrayContaining(["mountain", "photograph"]),
    );
    expect(results.get("image2")).toEqual(
      expect.arrayContaining(["ocean", "photograph"]),
    );
    expect(results.get("image3")).toBeNull();
  });

  it("should handle empty array", async () => {
    const results = await applyAutoTagsBatch([]);

    expect(results.size).toBe(0);
    expect(prisma.imageEnhancementJob.findFirst).not.toHaveBeenCalled();
  });
});
