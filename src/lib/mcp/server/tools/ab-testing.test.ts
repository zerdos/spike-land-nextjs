import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  workspace: { findFirst: vi.fn() },
  socialPostAbTest: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  socialPostAbTestVariant: { create: vi.fn() },
  hypothesis: { create: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerAbTestingTools } from "./ab-testing";

describe("ab-testing tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerAbTestingTools(registry, userId);
    mockPrisma.workspace.findFirst.mockResolvedValue({
      id: "ws-1", slug: "test-ws", name: "Test Workspace",
    });
  });

  it("should register 5 ab-testing tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.handlers.has("abtest_create")).toBe(true);
    expect(registry.handlers.has("abtest_get_results")).toBe(true);
    expect(registry.handlers.has("abtest_declare_winner")).toBe(true);
    expect(registry.handlers.has("abtest_list_active")).toBe(true);
    expect(registry.handlers.has("abtest_check_significance")).toBe(true);
  });

  describe("abtest_create", () => {
    it("should create an A/B test with variants", async () => {
      mockPrisma.socialPostAbTest.create.mockResolvedValue({ id: "abt-1" });
      mockPrisma.socialPostAbTestVariant.create
        .mockResolvedValueOnce({ id: "var-1" })
        .mockResolvedValueOnce({ id: "var-2" });

      const handler = registry.handlers.get("abtest_create")!;
      const result = await handler({
        workspace_slug: "test-ws",
        post_id: "post-1",
        variant_contents: ["Content A", "Content B"],
      });

      const text = getText(result);
      expect(text).toContain("A/B Test Created");
      expect(text).toContain("abt-1");
      expect(text).toContain("var-1");
      expect(text).toContain("var-2");
      expect(text).toContain("ACTIVE");
      expect(mockPrisma.hypothesis.create).not.toHaveBeenCalled();
    });

    it("should create hypothesis when provided", async () => {
      mockPrisma.socialPostAbTest.create.mockResolvedValue({ id: "abt-2" });
      mockPrisma.socialPostAbTestVariant.create.mockResolvedValue({ id: "var-3" });
      mockPrisma.hypothesis.create.mockResolvedValue({ id: "hyp-1" });

      const handler = registry.handlers.get("abtest_create")!;
      const result = await handler({
        workspace_slug: "test-ws",
        post_id: "post-1",
        variant_contents: ["A", "B"],
        hypothesis: "Shorter content performs better",
      });

      const text = getText(result);
      expect(text).toContain("Shorter content performs better");
      expect(mockPrisma.hypothesis.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ content: "Shorter content performs better" }),
        }),
      );
    });
  });

  describe("abtest_get_results", () => {
    it("should return results with metrics", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        status: "ACTIVE",
        variants: [
          {
            id: "var-1",
            variantIndex: 0,
            metrics: { impressions: 1000, clicks: 100, conversions: 20 },
          },
          {
            id: "var-2",
            variantIndex: 1,
            metrics: { impressions: 1000, clicks: 150, conversions: 30 },
          },
        ],
      });

      const handler = registry.handlers.get("abtest_get_results")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
      });

      const text = getText(result);
      expect(text).toContain("A/B Test Results");
      expect(text).toContain("var-1");
      expect(text).toContain("var-2");
      expect(text).toContain("10.00%"); // CTR for var-1
      expect(text).toContain("15.00%"); // CTR for var-2
    });

    it("should handle variant without metrics", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        status: "ACTIVE",
        variants: [{ id: "var-1", variantIndex: 0, metrics: null }],
      });

      const handler = registry.handlers.get("abtest_get_results")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
      });

      expect(getText(result)).toContain("- | - | - | - | -");
    });

    it("should return NOT_FOUND for missing test", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("abtest_get_results")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "nonexistent",
      });

      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("abtest_declare_winner", () => {
    it("should declare winner and complete test", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        status: "ACTIVE",
      });
      mockPrisma.socialPostAbTest.update.mockResolvedValue({
        id: "abt-1",
        status: "COMPLETED",
        winnerVariantId: "var-1",
      });

      const handler = registry.handlers.get("abtest_declare_winner")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
        winning_variant_id: "var-1",
      });

      const text = getText(result);
      expect(text).toContain("Winner Declared");
      expect(text).toContain("var-1");
      expect(text).toContain("COMPLETED");
      expect(mockPrisma.socialPostAbTest.update).toHaveBeenCalledWith({
        where: { id: "abt-1" },
        data: { status: "COMPLETED", winnerVariantId: "var-1" },
      });
    });

    it("should return NOT_FOUND for missing test", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("abtest_declare_winner")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "nonexistent",
        winning_variant_id: "var-1",
      });

      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("abtest_list_active", () => {
    it("should list active tests with post previews", async () => {
      mockPrisma.socialPostAbTest.findMany.mockResolvedValue([
        {
          id: "abt-1",
          post: { content: "This is a really long post content that should be truncated after fifty characters in the preview" },
          _count: { variants: 3 },
          createdAt: new Date("2025-06-01"),
        },
      ]);

      const handler = registry.handlers.get("abtest_list_active")!;
      const result = await handler({ workspace_slug: "test-ws" });

      const text = getText(result);
      expect(text).toContain("Active A/B Tests");
      expect(text).toContain("abt-1");
      expect(text).toContain("3");
      expect(text).toContain("...");
    });

    it("should show '(no content)' when post has no content", async () => {
      mockPrisma.socialPostAbTest.findMany.mockResolvedValue([
        {
          id: "abt-1",
          post: null,
          _count: { variants: 2 },
          createdAt: new Date("2025-06-01"),
        },
      ]);

      const handler = registry.handlers.get("abtest_list_active")!;
      const result = await handler({ workspace_slug: "test-ws" });

      expect(getText(result)).toContain("(no content)");
    });

    it("should return empty message when no active tests", async () => {
      mockPrisma.socialPostAbTest.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("abtest_list_active")!;
      const result = await handler({ workspace_slug: "test-ws" });

      expect(getText(result)).toContain("No active tests found");
    });
  });

  describe("abtest_check_significance", () => {
    it("should calculate significance between control and variants", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        variants: [
          { id: "var-1", variantIndex: 0, metrics: { impressions: 1000, conversions: 50 } },
          { id: "var-2", variantIndex: 1, metrics: { impressions: 1000, conversions: 80 } },
        ],
      });

      const handler = registry.handlers.get("abtest_check_significance")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
      });

      const text = getText(result);
      expect(text).toContain("Statistical Significance");
      expect(text).toContain("var-1"); // control
      expect(text).toContain("var-2");
    });

    it("should handle insufficient data", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        variants: [
          { id: "var-1", variantIndex: 0, metrics: null },
          { id: "var-2", variantIndex: 1, metrics: { impressions: 0, conversions: 0 } },
        ],
      });

      const handler = registry.handlers.get("abtest_check_significance")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
      });

      expect(getText(result)).toContain("Insufficient data");
    });

    it("should return NOT_FOUND for missing test", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("abtest_check_significance")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "nonexistent",
      });

      expect(getText(result)).toContain("NOT_FOUND");
    });

    it("should return error for fewer than 2 variants", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        variants: [
          { id: "var-1", variantIndex: 0, metrics: { impressions: 100, conversions: 10 } },
        ],
      });

      const handler = registry.handlers.get("abtest_check_significance")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
      });

      expect(getText(result)).toContain("VALIDATION_ERROR");
    });
  });
});
