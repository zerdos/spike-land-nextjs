/**
 * KanbanColumn Tests
 *
 * Tests for the droppable Kanban column component.
 */

import type { AppState } from "@/types/app-factory";
import { DndContext } from "@dnd-kit/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KanbanColumn } from "./KanbanColumn";

// Wrapper component that provides DndContext required by useDroppable
function TestWrapper({ children }: { children: React.ReactNode; }) {
  return <DndContext>{children}</DndContext>;
}

describe("KanbanColumn", () => {
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

  describe("header rendering", () => {
    it("renders column header with phase label", () => {
      render(
        <TestWrapper>
          <KanbanColumn phase="plan" apps={[]} />
        </TestWrapper>,
      );

      expect(screen.getByText("Plan")).toBeInTheDocument();
    });

    it("renders column header with phase emoji", () => {
      render(
        <TestWrapper>
          <KanbanColumn phase="develop" apps={[]} />
        </TestWrapper>,
      );

      expect(screen.getByText("💻")).toBeInTheDocument();
    });

    it("renders count badge with app count", () => {
      const apps = [
        createApp("app-1", "test"),
        createApp("app-2", "test"),
        createApp("app-3", "test"),
      ];

      render(
        <TestWrapper>
          <KanbanColumn phase="test" apps={apps} />
        </TestWrapper>,
      );

      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("renders count badge with 0 when empty", () => {
      render(
        <TestWrapper>
          <KanbanColumn phase="debug" apps={[]} />
        </TestWrapper>,
      );

      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("phase configurations", () => {
    it.each(
      [
        ["plan", "Plan", "📋"],
        ["develop", "Develop", "💻"],
        ["test", "Test", "🧪"],
        ["debug", "Debug", "🔧"],
        ["polish", "Polish", "✨"],
        ["complete", "Complete", "✅"],
      ] as const,
    )("renders %s phase correctly", (phase, label, emoji) => {
      render(
        <TestWrapper>
          <KanbanColumn phase={phase} apps={[]} />
        </TestWrapper>,
      );

      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(emoji)).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows No apps message when empty", () => {
      render(
        <TestWrapper>
          <KanbanColumn phase="plan" apps={[]} />
        </TestWrapper>,
      );

      expect(screen.getByText("No apps")).toBeInTheDocument();
    });
  });

  describe("apps rendering", () => {
    it("renders apps in the column", () => {
      const apps = [
        createApp("my-app-1", "develop"),
        createApp("my-app-2", "develop"),
      ];

      render(
        <TestWrapper>
          <KanbanColumn phase="develop" apps={apps} />
        </TestWrapper>,
      );

      expect(screen.getByText("my-app-1")).toBeInTheDocument();
      expect(screen.getByText("my-app-2")).toBeInTheDocument();
    });

    it("renders app cards with categories", () => {
      const apps = [
        createApp("utility-app", "test"),
      ];
      const firstApp = apps[0];
      if (firstApp) {
        firstApp.category = "productivity";
      }

      render(
        <TestWrapper>
          <KanbanColumn phase="test" apps={apps} />
        </TestWrapper>,
      );

      expect(screen.getByText("utility-app")).toBeInTheDocument();
      expect(screen.getByText("productivity")).toBeInTheDocument();
    });

    it("handles many apps in a column", () => {
      const apps = Array.from({ length: 20 }, (_, i) => createApp(`app-${i}`, "develop"));

      render(
        <TestWrapper>
          <KanbanColumn phase="develop" apps={apps} />
        </TestWrapper>,
      );

      expect(screen.getByText("app-0")).toBeInTheDocument();
      expect(screen.getByText("app-10")).toBeInTheDocument();
      expect(screen.getByText("app-19")).toBeInTheDocument();
      expect(screen.getByText("20")).toBeInTheDocument(); // count badge
    });
  });
});
