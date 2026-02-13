import { describe, expect, it, vi, beforeEach } from "vitest";
import { submitReview, checkApprovalThreshold, scoreSubmission } from "./review";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    arenaSubmission: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    arenaReview: {
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("./elo", () => ({
  updateEloAfterScoring: vi.fn().mockResolvedValue({ newElo: 1216, eloChange: 16 }),
}));

vi.mock("./redis", () => ({
  publishArenaEvent: vi.fn().mockResolvedValue(undefined),
}));

import prisma from "@/lib/prisma";
import { updateEloAfterScoring } from "./elo";

const mockPrisma = vi.mocked(prisma);
const mockUpdateElo = vi.mocked(updateEloAfterScoring);

describe("Arena Review System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitReview", () => {
    it("creates a review and checks threshold", async () => {
      mockPrisma.arenaSubmission.findUniqueOrThrow.mockResolvedValue({
        status: "REVIEWING",
        userId: "author1",
      } as never);

      mockPrisma.arenaReview.findFirst.mockResolvedValue(null);

      mockPrisma.arenaReview.create.mockResolvedValue({
        id: "rev1",
      } as never);

      // Only 1 review so far - threshold not met
      mockPrisma.arenaReview.count.mockResolvedValue(1);

      const result = await submitReview({
        submissionId: "sub1",
        reviewerId: "reviewer1",
        bugs: [],
        score: 0.8,
        approved: true,
      });

      expect(result.reviewId).toBe("rev1");
      expect(result.scoringTriggered).toBe(false);
      expect(mockPrisma.arenaReview.create).toHaveBeenCalled();
    });

    it("rejects review if submission not in REVIEWING status", async () => {
      mockPrisma.arenaSubmission.findUniqueOrThrow.mockResolvedValue({
        status: "GENERATING",
        userId: "author1",
      } as never);

      await expect(
        submitReview({
          submissionId: "sub1",
          reviewerId: "reviewer1",
          bugs: [],
          score: 0.8,
          approved: true,
        }),
      ).rejects.toThrow("not in REVIEWING status");
    });

    it("rejects self-review", async () => {
      mockPrisma.arenaSubmission.findUniqueOrThrow.mockResolvedValue({
        status: "REVIEWING",
        userId: "user1",
      } as never);

      await expect(
        submitReview({
          submissionId: "sub1",
          reviewerId: "user1",
          bugs: [],
          score: 0.8,
          approved: true,
        }),
      ).rejects.toThrow("Cannot review your own submission");
    });

    it("rejects duplicate review", async () => {
      mockPrisma.arenaSubmission.findUniqueOrThrow.mockResolvedValue({
        status: "REVIEWING",
        userId: "author1",
      } as never);

      mockPrisma.arenaReview.findFirst.mockResolvedValue({
        id: "existing",
      } as never);

      await expect(
        submitReview({
          submissionId: "sub1",
          reviewerId: "reviewer1",
          bugs: [],
          score: 0.8,
          approved: true,
        }),
      ).rejects.toThrow("Already reviewed");
    });

    it("triggers scoring when threshold reached", async () => {
      mockPrisma.arenaSubmission.findUniqueOrThrow.mockResolvedValue({
        status: "REVIEWING",
        userId: "author1",
      } as never);

      mockPrisma.arenaReview.findFirst.mockResolvedValue(null);

      mockPrisma.arenaReview.create.mockResolvedValue({
        id: "rev2",
      } as never);

      // 2 reviews - threshold met
      mockPrisma.arenaReview.count.mockResolvedValue(2);

      // For scoreSubmission
      mockPrisma.arenaReview.findMany.mockResolvedValue([
        { score: 0.8, approved: true },
        { score: 0.9, approved: true },
      ] as never);

      mockPrisma.arenaSubmission.update.mockResolvedValue({} as never);

      const result = await submitReview({
        submissionId: "sub1",
        reviewerId: "reviewer2",
        bugs: [],
        score: 0.9,
        approved: true,
      });

      expect(result.scoringTriggered).toBe(true);
      expect(mockUpdateElo).toHaveBeenCalledWith("sub1");
    });

    it("clamps score between 0 and 1", async () => {
      mockPrisma.arenaSubmission.findUniqueOrThrow.mockResolvedValue({
        status: "REVIEWING",
        userId: "author1",
      } as never);

      mockPrisma.arenaReview.findFirst.mockResolvedValue(null);

      mockPrisma.arenaReview.create.mockResolvedValue({
        id: "rev1",
      } as never);

      mockPrisma.arenaReview.count.mockResolvedValue(1);

      await submitReview({
        submissionId: "sub1",
        reviewerId: "reviewer1",
        bugs: [],
        score: 1.5, // Over 1
        approved: true,
      });

      expect(mockPrisma.arenaReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ score: 1 }),
        }),
      );
    });
  });

  describe("checkApprovalThreshold", () => {
    it("returns false when below threshold", async () => {
      mockPrisma.arenaReview.count.mockResolvedValue(1);
      expect(await checkApprovalThreshold("sub1")).toBe(false);
    });

    it("returns true and scores when threshold met", async () => {
      mockPrisma.arenaReview.count.mockResolvedValue(2);
      mockPrisma.arenaReview.findMany.mockResolvedValue([
        { score: 0.7, approved: true },
        { score: 0.9, approved: true },
      ] as never);
      mockPrisma.arenaSubmission.update.mockResolvedValue({} as never);

      expect(await checkApprovalThreshold("sub1")).toBe(true);
    });
  });

  describe("scoreSubmission", () => {
    it("averages review scores and triggers ELO update", async () => {
      mockPrisma.arenaReview.findMany.mockResolvedValue([
        { score: 0.6, approved: true },
        { score: 0.8, approved: true },
      ] as never);

      mockPrisma.arenaSubmission.update.mockResolvedValue({} as never);

      await scoreSubmission("sub1");

      expect(mockPrisma.arenaSubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "SCORED",
            reviewScore: 0.7,
          }),
        }),
      );

      expect(mockUpdateElo).toHaveBeenCalledWith("sub1");
    });

    it("throws if no reviews found", async () => {
      mockPrisma.arenaReview.findMany.mockResolvedValue([]);

      await expect(scoreSubmission("sub1")).rejects.toThrow(
        "No reviews found",
      );
    });
  });
});
