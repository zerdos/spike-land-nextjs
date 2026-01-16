/**
 * Rule Manager Tests
 *
 * Tests for policy rule CRUD operations.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";

import {
  bulkCreateRules,
  cloneRule,
  createRule,
  deleteRule,
  getGlobalRules,
  getRule,
  getRulesForWorkspace,
  getRulesNeedingVerification,
  getRuleStatistics,
  getWorkspaceRules,
  markRuleVerified,
  toggleRuleActive,
  updateRule,
} from "./rule-manager";
import type { PolicyRuleInput } from "./types";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    policyRule: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

describe("Rule Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createRule", () => {
    it("should create a new rule with all fields", async () => {
      const input: PolicyRuleInput = {
        name: "Test Rule",
        description: "Test description",
        platform: "TWITTER",
        category: "CONTENT_GUIDELINES",
        ruleType: "KEYWORD_MATCH",
        conditions: { keywords: ["test"] },
        severity: "WARNING",
        isBlocking: false,
        isActive: true,
        sourceUrl: "https://example.com/policy",
      };

      const mockResult = {
        id: "rule-1",
        workspaceId: "workspace-1",
        ...input,
        version: 1,
        lastVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.policyRule.create).mockResolvedValue(
        mockResult as never,
      );

      const result = await createRule("workspace-1", input);

      expect(prisma.policyRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: "workspace-1",
          name: "Test Rule",
          description: "Test description",
          platform: "TWITTER",
          category: "CONTENT_GUIDELINES",
          ruleType: "KEYWORD_MATCH",
        }),
      });
      expect(result.name).toBe("Test Rule");
    });

    it("should create a global rule with null workspaceId", async () => {
      const input: PolicyRuleInput = {
        name: "Global Rule",
        description: "Applies to all workspaces",
        category: "PROHIBITED_CONTENT",
        ruleType: "KEYWORD_MATCH",
        conditions: { keywords: ["banned"] },
      };

      const mockResult = {
        id: "rule-global",
        workspaceId: null,
        ...input,
        platform: null,
        severity: "WARNING",
        isBlocking: false,
        isActive: true,
        sourceUrl: null,
        version: 1,
        lastVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.policyRule.create).mockResolvedValue(
        mockResult as never,
      );

      const result = await createRule(null, input);

      expect(prisma.policyRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: null,
        }),
      });
      expect(result.workspaceId).toBeNull();
    });
  });

  describe("updateRule", () => {
    it("should update rule fields and increment version", async () => {
      const mockResult = {
        id: "rule-1",
        workspaceId: "workspace-1",
        name: "Updated Rule",
        description: "Updated description",
        platform: "TWITTER",
        category: "CONTENT_GUIDELINES",
        ruleType: "KEYWORD_MATCH",
        conditions: { keywords: ["updated"] },
        severity: "ERROR",
        isBlocking: true,
        isActive: true,
        sourceUrl: null,
        version: 2,
        lastVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.policyRule.update).mockResolvedValue(
        mockResult as never,
      );

      const result = await updateRule("rule-1", {
        name: "Updated Rule",
        severity: "ERROR",
        isBlocking: true,
      });

      expect(prisma.policyRule.update).toHaveBeenCalledWith({
        where: { id: "rule-1" },
        data: expect.objectContaining({
          name: "Updated Rule",
          severity: "ERROR",
          isBlocking: true,
          version: { increment: 1 },
        }),
      });
      expect(result.version).toBe(2);
    });
  });

  describe("deleteRule", () => {
    it("should delete a rule by ID", async () => {
      const mockResult = {
        id: "rule-1",
        workspaceId: "workspace-1",
        name: "Deleted Rule",
        description: "To be deleted",
        platform: null,
        category: "CONTENT_GUIDELINES",
        ruleType: "KEYWORD_MATCH",
        conditions: {},
        severity: "WARNING",
        isBlocking: false,
        isActive: true,
        sourceUrl: null,
        version: 1,
        lastVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.policyRule.delete).mockResolvedValue(
        mockResult as never,
      );

      const result = await deleteRule("rule-1");

      expect(prisma.policyRule.delete).toHaveBeenCalledWith({
        where: { id: "rule-1" },
      });
      expect(result.id).toBe("rule-1");
    });
  });

  describe("getRule", () => {
    it("should return a rule by ID", async () => {
      const mockRule = {
        id: "rule-1",
        workspaceId: "workspace-1",
        name: "Test Rule",
        description: "Test",
        platform: null,
        category: "CONTENT_GUIDELINES",
        ruleType: "KEYWORD_MATCH",
        conditions: {},
        severity: "WARNING",
        isBlocking: false,
        isActive: true,
        sourceUrl: null,
        version: 1,
        lastVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.policyRule.findUnique).mockResolvedValue(
        mockRule as never,
      );

      const result = await getRule("rule-1");

      expect(prisma.policyRule.findUnique).toHaveBeenCalledWith({
        where: { id: "rule-1" },
      });
      expect(result!.id).toBe("rule-1");
    });

    it("should return null when rule not found", async () => {
      vi.mocked(prisma.policyRule.findUnique).mockResolvedValue(null);

      const result = await getRule("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getRulesForWorkspace", () => {
    it("should return both global and workspace rules", async () => {
      const mockRules = [
        {
          id: "global-1",
          workspaceId: null,
          name: "Global Rule",
          description: "Global",
          platform: null,
          category: "CONTENT_GUIDELINES",
          ruleType: "KEYWORD_MATCH",
          conditions: {},
          severity: "WARNING",
          isBlocking: false,
          isActive: true,
          sourceUrl: null,
          version: 1,
          lastVerifiedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "workspace-1",
          workspaceId: "workspace-1",
          name: "Workspace Rule",
          description: "Workspace specific",
          platform: null,
          category: "AD_COMPLIANCE",
          ruleType: "REGEX_PATTERN",
          conditions: { pattern: "test" },
          severity: "ERROR",
          isBlocking: true,
          isActive: true,
          sourceUrl: null,
          version: 1,
          lastVerifiedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.policyRule.findMany).mockResolvedValue(
        mockRules as never,
      );

      const result = await getRulesForWorkspace("workspace-1");

      expect(prisma.policyRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { workspaceId: null },
              { workspaceId: "workspace-1" },
            ]),
          }),
        }),
      );
      expect(result).toHaveLength(2);
    });

    it("should filter by platform when specified", async () => {
      vi.mocked(prisma.policyRule.findMany).mockResolvedValue([]);

      await getRulesForWorkspace("workspace-1", { platform: "TWITTER" });

      expect(prisma.policyRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ platform: "TWITTER" }),
            ]),
          }),
        }),
      );
    });

    it("should filter by active status when specified", async () => {
      vi.mocked(prisma.policyRule.findMany).mockResolvedValue([]);

      await getRulesForWorkspace("workspace-1", { isActive: true });

      expect(prisma.policyRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });
  });

  describe("getGlobalRules", () => {
    it("should return only global rules", async () => {
      const mockRules = [
        {
          id: "global-1",
          workspaceId: null,
          name: "Global Rule",
        },
      ];

      vi.mocked(prisma.policyRule.findMany).mockResolvedValue(
        mockRules as never,
      );

      const result = await getGlobalRules();

      expect(prisma.policyRule.findMany).toHaveBeenCalledWith({
        where: { workspaceId: null },
        orderBy: expect.any(Array),
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("getWorkspaceRules", () => {
    it("should return only workspace-specific rules", async () => {
      const mockRules = [
        {
          id: "workspace-rule-1",
          workspaceId: "workspace-1",
          name: "Workspace Rule",
        },
      ];

      vi.mocked(prisma.policyRule.findMany).mockResolvedValue(
        mockRules as never,
      );

      const result = await getWorkspaceRules("workspace-1");

      expect(prisma.policyRule.findMany).toHaveBeenCalledWith({
        where: { workspaceId: "workspace-1" },
        orderBy: expect.any(Array),
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("toggleRuleActive", () => {
    it("should toggle rule active status", async () => {
      const mockResult = {
        id: "rule-1",
        isActive: false,
      };

      vi.mocked(prisma.policyRule.update).mockResolvedValue(
        mockResult as never,
      );

      const result = await toggleRuleActive("rule-1", false);

      expect(prisma.policyRule.update).toHaveBeenCalledWith({
        where: { id: "rule-1" },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });
  });

  describe("getRuleStatistics", () => {
    it("should return correct statistics", async () => {
      const mockRules = [
        {
          id: "1",
          workspaceId: null,
          category: "CONTENT_GUIDELINES",
          severity: "WARNING",
          isActive: true,
        },
        {
          id: "2",
          workspaceId: null,
          category: "CONTENT_GUIDELINES",
          severity: "ERROR",
          isActive: true,
        },
        {
          id: "3",
          workspaceId: "workspace-1",
          category: "AD_COMPLIANCE",
          severity: "WARNING",
          isActive: false,
        },
      ];

      vi.mocked(prisma.policyRule.findMany).mockResolvedValue(
        mockRules as never,
      );

      const stats = await getRuleStatistics("workspace-1");

      expect(stats.totalRules).toBe(3);
      expect(stats.activeRules).toBe(2);
      expect(stats.globalRules).toBe(2);
      expect(stats.workspaceRules).toBe(1);
      expect(stats.byCategory["CONTENT_GUIDELINES"]).toBe(2);
      expect(stats.byCategory["AD_COMPLIANCE"]).toBe(1);
      expect(stats.bySeverity["WARNING"]).toBe(2);
      expect(stats.bySeverity["ERROR"]).toBe(1);
    });
  });

  describe("bulkCreateRules", () => {
    it("should create multiple rules at once", async () => {
      const rules: PolicyRuleInput[] = [
        {
          name: "Rule 1",
          description: "First rule",
          category: "CONTENT_GUIDELINES",
          ruleType: "KEYWORD_MATCH",
          conditions: { keywords: ["test1"] },
        },
        {
          name: "Rule 2",
          description: "Second rule",
          platform: "TWITTER",
          category: "CHARACTER_LIMITS",
          ruleType: "CHARACTER_COUNT",
          conditions: { maxLength: 280 },
          severity: "CRITICAL",
          isBlocking: true,
        },
      ];

      vi.mocked(prisma.policyRule.createMany).mockResolvedValue({ count: 2 });

      const count = await bulkCreateRules(rules);

      expect(prisma.policyRule.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            workspaceId: null,
            name: "Rule 1",
            severity: "WARNING",
            isBlocking: false,
            isActive: true,
          }),
          expect.objectContaining({
            workspaceId: null,
            name: "Rule 2",
            platform: "TWITTER",
            severity: "CRITICAL",
            isBlocking: true,
          }),
        ]),
        skipDuplicates: true,
      });
      expect(count).toBe(2);
    });

    it("should handle empty array", async () => {
      vi.mocked(prisma.policyRule.createMany).mockResolvedValue({ count: 0 });

      const count = await bulkCreateRules([]);

      expect(count).toBe(0);
    });
  });

  describe("markRuleVerified", () => {
    it("should update lastVerifiedAt timestamp", async () => {
      const mockResult = {
        id: "rule-1",
        lastVerifiedAt: new Date(),
      };

      vi.mocked(prisma.policyRule.update).mockResolvedValue(
        mockResult as never,
      );

      const result = await markRuleVerified("rule-1");

      expect(prisma.policyRule.update).toHaveBeenCalledWith({
        where: { id: "rule-1" },
        data: { lastVerifiedAt: expect.any(Date) },
      });
      expect(result.lastVerifiedAt).toBeDefined();
    });
  });

  describe("getRulesNeedingVerification", () => {
    it("should return rules not verified in last 30 days", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45);

      const mockRules = [
        {
          id: "rule-1",
          lastVerifiedAt: null,
          isActive: true,
        },
        {
          id: "rule-2",
          lastVerifiedAt: oldDate,
          isActive: true,
        },
      ];

      vi.mocked(prisma.policyRule.findMany).mockResolvedValue(
        mockRules as never,
      );

      const result = await getRulesNeedingVerification();

      expect(prisma.policyRule.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [{ lastVerifiedAt: null }, {
            lastVerifiedAt: { lt: expect.any(Date) },
          }],
        },
        orderBy: { lastVerifiedAt: "asc" },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("cloneRule", () => {
    it("should clone a rule to a workspace", async () => {
      const sourceRule = {
        id: "source-rule",
        workspaceId: null,
        name: "Original Rule",
        description: "Original description",
        platform: "TWITTER",
        category: "CONTENT_GUIDELINES",
        ruleType: "KEYWORD_MATCH",
        conditions: { keywords: ["test"] },
        severity: "WARNING",
        isBlocking: false,
        isActive: true,
        sourceUrl: "https://example.com",
        version: 1,
        lastVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const clonedRule = {
        ...sourceRule,
        id: "cloned-rule",
        workspaceId: "workspace-1",
        name: "Original Rule (Copy)",
      };

      vi.mocked(prisma.policyRule.findUnique).mockResolvedValue(
        sourceRule as never,
      );
      vi.mocked(prisma.policyRule.create).mockResolvedValue(
        clonedRule as never,
      );

      const result = await cloneRule("source-rule", "workspace-1");

      expect(prisma.policyRule.findUnique).toHaveBeenCalledWith({
        where: { id: "source-rule" },
      });
      expect(prisma.policyRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: "workspace-1",
          name: "Original Rule (Copy)",
          description: "Original description",
          isActive: true,
        }),
      });
      expect(result.name).toBe("Original Rule (Copy)");
      expect(result.workspaceId).toBe("workspace-1");
    });

    it("should throw error when source rule not found", async () => {
      vi.mocked(prisma.policyRule.findUnique).mockResolvedValue(null);

      await expect(cloneRule("non-existent", "workspace-1")).rejects.toThrow(
        "Rule not found",
      );
    });
  });
});
