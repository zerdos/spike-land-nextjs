/**
 * KanbanBoard Tests
 *
 * Tests for the main Kanban board component with drag-and-drop.
 */

import type { AppState } from "@/types/app-factory";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KanbanBoard } from "./KanbanBoard";

describe("KanbanBoard", () => {
  const mockOnMoveApp = vi.fn();

  const createApp = (
    name: string,
    phase: AppState["phase"],
    attempts = 0,
  ): AppState => ({
    name,
    category: "utility",
    phase,
    attempts,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  describe("rendering", () => {
    it("renders all 6 phase columns", () => {
      render(<KanbanBoard apps={[]} onMoveApp={mockOnMoveApp} />);

      expect(screen.getByText("Plan")).toBeInTheDocument();
      expect(screen.getByText("Develop")).toBeInTheDocument();
      expect(screen.getByText("Test")).toBeInTheDocument();
      expect(screen.getByText("Debug")).toBeInTheDocument();
      expect(screen.getByText("Polish")).toBeInTheDocument();
      expect(screen.getByText("Complete")).toBeInTheDocument();
    });

    it("renders all phase emojis", () => {
      render(<KanbanBoard apps={[]} onMoveApp={mockOnMoveApp} />);

      expect(screen.getByText("📋")).toBeInTheDocument();
      expect(screen.getByText("💻")).toBeInTheDocument();
      expect(screen.getByText("🧪")).toBeInTheDocument();
      expect(screen.getByText("🔧")).toBeInTheDocument();
      expect(screen.getByText("✨")).toBeInTheDocument();
      expect(screen.getByText("✅")).toBeInTheDocument();
    });
  });

  describe("apps distribution", () => {
    it("displays apps in correct columns", () => {
      const apps = [
        createApp("app-plan", "plan"),
        createApp("app-develop", "develop"),
        createApp("app-test", "test"),
        createApp("app-complete", "complete"),
      ];

      render(<KanbanBoard apps={apps} onMoveApp={mockOnMoveApp} />);

      expect(screen.getByText("app-plan")).toBeInTheDocument();
      expect(screen.getByText("app-develop")).toBeInTheDocument();
      expect(screen.getByText("app-test")).toBeInTheDocument();
      expect(screen.getByText("app-complete")).toBeInTheDocument();
    });

    it("handles multiple apps in the same column", () => {
      const apps = [
        createApp("dev-app-1", "develop"),
        createApp("dev-app-2", "develop"),
        createApp("dev-app-3", "develop"),
      ];

      render(<KanbanBoard apps={apps} onMoveApp={mockOnMoveApp} />);

      expect(screen.getByText("dev-app-1")).toBeInTheDocument();
      expect(screen.getByText("dev-app-2")).toBeInTheDocument();
      expect(screen.getByText("dev-app-3")).toBeInTheDocument();
    });
  });

  describe("empty columns", () => {
    it("shows No apps message for empty columns", () => {
      render(<KanbanBoard apps={[]} onMoveApp={mockOnMoveApp} />);

      const noAppsMessages = screen.getAllByText("No apps");
      expect(noAppsMessages.length).toBe(6); // One for each column
    });

    it("shows No apps for some columns when others have apps", () => {
      const apps = [createApp("only-develop", "develop")];

      render(<KanbanBoard apps={apps} onMoveApp={mockOnMoveApp} />);

      // 5 columns should show "No apps", 1 should have an app
      const noAppsMessages = screen.getAllByText("No apps");
      expect(noAppsMessages.length).toBe(5);
      expect(screen.getByText("only-develop")).toBeInTheDocument();
    });
  });

  describe("column counts", () => {
    it("shows correct count badges on columns", () => {
      const apps = [
        createApp("plan-1", "plan"),
        createApp("plan-2", "plan"),
        createApp("develop-1", "develop"),
      ];

      render(<KanbanBoard apps={apps} onMoveApp={mockOnMoveApp} />);

      // Check that column headers show counts
      // Note: Each column has a Badge showing the count
      const badges = screen.getAllByText("2");
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe("large dataset", () => {
    it("handles many apps efficiently", () => {
      const apps: AppState[] = [];
      const phases: AppState["phase"][] = [
        "plan",
        "develop",
        "test",
        "debug",
        "polish",
        "complete",
      ];

      for (let i = 0; i < 100; i++) {
        const phase = phases[i % 6];
        if (phase) {
          apps.push(createApp(`app-${i}`, phase));
        }
      }

      render(<KanbanBoard apps={apps} onMoveApp={mockOnMoveApp} />);

      // Verify some apps rendered
      expect(screen.getByText("app-0")).toBeInTheDocument();
      expect(screen.getByText("app-50")).toBeInTheDocument();
      expect(screen.getByText("app-99")).toBeInTheDocument();
    });
  });
});
