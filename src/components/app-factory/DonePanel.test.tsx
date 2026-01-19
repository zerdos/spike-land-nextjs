/**
 * DonePanel Tests
 *
 * Tests for the done panel component showing completed and reviewed apps.
 */

import type { AppState } from "@/types/app-factory";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DonePanel } from "./DonePanel";

describe("DonePanel", () => {
  const createDoneApp = (
    name: string,
    category: string,
  ): AppState => ({
    name,
    category,
    phase: "done",
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const mockDoneApps: AppState[] = [
    createDoneApp("calculator", "utility"),
    createDoneApp("todo-app", "productivity"),
    createDoneApp("weather-dashboard", "visualization"),
    createDoneApp("color-picker", "utility"),
    createDoneApp("timer", "utility"),
  ];

  describe("rendering", () => {
    it("renders Done title", () => {
      render(<DonePanel apps={mockDoneApps} />);

      expect(screen.getByText("Done")).toBeInTheDocument();
    });

    it("renders app count badge", () => {
      render(<DonePanel apps={mockDoneApps} />);

      expect(screen.getByText("5 apps")).toBeInTheDocument();
    });

    it("renders search input", () => {
      render(<DonePanel apps={mockDoneApps} />);

      expect(screen.getByPlaceholderText("Search done apps...")).toBeInTheDocument();
    });
  });

  describe("displaying apps", () => {
    it("renders all done apps", () => {
      render(<DonePanel apps={mockDoneApps} />);

      expect(screen.getByText("calculator")).toBeInTheDocument();
      expect(screen.getByText("todo-app")).toBeInTheDocument();
      expect(screen.getByText("weather-dashboard")).toBeInTheDocument();
      expect(screen.getByText("color-picker")).toBeInTheDocument();
      expect(screen.getByText("timer")).toBeInTheDocument();
    });

    it("renders category headings", () => {
      render(<DonePanel apps={mockDoneApps} />);

      // Categories should be present
      expect(screen.getByText(/utility/i)).toBeInTheDocument();
      expect(screen.getByText(/productivity/i)).toBeInTheDocument();
      expect(screen.getByText(/visualization/i)).toBeInTheDocument();
    });

    it("renders View links for each app", () => {
      render(<DonePanel apps={mockDoneApps} />);

      const viewLinks = screen.getAllByText("View");
      expect(viewLinks).toHaveLength(5);
    });

    it("renders links with correct href", () => {
      render(<DonePanel apps={[createDoneApp("my-test-app", "utility")]} />);

      const link = screen.getByRole("link", { name: /View/i });
      expect(link).toHaveAttribute("href", "https://testing.spike.land/live/my-test-app/index.ts");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("search functionality", () => {
    it("filters apps by name search", async () => {
      const user = userEvent.setup();
      render(<DonePanel apps={mockDoneApps} />);

      await user.type(screen.getByPlaceholderText("Search done apps..."), "calculator");

      expect(screen.getByText("calculator")).toBeInTheDocument();
      expect(screen.queryByText("todo-app")).not.toBeInTheDocument();
    });

    it("filters apps by category search", async () => {
      const user = userEvent.setup();
      render(<DonePanel apps={mockDoneApps} />);

      await user.type(screen.getByPlaceholderText("Search done apps..."), "utility");

      expect(screen.getByText("calculator")).toBeInTheDocument();
      expect(screen.getByText("color-picker")).toBeInTheDocument();
      expect(screen.getByText("timer")).toBeInTheDocument();
      expect(screen.queryByText("todo-app")).not.toBeInTheDocument();
    });

    it("shows no apps match message when search has no results", async () => {
      const user = userEvent.setup();
      render(<DonePanel apps={mockDoneApps} />);

      await user.type(screen.getByPlaceholderText("Search done apps..."), "nonexistent");

      expect(screen.getByText("No apps match your search")).toBeInTheDocument();
    });

    it("search is case insensitive", async () => {
      const user = userEvent.setup();
      render(<DonePanel apps={mockDoneApps} />);

      await user.type(screen.getByPlaceholderText("Search done apps..."), "CALCULATOR");

      expect(screen.getByText("calculator")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows no apps message when empty", () => {
      render(<DonePanel apps={[]} />);

      expect(screen.getByText("No apps completed yet")).toBeInTheDocument();
      expect(screen.getByText("0 apps")).toBeInTheDocument();
    });
  });

  describe("grouping by category", () => {
    it("groups apps by category", () => {
      render(<DonePanel apps={mockDoneApps} />);

      // utility has 3 apps
      const utilityCount = screen.getByText(/utility \(3\)/i);
      expect(utilityCount).toBeInTheDocument();
    });

    it("sorts categories alphabetically", () => {
      render(<DonePanel apps={mockDoneApps} />);

      const headings = screen.getAllByRole("heading", { level: 3 });
      const categoryNames = headings.map((h) => h.textContent?.toLowerCase() || "");

      // Check alphabetical order
      for (let i = 0; i < categoryNames.length - 1; i++) {
        const current = categoryNames[i];
        const next = categoryNames[i + 1];
        if (current && next) {
          expect(current.localeCompare(next)).toBeLessThanOrEqual(0);
        }
      }
    });
  });
});
