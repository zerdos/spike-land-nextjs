import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  workspace: { findFirst: vi.fn() },
  brandProfile: { findUnique: vi.fn() },
  brandGuardrail: { findMany: vi.fn() },
  contentRewrite: { create: vi.fn() },
  policyRule: { findMany: vi.fn() },
  policyCheck: { create: vi.fn() },
  policyViolation: { findMany: vi.fn(), create: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerBrandBrainTools } from "./brand-brain";

describe("brand-brain tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    mockPrisma.workspace.findFirst.mockResolvedValue({ id: "ws1", slug: "my-ws", name: "My Workspace" });
    registerBrandBrainTools(registry, userId);
  });

  it("should register 6 brand-brain tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(6);
  });

  describe("brand_score_content", () => {
    it("should score content with no violations", async () => {
      mockPrisma.brandProfile.findUnique.mockResolvedValue({
        id: "bp1",
        vocabulary: [
          { term: "spam", type: "BANNED" },
          { term: "innovative", type: "PREFERRED" },
        ],
        guardrails: [],
      });
      const handler = registry.handlers.get("brand_score_content")!;
      const result = await handler({ workspace_slug: "my-ws", content: "Our innovative product is great" });
      expect(getText(result)).toContain("Brand Score: 100/100");
      expect(getText(result)).toContain("**Violations:** 0");
    });

    it("should detect banned terms", async () => {
      mockPrisma.brandProfile.findUnique.mockResolvedValue({
        id: "bp1",
        vocabulary: [
          { term: "spam", type: "BANNED" },
          { term: "cheap", type: "BANNED" },
        ],
        guardrails: [],
      });
      const handler = registry.handlers.get("brand_score_content")!;
      const result = await handler({ workspace_slug: "my-ws", content: "Get this cheap spam offer" });
      expect(getText(result)).toContain("BANNED_TERM");
      expect(getText(result)).toContain("cheap");
      expect(getText(result)).toContain("spam");
      expect(getText(result)).toContain("70/100");
    });

    it("should detect guardrail keyword violations", async () => {
      mockPrisma.brandProfile.findUnique.mockResolvedValue({
        id: "bp1",
        vocabulary: [],
        guardrails: [
          {
            type: "PROHIBITED_TOPIC",
            name: "competitor-block",
            ruleConfig: { keywords: ["competitor-x"] },
            isActive: true,
          },
        ],
      });
      const handler = registry.handlers.get("brand_score_content")!;
      const result = await handler({ workspace_slug: "my-ws", content: "Better than competitor-x" });
      expect(getText(result)).toContain("GUARDRAIL:competitor-block");
      expect(getText(result)).toContain("competitor-x");
    });

    it("should return error when no brand profile", async () => {
      mockPrisma.brandProfile.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("brand_score_content")!;
      const result = await handler({ workspace_slug: "my-ws", content: "Hello" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("brand_rewrite_content", () => {
    it("should create a rewrite job", async () => {
      mockPrisma.brandProfile.findUnique.mockResolvedValue({ id: "bp1" });
      mockPrisma.contentRewrite.create.mockResolvedValue({
        id: "rw1",
        status: "PENDING",
      });
      const handler = registry.handlers.get("brand_rewrite_content")!;
      const result = await handler({
        workspace_slug: "my-ws",
        content: "Original content",
        platform: "TWITTER",
        character_limit: 280,
      });
      expect(getText(result)).toContain("Rewrite Submitted");
      expect(getText(result)).toContain("rw1");
      expect(getText(result)).toContain("PENDING");
      expect(getText(result)).toContain("TWITTER");
      expect(getText(result)).toContain("280");
    });

    it("should use default platform GENERAL", async () => {
      mockPrisma.brandProfile.findUnique.mockResolvedValue({ id: "bp1" });
      mockPrisma.contentRewrite.create.mockResolvedValue({
        id: "rw2",
        status: "PENDING",
      });
      const handler = registry.handlers.get("brand_rewrite_content")!;
      const result = await handler({ workspace_slug: "my-ws", content: "Hello world" });
      expect(getText(result)).toContain("GENERAL");
      expect(mockPrisma.contentRewrite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ platform: "GENERAL" }),
        }),
      );
    });

    it("should return error when no brand profile", async () => {
      mockPrisma.brandProfile.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("brand_rewrite_content")!;
      const result = await handler({ workspace_slug: "my-ws", content: "Hello" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("brand_get_profile", () => {
    it("should return brand profile with stats", async () => {
      mockPrisma.brandProfile.findUnique.mockResolvedValue({
        name: "Acme Brand",
        mission: "Make great things",
        values: "Quality, Innovation",
        toneDescriptors: "Professional, Friendly",
        guardrails: [{ id: "g1" }, { id: "g2" }],
        vocabulary: [
          { type: "BANNED" },
          { type: "BANNED" },
          { type: "PREFERRED" },
        ],
      });
      const handler = registry.handlers.get("brand_get_profile")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("Acme Brand");
      expect(getText(result)).toContain("Make great things");
      expect(getText(result)).toContain("Quality, Innovation");
      expect(getText(result)).toContain("Professional, Friendly");
      expect(getText(result)).toContain("**Guardrails:** 2");
      expect(getText(result)).toContain("**Vocabulary Terms:** 3");
      expect(getText(result)).toContain("Banned: 2");
      expect(getText(result)).toContain("Preferred: 1");
    });

    it("should return error when no brand profile", async () => {
      mockPrisma.brandProfile.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("brand_get_profile")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("brand_check_policy", () => {
    it("should pass when no rules configured", async () => {
      mockPrisma.policyRule.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("brand_check_policy")!;
      const result = await handler({ workspace_slug: "my-ws", content: "Hello world" });
      expect(getText(result)).toContain("PASSED");
      expect(getText(result)).toContain("No active policy rules");
    });

    it("should fail with critical violations", async () => {
      mockPrisma.policyRule.findMany.mockResolvedValue([
        {
          id: "rule1",
          name: "No Profanity",
          ruleType: "KEYWORD_MATCH",
          severity: "CRITICAL",
          isActive: true,
          conditions: { keywords: ["badword"] },
        },
      ]);
      mockPrisma.policyCheck.create.mockResolvedValue({ id: "chk1" });
      mockPrisma.policyViolation.create.mockResolvedValue({});
      const handler = registry.handlers.get("brand_check_policy")!;
      const result = await handler({ workspace_slug: "my-ws", content: "This contains badword" });
      expect(getText(result)).toContain("FAILED");
      expect(getText(result)).toContain("No Profanity");
      expect(getText(result)).toContain("CRITICAL");
      expect(getText(result)).toContain("badword");
    });

    it("should pass with warnings for low severity", async () => {
      mockPrisma.policyRule.findMany.mockResolvedValue([
        {
          id: "rule2",
          name: "Tone Check",
          ruleType: "KEYWORD_MATCH",
          severity: "LOW",
          isActive: true,
          conditions: { keywords: ["maybe"] },
        },
      ]);
      mockPrisma.policyCheck.create.mockResolvedValue({ id: "chk2" });
      mockPrisma.policyViolation.create.mockResolvedValue({});
      const handler = registry.handlers.get("brand_check_policy")!;
      const result = await handler({ workspace_slug: "my-ws", content: "Maybe we could try" });
      expect(getText(result)).toContain("PASSED_WITH_WARNINGS");
      expect(getText(result)).toContain("Tone Check");
    });

    it("should pass when no keywords match", async () => {
      mockPrisma.policyRule.findMany.mockResolvedValue([
        {
          id: "rule3",
          name: "Brand Filter",
          ruleType: "KEYWORD_MATCH",
          severity: "HIGH",
          isActive: true,
          conditions: { keywords: ["forbidden"] },
        },
      ]);
      mockPrisma.policyCheck.create.mockResolvedValue({ id: "chk3" });
      const handler = registry.handlers.get("brand_check_policy")!;
      const result = await handler({ workspace_slug: "my-ws", content: "All good here" });
      expect(getText(result)).toContain("PASSED");
      expect(getText(result)).toContain("**Violations:** 0");
    });
  });

  describe("brand_list_violations", () => {
    it("should list violations with details", async () => {
      mockPrisma.policyViolation.findMany.mockResolvedValue([
        {
          id: "v1",
          severity: "CRITICAL",
          message: "Matched keyword: badword",
          matchedContent: "badword",
          createdAt: new Date("2024-06-01"),
          rule: { name: "No Profanity" },
          check: { contentType: "POST" },
        },
      ]);
      const handler = registry.handlers.get("brand_list_violations")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("Policy Violations");
      expect(getText(result)).toContain("No Profanity");
      expect(getText(result)).toContain("CRITICAL");
      expect(getText(result)).toContain("badword");
      expect(getText(result)).toContain("POST");
    });

    it("should return empty when no violations", async () => {
      mockPrisma.policyViolation.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("brand_list_violations")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("No violations found");
    });

    it("should filter by severity", async () => {
      mockPrisma.policyViolation.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("brand_list_violations")!;
      await handler({ workspace_slug: "my-ws", severity: "HIGH" });
      expect(mockPrisma.policyViolation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ severity: "HIGH" }),
        }),
      );
    });

    it("should respect limit parameter", async () => {
      mockPrisma.policyViolation.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("brand_list_violations")!;
      await handler({ workspace_slug: "my-ws", limit: 5 });
      expect(mockPrisma.policyViolation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe("brand_get_guardrails", () => {
    it("should list active guardrails", async () => {
      mockPrisma.brandProfile.findUnique.mockResolvedValue({ id: "bp1" });
      mockPrisma.brandGuardrail.findMany.mockResolvedValue([
        {
          name: "No Competitor Mentions",
          type: "KEYWORD_BLOCK",
          severity: "HIGH",
          description: "Block competitor brand names",
        },
        {
          name: "Tone Guard",
          type: "SENTIMENT",
          severity: "MEDIUM",
          description: "Maintain positive tone",
        },
      ]);
      const handler = registry.handlers.get("brand_get_guardrails")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("Brand Guardrails");
      expect(getText(result)).toContain("No Competitor Mentions");
      expect(getText(result)).toContain("KEYWORD_BLOCK");
      expect(getText(result)).toContain("HIGH");
      expect(getText(result)).toContain("Tone Guard");
      expect(getText(result)).toContain("SENTIMENT");
    });

    it("should return empty when no guardrails", async () => {
      mockPrisma.brandProfile.findUnique.mockResolvedValue({ id: "bp1" });
      mockPrisma.brandGuardrail.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("brand_get_guardrails")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("No active guardrails found");
    });

    it("should return error when no brand profile", async () => {
      mockPrisma.brandProfile.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("brand_get_guardrails")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });
});
