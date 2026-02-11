import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as copyGenerator from "../generators/copy-generator";
import * as imageSuggester from "../generators/image-suggester";
import {
  createGenerationJob,
  type GenerationJobParams,
  processGenerationJob,
} from "../variant-generator";

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    creativeSet: {
      create: vi.fn(),
      update: vi.fn(),
    },
    creativeVariant: {
      create: vi.fn(),
    },
    campaignBrief: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../generators/copy-generator", () => ({
  generateCopyVariants: vi.fn(),
}));

vi.mock("../generators/image-suggester", () => ({
  suggestImagesForCopy: vi.fn(),
}));

describe("Variant Generator Integration", () => {
  const mockJobParams: GenerationJobParams = {
    userId: "user-123",
    seedContent: "Test content",
    count: 2,
    platform: "linkedin",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createGenerationJob", () => {
    it("should create a pending job and return ID", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: "user-123" });
      (prisma.creativeSet.create as any).mockResolvedValue({ id: "job-123" });

      const result = await createGenerationJob(mockJobParams);

      expect(result.id).toBe("job-123");
      expect(prisma.creativeSet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          generatedById: "user-123",
          seedContent: "Test content",
          jobStatus: "PENDING",
        }),
      });
    });
  });

  describe("processGenerationJob", () => {
    it("should process job, generate variants, and update status to COMPLETED", async () => {
      const mockVariants = [
        {
          headline: "H1",
          bodyText: "B1",
          callToAction: "C1",
          tone: "pro",
          length: "short",
          explanation: "E1",
        },
        {
          headline: "H2",
          bodyText: "B2",
          callToAction: "C2",
          tone: "pro",
          length: "short",
          explanation: "E2",
        },
      ];

      (copyGenerator.generateCopyVariants as any).mockResolvedValue(mockVariants);
      (imageSuggester.suggestImagesForCopy as any).mockResolvedValue([]);

      await processGenerationJob("job-123", mockJobParams, "Test content", "Test Audience");

      expect(copyGenerator.generateCopyVariants).toHaveBeenCalled();

      // Should create variants in DB
      expect(prisma.creativeVariant.create).toHaveBeenCalledTimes(2);

      // Should update job status (checking the last call for completion)
      expect(prisma.creativeSet.update).toHaveBeenLastCalledWith({
        where: { id: "job-123" },
        data: expect.objectContaining({
          jobStatus: "COMPLETED",
          status: "ACTIVE",
        }),
      });
    });

    it("should handle errors and update status to FAILED", async () => {
      const error = new Error("Generation failed");
      (copyGenerator.generateCopyVariants as any).mockRejectedValue(error);

      await processGenerationJob("job-123", mockJobParams, "Test content", "Test Audience");

      expect(prisma.creativeSet.update).toHaveBeenCalledWith({
        where: { id: "job-123" },
        data: {
          jobStatus: "FAILED",
          errorMessage: expect.stringContaining("Generation failed"),
        },
      });
    });
  });
});
