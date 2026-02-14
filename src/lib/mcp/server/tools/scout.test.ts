import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  workspace: { findFirst: vi.fn() },
  scoutCompetitor: { findMany: vi.fn(), create: vi.fn() },
  scoutBenchmark: { findMany: vi.fn() },
  scoutTopic: { findMany: vi.fn() },
  scoutResult: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerScoutTools } from "./scout";

const WORKSPACE = { id: "ws-1", slug: "acme", name: "Acme" };
const userId = "user-1";

describe("scout tools", () => {
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerScoutTools(registry, userId);
    mockPrisma.workspace.findFirst.mockResolvedValue(WORKSPACE);
  });

  it("should register 5 scout tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.handlers.has("scout_list_competitors")).toBe(true);
    expect(registry.handlers.has("scout_add_competitor")).toBe(true);
    expect(registry.handlers.has("scout_get_benchmark")).toBe(true);
    expect(registry.handlers.has("scout_list_topics")).toBe(true);
    expect(registry.handlers.has("scout_get_insights")).toBe(true);
  });

  describe("scout_list_competitors", () => {
    it("should list competitors", async () => {
      mockPrisma.scoutCompetitor.findMany.mockResolvedValue([
        {
          id: "c-1",
          name: "Rival Co",
          platform: "INSTAGRAM",
          handle: "rivalco",
          followerCount: 50000,
          isActive: true,
          lastScrapedAt: new Date("2025-06-01"),
        },
      ]);
      const handler = registry.handlers.get("scout_list_competitors")!;
      const result = await handler({ workspace_slug: "acme" });
      const text = getText(result);
      expect(text).toContain("Competitors");
      expect(text).toContain("Rival Co");
      expect(text).toContain("INSTAGRAM");
      expect(text).toContain("@rivalco");
      expect(text).toContain("50,000");
    });

    it("should show empty message when no competitors", async () => {
      mockPrisma.scoutCompetitor.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("scout_list_competitors")!;
      const result = await handler({ workspace_slug: "acme" });
      expect(getText(result)).toContain("No competitors tracked yet");
    });
  });

  describe("scout_add_competitor", () => {
    it("should create a competitor", async () => {
      mockPrisma.scoutCompetitor.create.mockResolvedValue({
        id: "c-new",
        name: "New Rival",
        platform: "TWITTER",
        handle: "newrival",
      });
      const handler = registry.handlers.get("scout_add_competitor")!;
      const result = await handler({
        workspace_slug: "acme",
        name: "New Rival",
        platform: "TWITTER",
        handle: "newrival",
      });
      const text = getText(result);
      expect(text).toContain("Competitor Added");
      expect(text).toContain("New Rival");
      expect(text).toContain("TWITTER");
      expect(text).toContain("@newrival");
      expect(text).toContain("c-new");
      expect(mockPrisma.scoutCompetitor.create).toHaveBeenCalledWith({
        data: {
          workspaceId: "ws-1",
          name: "New Rival",
          platform: "TWITTER",
          handle: "newrival",
        },
      });
    });
  });

  describe("scout_get_benchmark", () => {
    it("should return benchmark table", async () => {
      mockPrisma.scoutBenchmark.findMany.mockResolvedValue([
        {
          metric: "Engagement Rate",
          yourValue: "3.2%",
          competitorValue: "2.1%",
          difference: "+1.1%",
          createdAt: new Date("2025-06-01"),
        },
      ]);
      const handler = registry.handlers.get("scout_get_benchmark")!;
      const result = await handler({ workspace_slug: "acme" });
      const text = getText(result);
      expect(text).toContain("Benchmarks");
      expect(text).toContain("Engagement Rate");
      expect(text).toContain("3.2%");
      expect(text).toContain("2.1%");
      expect(text).toContain("+1.1%");
    });

    it("should filter by competitor_id when provided", async () => {
      mockPrisma.scoutBenchmark.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("scout_get_benchmark")!;
      await handler({ workspace_slug: "acme", competitor_id: "c-1" });
      expect(mockPrisma.scoutBenchmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ competitorId: "c-1" }),
        }),
      );
    });

    it("should show empty message when no benchmarks", async () => {
      mockPrisma.scoutBenchmark.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("scout_get_benchmark")!;
      const result = await handler({ workspace_slug: "acme" });
      expect(getText(result)).toContain("No benchmark data available");
    });
  });

  describe("scout_list_topics", () => {
    it("should list topics by trend score", async () => {
      mockPrisma.scoutTopic.findMany.mockResolvedValue([
        { name: "AI Tools", trendScore: 95, mentionCount: 1200 },
        { name: "Sustainability", trendScore: 82, mentionCount: 800 },
      ]);
      const handler = registry.handlers.get("scout_list_topics")!;
      const result = await handler({ workspace_slug: "acme" });
      const text = getText(result);
      expect(text).toContain("Trending Topics");
      expect(text).toContain("AI Tools");
      expect(text).toContain("95");
      expect(text).toContain("1200");
    });

    it("should respect limit parameter", async () => {
      mockPrisma.scoutTopic.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("scout_list_topics")!;
      await handler({ workspace_slug: "acme", limit: 5 });
      expect(mockPrisma.scoutTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    it("should show empty message when no topics", async () => {
      mockPrisma.scoutTopic.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("scout_list_topics")!;
      const result = await handler({ workspace_slug: "acme" });
      expect(getText(result)).toContain("No topics found");
    });
  });

  describe("scout_get_insights", () => {
    it("should return competitive insights", async () => {
      mockPrisma.scoutResult.findMany.mockResolvedValue([
        {
          type: "content_gap",
          summary: "Competitor posts 3x more video content",
          recommendations: "Increase video production cadence",
          createdAt: new Date("2025-06-01"),
        },
      ]);
      const handler = registry.handlers.get("scout_get_insights")!;
      const result = await handler({ workspace_slug: "acme" });
      const text = getText(result);
      expect(text).toContain("Competitive Insights");
      expect(text).toContain("content_gap");
      expect(text).toContain("3x more video");
      expect(text).toContain("Increase video production");
    });

    it("should filter by competitor_id when provided", async () => {
      mockPrisma.scoutResult.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("scout_get_insights")!;
      await handler({ workspace_slug: "acme", competitor_id: "c-1" });
      expect(mockPrisma.scoutResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ competitorId: "c-1" }),
        }),
      );
    });

    it("should show empty message when no insights", async () => {
      mockPrisma.scoutResult.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("scout_get_insights")!;
      const result = await handler({ workspace_slug: "acme" });
      expect(getText(result)).toContain("No insights available");
    });
  });
});
