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

  it("should register 6 ab-testing tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(6);
    expect(registry.handlers.has("abtest_create")).toBe(true);
    expect(registry.handlers.has("abtest_get_results")).toBe(true);
    expect(registry.handlers.has("abtest_declare_winner")).toBe(true);
    expect(registry.handlers.has("abtest_list_active")).toBe(true);
    expect(registry.handlers.has("abtest_check_significance")).toBe(true);
    expect(registry.handlers.has("abtest_assign_variant")).toBe(true);
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
          data: expect.objectContaining({
            description: "Shorter content performs better",
            title: "Hypothesis for test abt-2",
            experimentId: "abt-2",
          }),
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
            impressions: 1000,
            clicks: 100,
            engagements: 20,
          },
          {
            id: "var-2",
            impressions: 1000,
            clicks: 150,
            engagements: 30,
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
        variants: [{ id: "var-1", impressions: 0, clicks: 0, engagements: 0 }],
      });

      const handler = registry.handlers.get("abtest_get_results")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
      });

      expect(getText(result)).toContain("0.00%");
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
          originalPost: { content: "This is a really long post content that should be truncated after fifty characters in the preview" },
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
          originalPost: null,
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
          { id: "var-1", impressions: 1000, clicks: 50 },
          { id: "var-2", impressions: 1000, clicks: 80 },
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
          { id: "var-1", impressions: 0, clicks: 0 },
          { id: "var-2", impressions: 0, clicks: 0 },
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
          { id: "var-1", impressions: 100, clicks: 10 },
        ],
      });

      const handler = registry.handlers.get("abtest_check_significance")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
      });

      expect(getText(result)).toContain("VALIDATION_ERROR");
    });

    it("should return Insufficient data when only variant has 0 impressions", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        variants: [
          { id: "var-1", impressions: 1000, clicks: 50 },
          { id: "var-2", impressions: 0, clicks: 0 },
        ],
      });

      const handler = registry.handlers.get("abtest_check_significance")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
      });

      expect(getText(result)).toContain("Insufficient data");
    });

    it("should return No variance when conversion rates are identical (se=0)", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        variants: [
          { id: "var-1", impressions: 100, clicks: 0 },
          { id: "var-2", impressions: 100, clicks: 0 },
        ],
      });

      const handler = registry.handlers.get("abtest_check_significance")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
      });

      expect(getText(result)).toContain("No variance");
    });

    it("should report 99% confidence for highly significant difference", async () => {
      // Large sample size, big difference => very low p-value => 99%
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        variants: [
          { id: "var-1", impressions: 10000, clicks: 100 },
          { id: "var-2", impressions: 10000, clicks: 500 },
        ],
      });

      const handler = registry.handlers.get("abtest_check_significance")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
      });

      const text = getText(result);
      expect(text).toContain("99%");
      expect(text).toContain("Yes");
    });

    it("should report 95% confidence for moderately significant difference", async () => {
      // Moderate sample + moderate difference => p ~0.01-0.05 => 95%
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        variants: [
          { id: "var-1", impressions: 200, clicks: 20 },
          { id: "var-2", impressions: 200, clicks: 35 },
        ],
      });

      const handler = registry.handlers.get("abtest_check_significance")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
      });

      const text = getText(result);
      expect(text).toContain("95%");
      expect(text).toContain("Yes");
    });

    it("should report 90% confidence for marginally significant difference", async () => {
      // Moderate difference, larger sample => p ~0.05-0.1 => 90%
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        variants: [
          { id: "var-1", impressions: 500, clicks: 50 },
          { id: "var-2", impressions: 500, clicks: 70 },
        ],
      });

      const handler = registry.handlers.get("abtest_check_significance")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
      });

      const text = getText(result);
      expect(text).toContain("90%");
    });

    it("should report Not significant for very small difference", async () => {
      // Tiny difference => high p-value => not significant
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        variants: [
          { id: "var-1", impressions: 100, clicks: 10 },
          { id: "var-2", impressions: 100, clicks: 11 },
        ],
      });

      const handler = registry.handlers.get("abtest_check_significance")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
      });

      const text = getText(result);
      expect(text).toContain("Not significant");
      expect(text).toContain("No");
    });

    it("should handle null impressions and clicks via null coalescing", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        variants: [
          { id: "var-1", impressions: null, clicks: null },
          { id: "var-2", impressions: null, clicks: null },
        ],
      });

      const handler = registry.handlers.get("abtest_check_significance")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
      });

      expect(getText(result)).toContain("Insufficient data");
    });

    it("should handle multiple variants beyond the first pair", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        variants: [
          { id: "control", impressions: 1000, clicks: 50 },
          { id: "var-b", impressions: 1000, clicks: 80 },
          { id: "var-c", impressions: 1000, clicks: 120 },
        ],
      });

      const handler = registry.handlers.get("abtest_check_significance")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
      });

      const text = getText(result);
      expect(text).toContain("control");
      expect(text).toContain("var-b");
      expect(text).toContain("var-c");
    });
  });

  describe("abtest_list_active (additional branches)", () => {
    it("should show short content without ellipsis", async () => {
      mockPrisma.socialPostAbTest.findMany.mockResolvedValue([
        {
          id: "abt-1",
          originalPost: { content: "Short content" },
          _count: { variants: 2 },
          createdAt: new Date("2025-06-01"),
        },
      ]);

      const handler = registry.handlers.get("abtest_list_active")!;
      const result = await handler({ workspace_slug: "test-ws" });

      const text = getText(result);
      expect(text).toContain("Short content");
      expect(text).not.toContain("...");
    });

    it("should show (no content) when originalPost content is falsy", async () => {
      mockPrisma.socialPostAbTest.findMany.mockResolvedValue([
        {
          id: "abt-1",
          originalPost: { content: "" },
          _count: { variants: 1 },
          createdAt: new Date("2025-06-01"),
        },
      ]);

      const handler = registry.handlers.get("abtest_list_active")!;
      const result = await handler({ workspace_slug: "test-ws" });

      expect(getText(result)).toContain("(no content)");
    });
  });

  describe("abtest_assign_variant", () => {
    it("should assign a visitor to a variant", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        variants: [
          { id: "var-1", variationType: "control", createdAt: new Date("2025-01-01") },
          { id: "var-2", variationType: "variant_1", createdAt: new Date("2025-01-02") },
        ],
      });

      const handler = registry.handlers.get("abtest_assign_variant")!;
      const result = await handler({
        test_id: "abt-1",
        visitor_id: "visitor-abc",
      });

      const text = getText(result);
      expect(text).toContain("Variant Assigned");
      expect(text).toContain("abt-1");
      expect(text).toContain("visitor-abc");
      // Should assign to one of the variants
      expect(text).toMatch(/var-1|var-2/);
    });

    it("should return NOT_FOUND for missing test", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("abtest_assign_variant")!;
      const result = await handler({
        test_id: "nonexistent",
        visitor_id: "visitor-1",
      });

      expect(getText(result)).toContain("NOT_FOUND");
    });

    it("should return VALIDATION_ERROR for test with no variants", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        variants: [],
      });

      const handler = registry.handlers.get("abtest_assign_variant")!;
      const result = await handler({
        test_id: "abt-1",
        visitor_id: "visitor-1",
      });

      expect(getText(result)).toContain("VALIDATION_ERROR");
      expect(getText(result)).toContain("No variants configured");
    });

    it("should produce consistent assignments for the same visitor", async () => {
      const variants = [
        { id: "var-1", variationType: "control", createdAt: new Date("2025-01-01") },
        { id: "var-2", variationType: "variant_1", createdAt: new Date("2025-01-02") },
      ];
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        variants,
      });

      const handler = registry.handlers.get("abtest_assign_variant")!;
      const result1 = await handler({ test_id: "abt-1", visitor_id: "same-visitor" });
      const result2 = await handler({ test_id: "abt-1", visitor_id: "same-visitor" });

      expect(getText(result1)).toEqual(getText(result2));
    });
  });

  describe("abtest_create (additional branches)", () => {
    it("should not include hypothesis line in text when not provided", async () => {
      mockPrisma.socialPostAbTest.create.mockResolvedValue({ id: "abt-3" });
      mockPrisma.socialPostAbTestVariant.create
        .mockResolvedValueOnce({ id: "var-a" })
        .mockResolvedValueOnce({ id: "var-b" });

      const handler = registry.handlers.get("abtest_create")!;
      const result = await handler({
        workspace_slug: "test-ws",
        post_id: "post-1",
        variant_contents: ["Content A", "Content B"],
      });

      const text = getText(result);
      expect(text).not.toContain("Hypothesis:");
      expect(text).toContain("**Variants:** 2");
    });
  });

  describe("abtest_get_results (additional branches)", () => {
    it("should handle variant with 0 impressions showing 0.00% CTR", async () => {
      mockPrisma.socialPostAbTest.findFirst.mockResolvedValue({
        id: "abt-1",
        status: "ACTIVE",
        variants: [
          { id: "var-1", impressions: 500, clicks: 50, engagements: 10 },
          { id: "var-2", impressions: 0, clicks: 0, engagements: 0 },
        ],
      });

      const handler = registry.handlers.get("abtest_get_results")!;
      const result = await handler({
        workspace_slug: "test-ws",
        test_id: "abt-1",
      });

      const text = getText(result);
      expect(text).toContain("10.00%");
      expect(text).toContain("0.00%");
    });
  });
});
