import { describe, it, expect, vi, beforeEach } from "vitest";
import { startVariantGeneration } from "../variant-generator";
import prisma from "@/lib/prisma";
import * as copyGenerator from "../generators/copy-generator";

vi.mock("@/lib/prisma", () => ({
  default: {
    campaignBrief: {
      findUnique: vi.fn(),
    },
    creativeSet: {
      create: vi.fn(),
      update: vi.fn(),
    },
    creativeVariant: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../generators/copy-generator", () => ({
  generateCopyVariants: vi.fn(),
}));

vi.mock("../generators/image-suggester", () => ({
  suggestImagesForCopy: vi.fn(),
}));

describe("startVariantGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a job and return set ID", async () => {
    (prisma.creativeSet.create as any).mockResolvedValue({ id: "set-123" });
    (copyGenerator.generateCopyVariants as any).mockResolvedValue([]);

    const result = await startVariantGeneration({
      userId: "user-1",
      seedContent: "Test content",
      count: 3,
    });

    expect(result).toBe("set-123");
    expect(prisma.creativeSet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          seedContent: "Test content",
          jobStatus: "PENDING",
        }),
      })
    );
  });

  it("should fetch brief if briefId is provided", async () => {
    (prisma.campaignBrief.findUnique as any).mockResolvedValue({
      id: "brief-1",
      name: "My Brief",
      keyMessages: ["Buy now"],
      targetAudience: { age: "20-30" },
    });
    (prisma.creativeSet.create as any).mockResolvedValue({ id: "set-123" });
    (copyGenerator.generateCopyVariants as any).mockResolvedValue([]);

    await startVariantGeneration({
      userId: "user-1",
      briefId: "brief-1",
      count: 3,
    });

    expect(prisma.campaignBrief.findUnique).toHaveBeenCalledWith({
      where: { id: "brief-1" },
    });
    expect(prisma.creativeSet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Variants for My Brief",
        }),
      })
    );
  });
});
