import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ButtonsPage from "./page";

describe("ButtonsPage", () => {
  describe("rendering", () => {
    it("should render the section title", () => {
      render(<ButtonsPage />);
      expect(screen.getByText("Buttons")).toBeInTheDocument();
    });

    it("should render the section description", () => {
      render(<ButtonsPage />);
      expect(
        screen.getByText(/interactive button components with various styles/i),
      ).toBeInTheDocument();
    });
  });

  describe("variants section", () => {
    it("should render variants card", () => {
      render(<ButtonsPage />);
      expect(screen.getByText("Variants")).toBeInTheDocument();
      expect(screen.getByText(/different button styles for various contexts/i)).toBeInTheDocument();
    });

    it("should render all button variants", () => {
      render(<ButtonsPage />);
      // Multiple buttons with same text exist due to complete matrix, use getAllBy
      expect(screen.getAllByRole("button", { name: "default" }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: "secondary" }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: "outline" }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: "ghost" }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: "destructive" }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: "link" }).length).toBeGreaterThan(0);
    });
  });

  describe("sizes section", () => {
    it("should render sizes card", () => {
      render(<ButtonsPage />);
      expect(screen.getByText("Sizes")).toBeInTheDocument();
      expect(screen.getByText(/button size options/i)).toBeInTheDocument();
    });
  });

  describe("states section", () => {
    it("should render states card", () => {
      render(<ButtonsPage />);
      expect(screen.getByText("States")).toBeInTheDocument();
      expect(screen.getByText(/button interaction states/i)).toBeInTheDocument();
    });

    it("should render default button", () => {
      render(<ButtonsPage />);
      expect(screen.getByRole("button", { name: "Default" })).toBeInTheDocument();
    });

    it("should render disabled button", () => {
      render(<ButtonsPage />);
      expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
    });
  });

  describe("loading states section", () => {
    it("should render loading states card", () => {
      render(<ButtonsPage />);
      expect(screen.getByText("Loading States")).toBeInTheDocument();
      expect(
        screen.getByText(/buttons with loading indicator for async operations/i),
      ).toBeInTheDocument();
    });
  });

  describe("complete matrix section", () => {
    it("should render complete matrix card", () => {
      render(<ButtonsPage />);
      expect(screen.getByText("Complete Matrix")).toBeInTheDocument();
      expect(screen.getByText(/all variant and size combinations/i)).toBeInTheDocument();
    });

    it("should render a table with variants and sizes", () => {
      render(<ButtonsPage />);
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByText("Variant / Size")).toBeInTheDocument();
    });
  });
});
