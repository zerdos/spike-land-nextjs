import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetRulesForWorkspace = vi.hoisted(() => vi.fn());
const mockCreateRule = vi.hoisted(() => vi.fn());
const mockCheckContent = vi.hoisted(() => vi.fn());
const mockResolveWorkspace = vi.hoisted(() => vi.fn());

vi.mock("@/lib/policy-checker", () => ({
  createRule: mockCreateRule,
  getRulesForWorkspace: mockGetRulesForWorkspace,
  checkContent: mockCheckContent,
}));
vi.mock("./tool-helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./tool-helpers")>();
  return {
    ...actual,
    resolveWorkspace: mockResolveWorkspace,
  };
});
vi.mock("@/lib/prisma", () => ({
  default: { toolInvocation: { create: vi.fn().mockResolvedValue({}) } },
}));
vi.mock("@/lib/logger", () => ({ default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerPolicyTools } from "./policy";

describe("policy tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    mockResolveWorkspace.mockResolvedValue({ id: "ws-1", slug: "test-ws", name: "Test WS", subscriptionTier: "PRO" });
    registerPolicyTools(registry, userId);
  });

  it("should register 3 tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(3);
  });

  describe("policy_list_rules", () => {
    it("should list rules for workspace", async () => {
      mockGetRulesForWorkspace.mockResolvedValue([
        { id: "r1", name: "Rule 1", category: "BRAND", severity: "HIGH", isBlocking: true, description: "Test rule" },
      ]);

      const handler = registry.handlers.get("policy_list_rules")!;
      const result = await handler({ workspace_slug: "test-ws" });

      expect(getText(result)).toContain("Rule 1");
    });

    it("should handle no rules found", async () => {
      mockGetRulesForWorkspace.mockResolvedValue([]);

      const handler = registry.handlers.get("policy_list_rules")!;
      const result = await handler({ workspace_slug: "test-ws" });

      expect(getText(result)).toContain("No policy rules found");
    });
  });

  describe("policy_create_rule", () => {
    it("should create a rule with record conditions (not z.any())", async () => {
      mockCreateRule.mockResolvedValue({ id: "r-new", name: "New Rule" });

      const handler = registry.handlers.get("policy_create_rule")!;
      const result = await handler({
        workspace_slug: "test-ws",
        name: "New Rule",
        description: "A test rule",
        category: "BRAND",
        ruleType: "KEYWORD",
        conditions: { keywords: ["test"] },
        severity: "MEDIUM",
        isBlocking: false,
        isActive: true,
      });

      expect(getText(result)).toContain("New Rule");
      expect(mockCreateRule).toHaveBeenCalled();
    });
  });

  describe("policy_check_content", () => {
    it("should return compliant when no violations", async () => {
      mockCheckContent.mockResolvedValue({ canPublish: true, violations: [] });

      const handler = registry.handlers.get("policy_check_content")!;
      const result = await handler({
        workspace_slug: "test-ws",
        content: "Hello world",
      });

      expect(getText(result)).toContain("compliant");
    });

    it("should return violations when content fails policy", async () => {
      mockCheckContent.mockResolvedValue({
        canPublish: false,
        violations: [
          { ruleName: "No Profanity", severity: "HIGH", message: "Contains bad word", isBlocking: true },
        ],
      });

      const handler = registry.handlers.get("policy_check_content")!;
      const result = await handler({
        workspace_slug: "test-ws",
        content: "bad content",
        metadata: { source: "test" },
      });

      expect(getText(result)).toContain("Violations");
      expect(getText(result)).toContain("No Profanity");
    });
  });
});
