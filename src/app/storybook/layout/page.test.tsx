import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LayoutPage from "./page";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("LayoutPage", () => {
  describe("rendering", () => {
    it("should render the section title", () => {
      render(<LayoutPage />);
      expect(screen.getByText("Layout Components")).toBeInTheDocument();
    });

    it("should render the section description", () => {
      render(<LayoutPage />);
      expect(screen.getByText(/components for organizing and displaying content/i))
        .toBeInTheDocument();
    });
  });

  describe("masonry grid section", () => {
    it("should render masonry grid card", () => {
      render(<LayoutPage />);
      expect(screen.getByText("Masonry Grid")).toBeInTheDocument();
      expect(screen.getByText(/css columns-based masonry layout/i)).toBeInTheDocument();
    });

    it("should render masonry items", () => {
      render(<LayoutPage />);
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 6")).toBeInTheDocument();
    });

    it("should render masonry grid uniform card", () => {
      render(<LayoutPage />);
      expect(screen.getByText("Masonry Grid Uniform")).toBeInTheDocument();
    });
  });

  describe("text overlay section", () => {
    it("should render text overlay card", () => {
      render(<LayoutPage />);
      expect(screen.getByText("Text Overlay")).toBeInTheDocument();
      expect(screen.getByText(/position text labels on top of images/i)).toBeInTheDocument();
    });

    it("should render position variants", () => {
      render(<LayoutPage />);
      expect(screen.getByText("Position Variants")).toBeInTheDocument();
      expect(screen.getByText("Enhanced")).toBeInTheDocument();
      expect(screen.getByText("Original")).toBeInTheDocument();
    });

    it("should render all position options", () => {
      render(<LayoutPage />);
      expect(screen.getByText("Top Left")).toBeInTheDocument();
      expect(screen.getByText("Top Right")).toBeInTheDocument();
      expect(screen.getByText("Center")).toBeInTheDocument();
      expect(screen.getByText("Bottom Left")).toBeInTheDocument();
      expect(screen.getByText("Bottom Right")).toBeInTheDocument();
    });
  });

  describe("zoom slider section", () => {
    it("should render zoom slider card", () => {
      render(<LayoutPage />);
      expect(screen.getByText("Zoom Slider")).toBeInTheDocument();
      expect(screen.getByText(/control zoom level for masonry grids/i)).toBeInTheDocument();
    });

    it("should render zoom level buttons", () => {
      render(<LayoutPage />);
      expect(screen.getByText("Smallest")).toBeInTheDocument();
      expect(screen.getByText("Largest")).toBeInTheDocument();
    });
  });
});
