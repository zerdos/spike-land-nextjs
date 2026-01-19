/**
 * JulesCapacityPanel Tests
 *
 * Tests for the Jules agent capacity panel component.
 */

import type { JulesCapacity, JulesSession } from "@/types/app-factory";
import { THIS_PROJECT_SOURCE } from "@/types/app-factory";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JulesCapacityPanel } from "./JulesCapacityPanel";

describe("JulesCapacityPanel", () => {
  const createSession = (
    id: string,
    title: string,
    state: string,
    source = THIS_PROJECT_SOURCE,
  ): JulesSession => ({
    id,
    title,
    state,
    source,
    url: `https://jules.example.com/${id}`,
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString(),
  });

  const baseCapacity: JulesCapacity = {
    totalSlots: 10,
    freeAgents: 5,
    wipThisProject: 3,
    wipElsewhere: 2,
    activeSessions: [],
  };

  describe("rendering", () => {
    it("renders panel title", () => {
      render(<JulesCapacityPanel capacity={baseCapacity} />);

      expect(screen.getByText("Jules Agent Capacity")).toBeInTheDocument();
    });

    it("renders total slots badge", () => {
      render(<JulesCapacityPanel capacity={baseCapacity} />);

      expect(screen.getByText("10 slots")).toBeInTheDocument();
    });
  });

  describe("capacity display", () => {
    it("shows free agents count", () => {
      render(<JulesCapacityPanel capacity={baseCapacity} />);

      expect(screen.getByText("Free:")).toBeInTheDocument();
      expect(screen.getByText("5 agents")).toBeInTheDocument();
    });

    it("shows this project agents count", () => {
      render(<JulesCapacityPanel capacity={baseCapacity} />);

      expect(screen.getByText("This project:")).toBeInTheDocument();
      expect(screen.getByText("3 agents")).toBeInTheDocument();
    });

    it("shows elsewhere agents count when > 0", () => {
      render(<JulesCapacityPanel capacity={baseCapacity} />);

      expect(screen.getByText("Elsewhere:")).toBeInTheDocument();
      expect(screen.getByText("2 agents")).toBeInTheDocument();
    });

    it("does not show elsewhere section when 0", () => {
      const capacityNoElsewhere: JulesCapacity = {
        ...baseCapacity,
        wipElsewhere: 0,
      };

      render(<JulesCapacityPanel capacity={capacityNoElsewhere} />);

      expect(screen.queryByText("Elsewhere:")).not.toBeInTheDocument();
    });
  });

  describe("singular/plural handling", () => {
    it("shows agent (singular) when count is 1", () => {
      const singleAgentCapacity: JulesCapacity = {
        ...baseCapacity,
        freeAgents: 1,
        wipThisProject: 1,
        wipElsewhere: 1,
      };

      render(<JulesCapacityPanel capacity={singleAgentCapacity} />);

      // "1 agent" appears multiple times (free, this project, elsewhere)
      const singleAgentElements = screen.getAllByText(/1 agent$/);
      expect(singleAgentElements.length).toBeGreaterThan(0);
    });

    it("shows agents (plural) when count is not 1", () => {
      render(<JulesCapacityPanel capacity={baseCapacity} />);

      expect(screen.getByText("5 agents")).toBeInTheDocument();
      expect(screen.getByText("3 agents")).toBeInTheDocument();
    });
  });

  describe("active sessions", () => {
    it("shows No active Jules sessions when empty", () => {
      render(<JulesCapacityPanel capacity={baseCapacity} />);

      expect(screen.getByText("No active Jules sessions")).toBeInTheDocument();
    });

    it("renders active sessions list", () => {
      const capacityWithSessions: JulesCapacity = {
        ...baseCapacity,
        activeSessions: [
          createSession("session-1", "Building todo-app", "IN_PROGRESS"),
          createSession("session-2", "Testing calculator", "PLANNING"),
        ],
      };

      render(<JulesCapacityPanel capacity={capacityWithSessions} />);

      expect(screen.getByText("Active Sessions")).toBeInTheDocument();
      expect(screen.getByText("Building todo-app")).toBeInTheDocument();
      expect(screen.getByText("Testing calculator")).toBeInTheDocument();
    });

    it("shows session state badges", () => {
      const capacityWithSessions: JulesCapacity = {
        ...baseCapacity,
        activeSessions: [
          createSession("session-1", "Session 1", "IN_PROGRESS"),
        ],
      };

      render(<JulesCapacityPanel capacity={capacityWithSessions} />);

      expect(screen.getByText("IN_PROGRESS")).toBeInTheDocument();
    });

    it("renders session links with correct attributes", () => {
      const capacityWithSessions: JulesCapacity = {
        ...baseCapacity,
        activeSessions: [
          createSession("session-1", "Session 1", "PLANNING"),
        ],
      };

      render(<JulesCapacityPanel capacity={capacityWithSessions} />);

      const link = screen.getByRole("link", { name: /Session 1/i });
      expect(link).toHaveAttribute("href", "https://jules.example.com/session-1");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("other projects sessions", () => {
    it("shows count of sessions on other projects", () => {
      const capacityWithOtherSessions: JulesCapacity = {
        ...baseCapacity,
        activeSessions: [
          createSession("session-1", "This project task", "IN_PROGRESS", THIS_PROJECT_SOURCE),
          createSession("session-2", "Other project task", "IN_PROGRESS", "other/project"),
          createSession("session-3", "Another other project", "PLANNING", "another/project"),
        ],
      };

      render(<JulesCapacityPanel capacity={capacityWithOtherSessions} />);

      // Shows "this project" session
      expect(screen.getByText("This project task")).toBeInTheDocument();

      // Shows count of other sessions
      expect(screen.getByText("+ 2 sessions on other projects")).toBeInTheDocument();
    });

    it("shows singular session text for 1 other session", () => {
      const capacityWithOneOtherSession: JulesCapacity = {
        ...baseCapacity,
        activeSessions: [
          createSession("session-1", "This project task", "IN_PROGRESS", THIS_PROJECT_SOURCE),
          createSession("session-2", "Other project task", "IN_PROGRESS", "other/project"),
        ],
      };

      render(<JulesCapacityPanel capacity={capacityWithOneOtherSession} />);

      expect(screen.getByText("+ 1 session on other projects")).toBeInTheDocument();
    });
  });

  describe("zero capacity edge case", () => {
    it("handles zero total slots gracefully", () => {
      const zeroCapacity: JulesCapacity = {
        totalSlots: 0,
        freeAgents: 0,
        wipThisProject: 0,
        wipElsewhere: 0,
        activeSessions: [],
      };

      render(<JulesCapacityPanel capacity={zeroCapacity} />);

      expect(screen.getByText("0 slots")).toBeInTheDocument();
      // "0 agents" appears multiple times (free and this project)
      const zeroAgentsElements = screen.getAllByText("0 agents");
      expect(zeroAgentsElements.length).toBeGreaterThan(0);
    });
  });

  describe("full capacity", () => {
    it("handles fully utilized capacity", () => {
      const fullCapacity: JulesCapacity = {
        totalSlots: 10,
        freeAgents: 0,
        wipThisProject: 7,
        wipElsewhere: 3,
        activeSessions: [],
      };

      render(<JulesCapacityPanel capacity={fullCapacity} />);

      expect(screen.getByText("0 agents")).toBeInTheDocument();
      expect(screen.getByText("7 agents")).toBeInTheDocument();
      expect(screen.getByText("3 agents")).toBeInTheDocument();
    });
  });
});
