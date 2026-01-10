/**
 * Violation Manager Tests
 *
 * Tests for policy violation management.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";

import {
  cleanupOldChecks,
  getViolation,
  getViolationHistory,
  getViolationsForCheck,
  getViolationStatistics,
  overrideViolation,
  removeOverride,
  violationToSummary,
} from "./violation-manager";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    policyViolation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    policyCheck: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("Violation Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getViolation", () => {
    it("should return a violation with rule and check", async () => {
      const mockViolation = {
        id: "violation-1",
        checkId: "check-1",
        ruleId: "rule-1",
        workspaceId: "workspace-1",
        severity: "ERROR",
        message: "Policy violation detected",
        matchedContent: "bad content",
        matchLocation: { startIndex: 0, endIndex: 11 },
        confidence: 0.9,
        suggestedFix: "Remove the content",
        isOverridden: false,
        overriddenById: null,
        overrideReason: null,
        overriddenAt: null,
        createdAt: new Date(),
        rule: {
          id: "rule-1",
          name: "Test Rule",
          category: "CONTENT_GUIDELINES",
        },
        check: {
          id: "check-1",
          contentType: "POST",
        },
      };

      vi.mocked(prisma.policyViolation.findUnique).mockResolvedValue(mockViolation as never);

      const result = await getViolation("violation-1");

      expect(prisma.policyViolation.findUnique).toHaveBeenCalledWith({
        where: { id: "violation-1" },
        include: { rule: true, check: true },
      });
      expect(result!.id).toBe("violation-1");
    });

    it("should return null when violation not found", async () => {
      vi.mocked(prisma.policyViolation.findUnique).mockResolvedValue(null);

      const result = await getViolation("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getViolationsForCheck", () => {
    it("should return all violations for a check", async () => {
      const mockViolations = [
        {
          id: "v1",
          checkId: "check-1",
          severity: "ERROR",
          rule: { id: "r1", name: "Rule 1" },
        },
        {
          id: "v2",
          checkId: "check-1",
          severity: "WARNING",
          rule: { id: "r2", name: "Rule 2" },
        },
      ];

      vi.mocked(prisma.policyViolation.findMany).mockResolvedValue(mockViolations as never);

      const result = await getViolationsForCheck("check-1");

      expect(prisma.policyViolation.findMany).toHaveBeenCalledWith({
        where: { checkId: "check-1" },
        include: { rule: true },
        orderBy: expect.any(Array),
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("getViolationHistory", () => {
    it("should return paginated violation history", async () => {
      const mockViolations = [
        { id: "v1", severity: "ERROR" },
        { id: "v2", severity: "WARNING" },
      ];

      vi.mocked(prisma.policyViolation.findMany).mockResolvedValue(mockViolations as never);
      vi.mocked(prisma.policyViolation.count).mockResolvedValue(100);

      const result = await getViolationHistory("workspace-1", {
        limit: 50,
        offset: 0,
      });

      expect(result.violations).toHaveLength(2);
      expect(result.total).toBe(100);
    });

    it("should filter by severity", async () => {
      vi.mocked(prisma.policyViolation.findMany).mockResolvedValue([]);
      vi.mocked(prisma.policyViolation.count).mockResolvedValue(0);

      await getViolationHistory("workspace-1", { severity: "CRITICAL" });

      expect(prisma.policyViolation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            severity: "CRITICAL",
          }),
        }),
      );
    });

    it("should filter by date range", async () => {
      vi.mocked(prisma.policyViolation.findMany).mockResolvedValue([]);
      vi.mocked(prisma.policyViolation.count).mockResolvedValue(0);

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      await getViolationHistory("workspace-1", { startDate, endDate });

      expect(prisma.policyViolation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });
  });

  describe("overrideViolation", () => {
    it("should override a violation with reason", async () => {
      const mockResult = {
        id: "violation-1",
        isOverridden: true,
        overriddenById: "user-1",
        overrideReason: "Approved by manager",
        overriddenAt: new Date(),
      };

      vi.mocked(prisma.policyViolation.update).mockResolvedValue(mockResult as never);

      const result = await overrideViolation("violation-1", "user-1", "Approved by manager");

      expect(prisma.policyViolation.update).toHaveBeenCalledWith({
        where: { id: "violation-1" },
        data: {
          isOverridden: true,
          overriddenById: "user-1",
          overrideReason: "Approved by manager",
          overriddenAt: expect.any(Date),
        },
      });
      expect(result.isOverridden).toBe(true);
    });
  });

  describe("removeOverride", () => {
    it("should remove override from a violation", async () => {
      const mockResult = {
        id: "violation-1",
        isOverridden: false,
        overriddenById: null,
        overrideReason: null,
        overriddenAt: null,
      };

      vi.mocked(prisma.policyViolation.update).mockResolvedValue(mockResult as never);

      const result = await removeOverride("violation-1");

      expect(prisma.policyViolation.update).toHaveBeenCalledWith({
        where: { id: "violation-1" },
        data: {
          isOverridden: false,
          overriddenById: null,
          overrideReason: null,
          overriddenAt: null,
        },
      });
      expect(result.isOverridden).toBe(false);
    });
  });

  describe("getViolationStatistics", () => {
    it("should return correct statistics", async () => {
      const mockViolations = [
        {
          id: "v1",
          ruleId: "r1",
          severity: "ERROR",
          isOverridden: false,
          createdAt: new Date("2024-01-15"),
          rule: { name: "Rule 1", category: "CONTENT_GUIDELINES" },
        },
        {
          id: "v2",
          ruleId: "r1",
          severity: "ERROR",
          isOverridden: true,
          createdAt: new Date("2024-01-16"),
          rule: { name: "Rule 1", category: "CONTENT_GUIDELINES" },
        },
        {
          id: "v3",
          ruleId: "r2",
          severity: "WARNING",
          isOverridden: false,
          createdAt: new Date("2024-01-16"),
          rule: { name: "Rule 2", category: "AD_COMPLIANCE" },
        },
      ];

      vi.mocked(prisma.policyViolation.findMany).mockResolvedValue(mockViolations as never);

      const stats = await getViolationStatistics("workspace-1", 30);

      expect(stats.totalViolations).toBe(3);
      expect(stats.overriddenViolations).toBe(1);
      expect(stats.bySeverity["ERROR"]).toBe(2);
      expect(stats.bySeverity["WARNING"]).toBe(1);
      expect(stats.byCategory["CONTENT_GUIDELINES"]).toBe(2);
      expect(stats.byCategory["AD_COMPLIANCE"]).toBe(1);
      expect(stats.byRule).toHaveLength(2);
      expect(stats.byRule[0]!.count).toBe(2); // Rule 1 has more violations
    });
  });

  describe("violationToSummary", () => {
    it("should convert violation to summary format", () => {
      const violation = {
        id: "v1",
        checkId: "check-1",
        ruleId: "rule-1",
        workspaceId: "workspace-1",
        severity: "ERROR" as const,
        message: "Policy violation",
        matchedContent: "bad content",
        matchLocation: null,
        confidence: 0.85,
        suggestedFix: "Remove the content",
        isOverridden: false,
        overriddenById: null,
        overrideReason: null,
        overriddenAt: null,
        createdAt: new Date(),
        rule: {
          name: "Test Rule",
          category: "CONTENT_GUIDELINES",
          isBlocking: true,
        },
      };

      const summary = violationToSummary(violation);

      expect(summary).toEqual({
        ruleId: "rule-1",
        ruleName: "Test Rule",
        ruleCategory: "CONTENT_GUIDELINES",
        severity: "ERROR",
        message: "Policy violation",
        matchedContent: "bad content",
        suggestedFix: "Remove the content",
        confidence: 0.85,
        isBlocking: true,
      });
    });

    it("should handle undefined optional fields", () => {
      const violation = {
        id: "v1",
        checkId: "check-1",
        ruleId: "rule-1",
        workspaceId: "workspace-1",
        severity: "WARNING" as const,
        message: "Policy violation",
        matchedContent: null,
        matchLocation: null,
        confidence: null,
        suggestedFix: null,
        isOverridden: false,
        overriddenById: null,
        overrideReason: null,
        overriddenAt: null,
        createdAt: new Date(),
        rule: {
          name: "Test Rule",
          category: "CONTENT_GUIDELINES",
          isBlocking: false,
        },
      };

      const summary = violationToSummary(violation);

      expect(summary.matchedContent).toBeUndefined();
      expect(summary.suggestedFix).toBeUndefined();
      expect(summary.confidence).toBeUndefined();
      expect(summary.isBlocking).toBe(false);
    });
  });

  describe("cleanupOldChecks", () => {
    it("should delete checks older than retention period", async () => {
      vi.mocked(prisma.policyCheck.deleteMany).mockResolvedValue({ count: 50 });

      const result = await cleanupOldChecks("workspace-1", 90);

      expect(prisma.policyCheck.deleteMany).toHaveBeenCalledWith({
        where: {
          workspaceId: "workspace-1",
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });
      expect(result).toBe(50);
    });
  });
});
