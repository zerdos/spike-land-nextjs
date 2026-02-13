import { describe, expect, it, vi, beforeEach } from "vitest";
import { calculateEloChange, expectedScore, updateEloAfterScoring } from "./elo";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    arenaSubmission: {
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    arenaElo: {
      upsert: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

describe("ELO System", () => {
  describe("expectedScore", () => {
    it("returns 0.5 for equal ratings", () => {
      expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 4);
    });

    it("returns higher value for stronger player", () => {
      const result = expectedScore(1400, 1200);
      expect(result).toBeGreaterThan(0.5);
      expect(result).toBeLessThan(1);
    });

    it("returns lower value for weaker player", () => {
      const result = expectedScore(1000, 1200);
      expect(result).toBeLessThan(0.5);
      expect(result).toBeGreaterThan(0);
    });

    it("complementary scores sum to 1", () => {
      const a = expectedScore(1200, 1400);
      const b = expectedScore(1400, 1200);
      expect(a + b).toBeCloseTo(1, 4);
    });

    it("extreme rating difference approaches 0 or 1", () => {
      expect(expectedScore(2000, 800)).toBeGreaterThan(0.99);
      expect(expectedScore(800, 2000)).toBeLessThan(0.01);
    });
  });

  describe("calculateEloChange", () => {
    it("gives positive change for a win", () => {
      const change = calculateEloChange(1200, 1200, 1);
      expect(change).toBe(16); // K=32, expected=0.5, (1-0.5)*32=16
    });

    it("gives negative change for a loss", () => {
      const change = calculateEloChange(1200, 1200, 0);
      expect(change).toBe(-16);
    });

    it("gives zero change for a draw between equals", () => {
      const change = calculateEloChange(1200, 1200, 0.5);
      expect(change).toBe(0);
    });

    it("gives larger gain for beating a stronger opponent", () => {
      const upsetWin = calculateEloChange(1000, 1400, 1);
      const normalWin = calculateEloChange(1200, 1200, 1);
      expect(upsetWin).toBeGreaterThan(normalWin);
    });

    it("gives smaller loss for losing to a stronger opponent", () => {
      const expectedLoss = calculateEloChange(1000, 1400, 0);
      const evenLoss = calculateEloChange(1200, 1200, 0);
      expect(Math.abs(expectedLoss)).toBeLessThan(Math.abs(evenLoss));
    });

    it("returns an integer", () => {
      const change = calculateEloChange(1234, 1567, 1);
      expect(Number.isInteger(change)).toBe(true);
    });
  });

  describe("updateEloAfterScoring", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("handles first submission in challenge (win against default)", async () => {
      mockPrisma.arenaSubmission.findUniqueOrThrow.mockResolvedValue({
        userId: "user1",
        challengeId: "ch1",
        reviewScore: 0.8,
      } as never);

      mockPrisma.arenaSubmission.findMany.mockResolvedValue([]);

      mockPrisma.arenaElo.upsert.mockResolvedValue({
        userId: "user1",
        elo: 1200,
        wins: 0,
        losses: 0,
        draws: 0,
        streak: 0,
        bestElo: 1200,
      } as never);

      mockPrisma.arenaElo.update.mockResolvedValue({} as never);
      mockPrisma.arenaSubmission.update.mockResolvedValue({} as never);

      const result = await updateEloAfterScoring("sub1");

      expect(result.eloChange).toBe(16); // Win against default (equal rating)
      expect(result.newElo).toBe(1216);
      expect(mockPrisma.arenaElo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user1" },
          data: expect.objectContaining({
            elo: 1216,
            wins: { increment: 1 },
          }),
        }),
      );
    });

    it("throws if submission has no review score", async () => {
      mockPrisma.arenaSubmission.findUniqueOrThrow.mockResolvedValue({
        userId: "user1",
        challengeId: "ch1",
        reviewScore: null,
      } as never);

      await expect(updateEloAfterScoring("sub1")).rejects.toThrow(
        "Submission has no review score",
      );
    });

    it("handles win against peers with lower scores", async () => {
      mockPrisma.arenaSubmission.findUniqueOrThrow.mockResolvedValue({
        userId: "user1",
        challengeId: "ch1",
        reviewScore: 0.9,
      } as never);

      mockPrisma.arenaSubmission.findMany.mockResolvedValue([
        { reviewScore: 0.5, userId: "user2" },
        { reviewScore: 0.6, userId: "user3" },
      ] as never);

      mockPrisma.arenaElo.upsert.mockResolvedValue({
        userId: "user1",
        elo: 1200,
        wins: 2,
        losses: 1,
        draws: 0,
        streak: 1,
        bestElo: 1220,
      } as never);

      mockPrisma.arenaElo.findMany.mockResolvedValue([
        { elo: 1180 },
        { elo: 1220 },
      ] as never);

      mockPrisma.arenaElo.update.mockResolvedValue({} as never);
      mockPrisma.arenaSubmission.update.mockResolvedValue({} as never);

      const result = await updateEloAfterScoring("sub1");

      expect(result.eloChange).toBeGreaterThan(0);
    });
  });
});
