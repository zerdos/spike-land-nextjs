/**
 * Ralph Local Types Tests
 * Basic tests to ensure type definitions are correct
 */

import { describe, expect, it } from "vitest";
import type {
  AgentMarker,
  AgentRole,
  AgentStatus,
  CodeWork,
  LocalAgent,
  OrchestratorState,
  Plan,
  RalphLocalConfig,
} from "../types";

describe("Ralph Local Types", () => {
  describe("AgentRole", () => {
    it("should accept valid roles", () => {
      const roles: AgentRole[] = ["planning", "developer", "tester"];
      expect(roles).toHaveLength(3);
    });
  });

  describe("AgentStatus", () => {
    it("should accept valid statuses", () => {
      const statuses: AgentStatus[] = [
        "idle",
        "starting",
        "running",
        "completed",
        "failed",
        "stale",
      ];
      expect(statuses).toHaveLength(6);
    });
  });

  describe("LocalAgent", () => {
    it("should have correct structure", () => {
      const agent: LocalAgent = {
        id: "planning-1",
        role: "planning",
        pid: null,
        status: "idle",
        ticketId: null,
        worktree: null,
        outputFile: "/tmp/ralph-output/planning-1.json",
        pidFile: "/tmp/ralph-pids/planning-1.pid",
        startedAt: null,
        lastHeartbeat: null,
        retries: 0,
      };

      expect(agent.id).toBe("planning-1");
      expect(agent.role).toBe("planning");
      expect(agent.status).toBe("idle");
    });
  });

  describe("Plan", () => {
    it("should have correct structure", () => {
      const plan: Plan = {
        ticketId: "#123",
        issueNumber: 123,
        title: "Test issue",
        planPath: "/tmp/ralph-plans/123.md",
        createdAt: new Date().toISOString(),
        createdBy: "planning-1",
        status: "pending",
        assignedTo: null,
      };

      expect(plan.ticketId).toBe("#123");
      expect(plan.status).toBe("pending");
    });
  });

  describe("CodeWork", () => {
    it("should have correct structure", () => {
      const code: CodeWork = {
        ticketId: "#123",
        issueNumber: 123,
        branch: "ralph/123",
        worktree: "/worktrees/123",
        planPath: "/tmp/ralph-plans/123.md",
        createdAt: new Date().toISOString(),
        createdBy: "developer-1",
        status: "pending",
        assignedTo: null,
        prUrl: null,
        prNumber: null,
      };

      expect(code.branch).toBe("ralph/123");
      expect(code.status).toBe("pending");
    });
  });

  describe("RalphLocalConfig", () => {
    it("should have correct structure", () => {
      const config: RalphLocalConfig = {
        active: true,
        poolSizes: {
          planning: 8,
          developer: 4,
          tester: 4,
        },
        syncIntervalMs: 120000,
        staleThresholdMs: 1800000,
        maxRetries: 2,
        autoMerge: true,
        repo: "zerdos/spike-land-nextjs",
        workDir: "/app",
        outputDir: "/tmp/ralph-output",
        pidDir: "/tmp/ralph-pids",
        planDir: "/tmp/ralph-plans",
        worktreeBase: "/worktrees",
      };

      expect(config.poolSizes.planning).toBe(8);
      expect(config.poolSizes.developer).toBe(4);
      expect(config.poolSizes.tester).toBe(4);
    });
  });

  describe("AgentMarker", () => {
    it("should support PLAN_READY marker", () => {
      const marker: AgentMarker = {
        type: "PLAN_READY",
        ticketId: "#123",
        path: "/tmp/ralph-plans/123.md",
      };
      expect(marker.type).toBe("PLAN_READY");
    });

    it("should support CODE_READY marker", () => {
      const marker: AgentMarker = {
        type: "CODE_READY",
        ticketId: "#123",
        branch: "ralph/123",
      };
      expect(marker.type).toBe("CODE_READY");
    });

    it("should support PR_CREATED marker", () => {
      const marker: AgentMarker = {
        type: "PR_CREATED",
        ticketId: "#123",
        prUrl: "https://github.com/repo/pull/456",
        prNumber: 456,
      };
      expect(marker.type).toBe("PR_CREATED");
    });

    it("should support BLOCKED marker", () => {
      const marker: AgentMarker = {
        type: "BLOCKED",
        ticketId: "#123",
        reason: "Missing API documentation",
      };
      expect(marker.type).toBe("BLOCKED");
    });

    it("should support ERROR marker", () => {
      const marker: AgentMarker = {
        type: "ERROR",
        ticketId: "#123",
        error: "Build failed",
      };
      expect(marker.type).toBe("ERROR");
    });
  });

  describe("OrchestratorState", () => {
    it("should have correct structure", () => {
      const state: OrchestratorState = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        iteration: 5,
        pools: {
          planning: [],
          developer: [],
          tester: [],
        },
        pendingPlans: [],
        pendingCode: [],
        completedTickets: ["#100", "#101"],
        failedTickets: ["#99"],
        blockedTickets: [],
      };

      expect(state.version).toBe(1);
      expect(state.iteration).toBe(5);
      expect(state.completedTickets).toHaveLength(2);
    });
  });
});
