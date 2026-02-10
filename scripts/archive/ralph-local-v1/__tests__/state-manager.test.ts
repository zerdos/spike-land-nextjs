/**
 * Ralph Local State Manager Tests
 */

import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addBlockedTicket,
  addPendingCode,
  addPendingPlan,
  createInitialState,
  getIdleAgents,
  isTicketDone,
  isTicketInProgress,
  loadState,
  markTicketCompleted,
  markTicketFailed,
  removePendingCode,
  removePendingPlan,
  saveState,
  updateAgent,
} from "../state-manager";
import type { CodeWork, Plan, RalphLocalConfig } from "../types";

describe("Ralph Local State Manager", () => {
  const testDir = "/tmp/ralph-test-state";
  const testConfig: RalphLocalConfig = {
    active: true,
    poolSizes: {
      planning: 2,
      developer: 1,
      tester: 1,
    },
    syncIntervalMs: 60000,
    staleThresholdMs: 1800000,
    maxRetries: 2,
    autoMerge: true,
    repo: "test/repo",
    workDir: testDir,
    outputDir: join(testDir, "output"),
    pidDir: join(testDir, "pids"),
    planDir: join(testDir, "plans"),
    worktreeBase: join(testDir, "worktrees"),
  };

  beforeEach(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("createInitialState", () => {
    it("should create state with correct pool sizes", () => {
      const state = createInitialState(testConfig);

      expect(state.pools.planning).toHaveLength(2);
      expect(state.pools.developer).toHaveLength(1);
      expect(state.pools.tester).toHaveLength(1);
    });

    it("should create agents with correct IDs", () => {
      const state = createInitialState(testConfig);

      expect(state.pools.planning[0]?.id).toBe("planning-1");
      expect(state.pools.planning[1]?.id).toBe("planning-2");
      expect(state.pools.developer[0]?.id).toBe("developer-1");
      expect(state.pools.tester[0]?.id).toBe("tester-1");
    });

    it("should create agents in idle status", () => {
      const state = createInitialState(testConfig);

      for (const pool of [state.pools.planning, state.pools.developer, state.pools.tester]) {
        for (const agent of pool) {
          expect(agent.status).toBe("idle");
        }
      }
    });
  });

  describe("loadState and saveState", () => {
    it("should create initial state if none exists", () => {
      const state = loadState(testConfig);

      expect(state.version).toBe(1);
      expect(state.iteration).toBe(0);
    });

    it("should persist and load state correctly", () => {
      const state = createInitialState(testConfig);
      state.iteration = 10;
      state.completedTickets = ["#123", "#456"];

      saveState(state, testConfig);

      const loaded = loadState(testConfig);
      expect(loaded.iteration).toBe(10);
      expect(loaded.completedTickets).toEqual(["#123", "#456"]);
    });
  });

  describe("updateAgent", () => {
    it("should update agent properties", () => {
      const state = createInitialState(testConfig);

      updateAgent(state, "planning-1", {
        status: "running",
        ticketId: "#123",
        pid: 12345,
      });

      const agent = state.pools.planning[0];
      expect(agent?.status).toBe("running");
      expect(agent?.ticketId).toBe("#123");
      expect(agent?.pid).toBe(12345);
    });
  });

  describe("getIdleAgents", () => {
    it("should return only idle agents", () => {
      const state = createInitialState(testConfig);
      updateAgent(state, "planning-1", { status: "running" });

      const idle = getIdleAgents(state, "planning");
      expect(idle).toHaveLength(1);
      expect(idle[0]?.id).toBe("planning-2");
    });
  });

  describe("pendingPlans", () => {
    it("should add and remove pending plans", () => {
      const state = createInitialState(testConfig);
      const plan: Plan = {
        ticketId: "#123",
        issueNumber: 123,
        title: "Test",
        planPath: "/tmp/test.md",
        createdAt: new Date().toISOString(),
        createdBy: "planning-1",
        status: "pending",
        assignedTo: null,
      };

      addPendingPlan(state, plan);
      expect(state.pendingPlans).toHaveLength(1);

      const removed = removePendingPlan(state, "#123");
      expect(removed).toEqual(plan);
      expect(state.pendingPlans).toHaveLength(0);
    });
  });

  describe("pendingCode", () => {
    it("should add and remove pending code", () => {
      const state = createInitialState(testConfig);
      const code: CodeWork = {
        ticketId: "#123",
        issueNumber: 123,
        branch: "ralph/123",
        worktree: "/tmp/wt",
        planPath: "/tmp/plan.md",
        createdAt: new Date().toISOString(),
        createdBy: "developer-1",
        status: "pending",
        assignedTo: null,
        prUrl: null,
        prNumber: null,
      };

      addPendingCode(state, code);
      expect(state.pendingCode).toHaveLength(1);

      const removed = removePendingCode(state, "#123");
      expect(removed).toEqual(code);
      expect(state.pendingCode).toHaveLength(0);
    });
  });

  describe("ticket status tracking", () => {
    it("should mark tickets as completed", () => {
      const state = createInitialState(testConfig);

      markTicketCompleted(state, "#123");
      expect(state.completedTickets).toContain("#123");
    });

    it("should mark tickets as failed", () => {
      const state = createInitialState(testConfig);

      markTicketFailed(state, "#123");
      expect(state.failedTickets).toContain("#123");
    });

    it("should check if ticket is done", () => {
      const state = createInitialState(testConfig);
      markTicketCompleted(state, "#123");

      expect(isTicketDone(state, "#123")).toBe(true);
      expect(isTicketDone(state, "#456")).toBe(false);
    });

    it("should check if ticket is in progress", () => {
      const state = createInitialState(testConfig);

      // Not in progress initially
      expect(isTicketInProgress(state, "#123")).toBe(false);

      // In progress when agent is working on it
      updateAgent(state, "planning-1", {
        status: "running",
        ticketId: "#123",
      });
      expect(isTicketInProgress(state, "#123")).toBe(true);
    });
  });

  describe("blocked tickets", () => {
    it("should add blocked tickets", () => {
      const state = createInitialState(testConfig);

      addBlockedTicket(state, {
        ticketId: "#123",
        reason: "Test reason",
        blockedAt: new Date().toISOString(),
        retries: 0,
        lastAttemptBy: "planning-1",
      });

      expect(state.blockedTickets).toHaveLength(1);
      expect(state.blockedTickets[0]?.ticketId).toBe("#123");
    });

    it("should update existing blocked ticket", () => {
      const state = createInitialState(testConfig);

      addBlockedTicket(state, {
        ticketId: "#123",
        reason: "First reason",
        blockedAt: new Date().toISOString(),
        retries: 0,
        lastAttemptBy: "planning-1",
      });

      addBlockedTicket(state, {
        ticketId: "#123",
        reason: "Second reason",
        blockedAt: new Date().toISOString(),
        retries: 1,
        lastAttemptBy: "planning-2",
      });

      expect(state.blockedTickets).toHaveLength(1);
      expect(state.blockedTickets[0]?.reason).toBe("Second reason");
      expect(state.blockedTickets[0]?.retries).toBe(1);
    });
  });
});
