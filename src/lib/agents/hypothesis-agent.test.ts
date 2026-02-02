import { getGeminiClient } from "@/lib/ai/gemini-client";
import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HypothesisAgent } from "./hypothesis-agent";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findUnique: vi.fn(),
    },
    socialPost: {
      findMany: vi.fn(),
    },
    hypothesis: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    socialPostAbTest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    experimentResult: {
      createMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/gemini-client", () => ({
  getGeminiClient: vi.fn(),
}));

describe("HypothesisAgent", () => {
  let agent: HypothesisAgent;
  let mockGenerateContent: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGenerateContent = vi.fn();
    (getGeminiClient as any).mockReturnValue({
      models: {
        generateContent: mockGenerateContent,
      },
    });

    agent = new HypothesisAgent();
  });

  describe("generateHypotheses", () => {
    it("should generate hypotheses and save them", async () => {
      // Setup mocks
      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: "ws-1",
        name: "Test Brand",
        brandProfile: { toneDescriptors: ["Friendly", "Professional"] },
      });

      (prisma.socialPost.findMany as any).mockResolvedValue([
        { content: "Post 1" },
        { content: "Post 2" },
      ]);

      const mockHypotheses = [
        {
          title: "Test Hypothesis",
          description: "Description",
          theoreticalBasis: "Theory",
          expectedOutcome: "Outcome",
          confidence: 0.9,
        },
      ];

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(mockHypotheses),
      });

      (prisma.hypothesis.create as any).mockImplementation((args: any) => ({
        id: "hyp-1",
        ...args.data,
      }));

      // Execute
      const result = await agent.generateHypotheses({
        workspaceId: "ws-1",
        count: 1,
      });

      // Verify
      expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
        where: { id: "ws-1" },
        include: { brandProfile: true },
      });

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(prisma.hypothesis.create).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0]!.title).toBe("Test Hypothesis");
    });
  });

  describe("generateVariants", () => {
    it("should generate variants for a hypothesis", async () => {
      (prisma.hypothesis.findUnique as any).mockResolvedValue({
        id: "hyp-1",
        title: "Test",
        description: "Desc",
        workspace: {
          brandProfile: { toneDescriptors: ["Friendly"] },
        },
      });

      const mockVariants = [
        { content: "Variant 1", variationType: "tone" },
        { content: "Variant 2", variationType: "tone" },
      ];

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(mockVariants),
      });

      const result = await agent.generateVariants({
        hypothesisId: "hyp-1",
        originalContent: "Original",
        count: 2,
      });

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toBeDefined();
      expect(result[0]!.content).toBe("Variant 1");
    });
  });

  describe("analyzeResults", () => {
    it("should analyze results and determine no winner if not significant", async () => {
      (prisma.socialPostAbTest.findUnique as any).mockResolvedValue({
        id: "exp-1",
        significanceLevel: 0.95,
        variants: [
          { id: "v1", impressions: 1000, engagements: 50 }, // 5%
          { id: "v2", impressions: 1000, engagements: 55 }, // 5.5% - likely not significant with this N
        ],
      });

      mockGenerateContent.mockResolvedValue({
        text: "Analysis insights...",
      });

      const result = await agent.analyzeResults({ experimentId: "exp-1" });

      expect(result.isSignificant).toBe(false);
      expect(result.winnerVariantId).toBeNull();
      expect(prisma.experimentResult.createMany).toHaveBeenCalled();
    });

    it("should identify a winner if significant", async () => {
      // Create a scenario with significant difference
      (prisma.socialPostAbTest.findUnique as any).mockResolvedValue({
        id: "exp-1",
        significanceLevel: 0.95,
        variants: [
          { id: "v1", impressions: 1000, engagements: 50 }, // 5%
          { id: "v2", impressions: 1000, engagements: 100 }, // 10% - should be significant
        ],
      });

      mockGenerateContent.mockResolvedValue({
        text: "Analysis insights...",
      });

      const result = await agent.analyzeResults({ experimentId: "exp-1" });

      expect(result.isSignificant).toBe(true);
      expect(result.winnerVariantId).toBe("v2");
      expect(prisma.socialPostAbTest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "exp-1" },
          data: { winnerVariantId: "v2" },
        }),
      );
    });
  });

  describe("designExperiment", () => {
    it("should design an experiment with correct parameters", async () => {
      // Mock calculateRequiredSampleSize
      vi.mock("@/lib/ab-testing", async () => {
        const actual = await vi.importActual("@/lib/ab-testing");
        return {
          ...actual,
          calculateRequiredSampleSize: vi.fn().mockReturnValue(1000),
        };
      });

      const params = {
        hypothesisId: "hyp-1",
        variants: 2,
        primaryMetric: "click_rate",
      };

      const result = await agent.designExperiment(params);

      expect(result).toMatchObject({
        hypothesisId: "hyp-1",
        variants: 2,
        primaryMetric: "click_rate",
        durationDays: 7,
      });
      expect(result.sampleSize).toBeGreaterThan(0);
      expect(result.minimumDetectableEffect).toBe(0.2);
    });
  });

  describe("selectWinner", () => {
    it("should select a winner when analyzeResults returns a winner", async () => {
      // Mock analyzeResults internally or its dependencies
      // Since it calls analyzeResults, we can mock the DB response which analyzeResults uses
      (prisma.socialPostAbTest.findUnique as any).mockResolvedValue({
        id: "exp-1",
        significanceLevel: 0.95,
        variants: [
          { id: "v1", impressions: 1000, engagements: 50 },
          { id: "v2", impressions: 1000, engagements: 100 }, // Significant winner
        ],
      });

      const result = await agent.selectWinner({ experimentId: "exp-1", autoPromote: true });

      expect(result.selectedVariantId).toBe("v2");
      expect(result.autoPromoted).toBe(true);
      expect(result.reason).toContain("Statistically significant");
    });

    it("should not select a winner when not significant", async () => {
      (prisma.socialPostAbTest.findUnique as any).mockResolvedValue({
        id: "exp-1",
        significanceLevel: 0.95,
        variants: [
          { id: "v1", impressions: 1000, engagements: 50 },
          { id: "v2", impressions: 1000, engagements: 52 }, // Not significant
        ],
      });

      const result = await agent.selectWinner({ experimentId: "exp-1" });

      expect(result.selectedVariantId).toBeNull();
      expect(result.reason).toContain("No statistically significant winner");
    });
  });
});
