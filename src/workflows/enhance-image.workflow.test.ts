import { beforeEach, describe, expect, it, vi } from "vitest";
import { enhanceImage } from "./enhance-image.workflow";

// Mocks
const {
  mockDownloadFromR2,
  mockUploadToR2,
  mockEnhanceImageWithGemini,
  mockAnalyzeImageV2,
  mockRefundTokens,
  mockPrismaUpdate,
  mockSharp,
} = vi.hoisted(() => ({
  mockDownloadFromR2: vi.fn(),
  mockUploadToR2: vi.fn(),
  mockEnhanceImageWithGemini: vi.fn(),
  mockAnalyzeImageV2: vi.fn(),
  mockRefundTokens: vi.fn(),
  mockPrismaUpdate: vi.fn(),
  mockSharp: vi.fn(),
}));

vi.mock("@/lib/storage/r2-client--workflow", () => ({
  downloadFromR2: mockDownloadFromR2,
  uploadToR2: mockUploadToR2,
}));

vi.mock("@/lib/ai/gemini-client--workflow", () => ({
  enhanceImageWithGemini: mockEnhanceImageWithGemini,
  analyzeImageV2: mockAnalyzeImageV2,
  buildDynamicEnhancementPrompt: vi.fn(() => "Mock enhancement prompt"),
  buildBlendEnhancementPrompt: vi.fn(() => "Mock blend prompt"),
  getModelForTier: vi.fn(() => "gemini-3-pro-image-preview"),
  DEFAULT_MODEL: "gemini-3-pro-image-preview",
  DEFAULT_TEMPERATURE: null,
}));

vi.mock("@/lib/tokens/balance-manager--workflow", () => ({
  TokenBalanceManager: {
    refundTokens: mockRefundTokens,
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    imageEnhancementJob: {
      update: mockPrismaUpdate,
    },
  },
}));

vi.mock("sharp", () => ({
  default: mockSharp,
}));

describe("enhanceImage workflow", () => {
  const validInput = {
    jobId: "job-123",
    imageId: "img-456",
    userId: "user-789",
    originalR2Key: "users/user-789/originals/image.jpg",
    tier: "TIER_1K" as const,
    tokensCost: 10,
    sourceImageR2Key: null,
    blendSource: null,
  };

  const mockImageBuffer = Buffer.from("mock-image-data");
  const mockEnhancedBuffer = Buffer.from("mock-enhanced-data");
  const mockFinalBuffer = Buffer.from("mock-final-data");

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();

    mockDownloadFromR2.mockResolvedValue(mockImageBuffer);
    mockUploadToR2.mockResolvedValue({
      success: true,
      url: "https://example.com/enhanced.jpg",
    });
    mockEnhanceImageWithGemini.mockResolvedValue(mockEnhancedBuffer);
    mockRefundTokens.mockResolvedValue({ success: true });
    mockPrismaUpdate.mockResolvedValue({});

    const mockSharpInstance = {
      metadata: vi.fn().mockResolvedValue({
        width: 1920,
        height: 1080,
        format: "jpeg",
      }),
      resize: vi.fn().mockReturnThis(),
      extract: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(mockFinalBuffer),
    };
    mockSharp.mockReturnValue(mockSharpInstance);
  });

  it("should save alt text and quality score from analysis", async () => {
    mockAnalyzeImageV2.mockResolvedValue({
      description: "A beautiful landscape",
      quality: "high",
      structuredAnalysis: {
        mainSubject: "A beautiful landscape",
        imageStyle: "photograph",
        defects: {
          isDark: false,
          isBlurry: false,
          hasNoise: false,
          hasVHSArtifacts: false,
          isLowResolution: false,
          isOverexposed: false,
          hasColorCast: false,
        },
        lightingCondition: "daylight",
        cropping: { isCroppingNeeded: false },
      },
    });

    await enhanceImage(validInput);

    expect(mockPrismaUpdate).toHaveBeenCalledWith({
      where: { id: "job-123" },
      data: {
        analysisResult: expect.any(Object),
        analysisSource: "gemini-3-pro-image-preview",
        altText: "A beautiful landscape",
        qualityScore: 1.0,
      },
    });
  });

  it("should save alt text and quality score for medium quality", async () => {
    mockAnalyzeImageV2.mockResolvedValue({
      description: "A blurry photo",
      quality: "medium",
      structuredAnalysis: {
        mainSubject: "A blurry photo",
        imageStyle: "photograph",
        defects: {
          isDark: false,
          isBlurry: true,
          hasNoise: false,
          hasVHSArtifacts: false,
          isLowResolution: false,
          isOverexposed: false,
          hasColorCast: false,
        },
        lightingCondition: "unknown",
        cropping: { isCroppingNeeded: false },
      },
    });

    await enhanceImage(validInput);

    expect(mockPrismaUpdate).toHaveBeenCalledWith({
      where: { id: "job-123" },
      data: {
        analysisResult: expect.any(Object),
        analysisSource: "gemini-3-pro-image-preview",
        altText: "A blurry photo",
        qualityScore: 0.66,
      },
    });
  });
});
