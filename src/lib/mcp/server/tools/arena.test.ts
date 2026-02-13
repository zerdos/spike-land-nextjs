import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  arenaChallenge: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  arenaSubmission: {
    create: vi.fn(),
  },
  arenaElo: {
    findMany: vi.fn(),
  },
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

vi.mock("@/lib/arena/arena-generator", () => ({
  arenaGenerateFromPrompt: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/arena/review", () => ({
  submitReview: vi.fn().mockResolvedValue({ reviewId: "rev1", scoringTriggered: false }),
}));

import { registerArenaTools } from "./arena";

// Create a mock registry that captures tool registrations
function createMockRegistry() {
  const tools = new Map<string, { handler: (...args: unknown[]) => unknown; inputSchema: Record<string, unknown> }>();

  return {
    tools,
    register: vi.fn(({ name, handler, inputSchema }) => {
      tools.set(name, { handler, inputSchema });
    }),
  };
}

describe("Arena MCP Tools", () => {
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerArenaTools(registry as unknown as Parameters<typeof registerArenaTools>[0], "user123");
  });

  it("registers 5 arena tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.tools.has("arena_list_challenges")).toBe(true);
    expect(registry.tools.has("arena_get_challenge_details")).toBe(true);
    expect(registry.tools.has("arena_submit_prompt")).toBe(true);
    expect(registry.tools.has("arena_review_submission")).toBe(true);
    expect(registry.tools.has("arena_get_leaderboard")).toBe(true);
  });

  describe("arena_list_challenges", () => {
    it("returns challenges list", async () => {
      mockPrisma.arenaChallenge.findMany.mockResolvedValue([
        {
          id: "ch1",
          title: "Counter App",
          description: "Build a counter",
          category: "basics",
          difficulty: "BEGINNER",
          _count: { submissions: 3 },
        },
      ] as never);

      const handler = registry.tools.get("arena_list_challenges")!.handler;
      const result = await handler({ status: "OPEN", limit: 20 });

      expect(result.content[0].text).toContain("Counter App");
      expect(result.content[0].text).toContain("ch1");
    });

    it("returns empty message when no challenges", async () => {
      mockPrisma.arenaChallenge.findMany.mockResolvedValue([]);

      const handler = registry.tools.get("arena_list_challenges")!.handler;
      const result = await handler({ status: "OPEN", limit: 20 });

      expect(result.content[0].text).toContain("No open challenges");
    });
  });

  describe("arena_get_challenge_details", () => {
    it("returns challenge details with submissions", async () => {
      mockPrisma.arenaChallenge.findUnique.mockResolvedValue({
        id: "ch1",
        title: "Counter App",
        description: "Build a counter",
        category: "basics",
        difficulty: "BEGINNER",
        status: "OPEN",
        createdBy: { name: "Admin" },
        _count: { submissions: 1 },
        submissions: [
          {
            id: "sub1",
            status: "SCORED",
            codespaceUrl: "https://example.com",
            reviewScore: 0.85,
            eloChange: 12,
            iterations: 1,
            createdAt: new Date(),
            user: { name: "Player1" },
            _count: { reviews: 2 },
          },
        ],
      } as never);

      const handler = registry.tools.get("arena_get_challenge_details")!.handler;
      const result = await handler({ challenge_id: "ch1" });

      expect(result.content[0].text).toContain("Counter App");
      expect(result.content[0].text).toContain("Player1");
      expect(result.content[0].text).toContain("85%");
    });

    it("returns error for non-existent challenge", async () => {
      mockPrisma.arenaChallenge.findUnique.mockResolvedValue(null);

      const handler = registry.tools.get("arena_get_challenge_details")!.handler;
      const result = await handler({ challenge_id: "nonexistent" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not found");
    });
  });

  describe("arena_submit_prompt", () => {
    it("creates submission and starts generation", async () => {
      mockPrisma.arenaChallenge.findUnique.mockResolvedValue({
        id: "ch1",
        status: "OPEN",
        title: "Counter App",
      } as never);

      mockPrisma.arenaSubmission.create.mockResolvedValue({
        id: "sub1",
      } as never);

      const handler = registry.tools.get("arena_submit_prompt")!.handler;
      const result = await handler({
        challenge_id: "ch1",
        prompt: "Create a beautiful counter app with animations",
      });

      expect(result.content[0].text).toContain("Submission created");
      expect(result.content[0].text).toContain("sub1");
    });

    it("rejects submission to closed challenge", async () => {
      mockPrisma.arenaChallenge.findUnique.mockResolvedValue({
        id: "ch1",
        status: "CLOSED",
        title: "Old Challenge",
      } as never);

      const handler = registry.tools.get("arena_submit_prompt")!.handler;
      const result = await handler({
        challenge_id: "ch1",
        prompt: "Create something cool",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("closed");
    });
  });

  describe("arena_get_leaderboard", () => {
    it("returns formatted leaderboard", async () => {
      mockPrisma.arenaElo.findMany.mockResolvedValue([
        {
          userId: "u1",
          elo: 1450,
          wins: 10,
          losses: 3,
          draws: 1,
          streak: 5,
          bestElo: 1460,
          user: { name: "TopPlayer" },
        },
      ] as never);

      const handler = registry.tools.get("arena_get_leaderboard")!.handler;
      const result = await handler({ limit: 20 });

      expect(result.content[0].text).toContain("TopPlayer");
      expect(result.content[0].text).toContain("1450");
      expect(result.content[0].text).toContain("10/3/1");
    });

    it("returns empty message when no entries", async () => {
      mockPrisma.arenaElo.findMany.mockResolvedValue([]);

      const handler = registry.tools.get("arena_get_leaderboard")!.handler;
      const result = await handler({ limit: 20 });

      expect(result.content[0].text).toContain("No leaderboard entries");
    });
  });
});
