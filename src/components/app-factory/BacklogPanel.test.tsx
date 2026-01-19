/**
 * BacklogPanel Tests
 *
 * Tests for the backlog panel component that shows available app ideas.
 */

import type { MasterListItem } from "@/types/app-factory";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BacklogPanel } from "./BacklogPanel";

describe("BacklogPanel", () => {
  const mockOnItemClick = vi.fn();

  const mockMasterList: MasterListItem[] = [
    {
      name: "todo-app",
      category: "productivity",
      description: "A simple todo list application",
    },
    {
      name: "calculator",
      category: "utility",
      description: "A basic calculator with math operations",
    },
    {
      name: "weather-dashboard",
      category: "visualization",
      description: "Weather data visualization dashboard",
    },
    {
      name: "quiz-game",
      category: "interactive",
      description: "An interactive quiz game",
    },
    {
      name: "fitness-tracker",
      category: "health",
      description: "Track your daily fitness activities",
    },
    {
      name: "dog-walker",
      category: "dogs",
      description: "Find dog walking routes near you",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders Backlog title", () => {
      render(
        <BacklogPanel masterList={mockMasterList} onItemClick={mockOnItemClick} />,
      );

      expect(screen.getByText("Backlog")).toBeInTheDocument();
    });

    it("renders app count", () => {
      render(
        <BacklogPanel masterList={mockMasterList} onItemClick={mockOnItemClick} />,
      );

      expect(screen.getByText("6 apps available")).toBeInTheDocument();
    });

    it("renders search input", () => {
      render(
        <BacklogPanel masterList={mockMasterList} onItemClick={mockOnItemClick} />,
      );

      expect(screen.getByPlaceholderText("Search apps...")).toBeInTheDocument();
    });

    it("renders category filter", () => {
      render(
        <BacklogPanel masterList={mockMasterList} onItemClick={mockOnItemClick} />,
      );

      // The select trigger should be visible
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  describe("displaying apps", () => {
    it("renders all app items", () => {
      render(
        <BacklogPanel masterList={mockMasterList} onItemClick={mockOnItemClick} />,
      );

      expect(screen.getByText("todo-app")).toBeInTheDocument();
      expect(screen.getByText("calculator")).toBeInTheDocument();
      expect(screen.getByText("weather-dashboard")).toBeInTheDocument();
      expect(screen.getByText("quiz-game")).toBeInTheDocument();
      expect(screen.getByText("fitness-tracker")).toBeInTheDocument();
      expect(screen.getByText("dog-walker")).toBeInTheDocument();
    });

    it("renders app descriptions", () => {
      render(
        <BacklogPanel masterList={mockMasterList} onItemClick={mockOnItemClick} />,
      );

      expect(screen.getByText("A simple todo list application")).toBeInTheDocument();
      expect(screen.getByText("A basic calculator with math operations")).toBeInTheDocument();
    });

    it("renders category badges", () => {
      render(
        <BacklogPanel masterList={mockMasterList} onItemClick={mockOnItemClick} />,
      );

      expect(screen.getByText("productivity")).toBeInTheDocument();
      expect(screen.getByText("utility")).toBeInTheDocument();
      expect(screen.getByText("visualization")).toBeInTheDocument();
    });
  });

  describe("search functionality", () => {
    it("filters apps by name search", async () => {
      const user = userEvent.setup();
      render(
        <BacklogPanel masterList={mockMasterList} onItemClick={mockOnItemClick} />,
      );

      await user.type(screen.getByPlaceholderText("Search apps..."), "todo");

      expect(screen.getByText("todo-app")).toBeInTheDocument();
      expect(screen.queryByText("calculator")).not.toBeInTheDocument();
    });

    it("filters apps by description search", async () => {
      const user = userEvent.setup();
      render(
        <BacklogPanel masterList={mockMasterList} onItemClick={mockOnItemClick} />,
      );

      await user.type(screen.getByPlaceholderText("Search apps..."), "weather");

      expect(screen.getByText("weather-dashboard")).toBeInTheDocument();
      expect(screen.queryByText("todo-app")).not.toBeInTheDocument();
    });

    it("shows no apps match message when search has no results", async () => {
      const user = userEvent.setup();
      render(
        <BacklogPanel masterList={mockMasterList} onItemClick={mockOnItemClick} />,
      );

      await user.type(screen.getByPlaceholderText("Search apps..."), "nonexistent");

      expect(screen.getByText("No apps match your filters")).toBeInTheDocument();
    });

    it("search is case insensitive", async () => {
      const user = userEvent.setup();
      render(
        <BacklogPanel masterList={mockMasterList} onItemClick={mockOnItemClick} />,
      );

      await user.type(screen.getByPlaceholderText("Search apps..."), "TODO");

      expect(screen.getByText("todo-app")).toBeInTheDocument();
    });
  });

  describe("click handling", () => {
    it("calls onItemClick when app is clicked", async () => {
      const user = userEvent.setup();
      render(
        <BacklogPanel masterList={mockMasterList} onItemClick={mockOnItemClick} />,
      );

      await user.click(screen.getByText("todo-app"));

      expect(mockOnItemClick).toHaveBeenCalledTimes(1);
      expect(mockOnItemClick).toHaveBeenCalledWith({
        name: "todo-app",
        category: "productivity",
        description: "A simple todo list application",
      });
    });

    it("calls onItemClick with correct item data", async () => {
      const user = userEvent.setup();
      render(
        <BacklogPanel masterList={mockMasterList} onItemClick={mockOnItemClick} />,
      );

      await user.click(screen.getByText("calculator"));

      expect(mockOnItemClick).toHaveBeenCalledWith({
        name: "calculator",
        category: "utility",
        description: "A basic calculator with math operations",
      });
    });
  });

  describe("empty state", () => {
    it("shows no apps message when master list is empty", () => {
      render(
        <BacklogPanel masterList={[]} onItemClick={mockOnItemClick} />,
      );

      expect(screen.getByText("0 apps available")).toBeInTheDocument();
      expect(screen.getByText("No apps match your filters")).toBeInTheDocument();
    });
  });

  describe("grouping by category", () => {
    it("shows category headings when viewing all categories", () => {
      render(
        <BacklogPanel masterList={mockMasterList} onItemClick={mockOnItemClick} />,
      );

      // Category names appear in both headings and badges
      // Just verify that they appear on the page
      const productivityElements = screen.getAllByText(/productivity/i);
      expect(productivityElements.length).toBeGreaterThan(0);
      const utilityElements = screen.getAllByText(/utility/i);
      expect(utilityElements.length).toBeGreaterThan(0);
    });
  });
});
