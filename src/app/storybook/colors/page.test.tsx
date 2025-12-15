import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock ColorSwatch component
vi.mock("@/components/storybook", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/components/storybook")>();
  return {
    ...original,
    ColorSwatch: ({ name }: { name: string; }) => <div data-testid="color-swatch">{name}</div>,
  };
});

import ColorsPage from "./page";

describe("ColorsPage", () => {
  describe("rendering", () => {
    it("should render the section title", () => {
      render(<ColorsPage />);
      expect(screen.getByText("Color Palette")).toBeInTheDocument();
    });

    it("should render the section description", () => {
      render(<ColorsPage />);
      expect(
        screen.getByText(/brand colors optimized for both light and dark modes/i),
      ).toBeInTheDocument();
    });
  });

  describe("color sections", () => {
    it("should render brand colors card", () => {
      render(<ColorsPage />);
      expect(screen.getByText("Brand Colors")).toBeInTheDocument();
      expect(screen.getByText(/primary brand accent colors/i)).toBeInTheDocument();
    });

    it("should render dark mode palette card", () => {
      render(<ColorsPage />);
      expect(screen.getByText("Dark Mode Palette")).toBeInTheDocument();
      expect(screen.getByText(/colors optimized for dark backgrounds/i)).toBeInTheDocument();
    });

    it("should render light mode palette card", () => {
      render(<ColorsPage />);
      expect(screen.getByText("Light Mode Palette")).toBeInTheDocument();
      expect(screen.getByText(/colors optimized for light backgrounds/i)).toBeInTheDocument();
    });

    it("should render glow effects card", () => {
      render(<ColorsPage />);
      expect(screen.getByText("Glow Effects")).toBeInTheDocument();
      expect(screen.getByText(/cyan glow utilities for emphasis/i)).toBeInTheDocument();
    });
  });

  describe("brand accent display", () => {
    it("should render Pixel Cyan accent", () => {
      render(<ColorsPage />);
      // Multiple occurrences due to color swatches and accent display
      expect(screen.getAllByText("Pixel Cyan").length).toBeGreaterThan(0);
    });

    it("should render Pixel Fuchsia accent", () => {
      render(<ColorsPage />);
      // Multiple occurrences due to color swatches and accent display
      expect(screen.getAllByText("Pixel Fuchsia").length).toBeGreaterThan(0);
    });
  });

  describe("glow effect demos", () => {
    it("should render glow buttons", () => {
      render(<ColorsPage />);
      expect(screen.getByRole("button", { name: /primary button/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /fuchsia button/i })).toBeInTheDocument();
    });

    it("should render glow input", () => {
      render(<ColorsPage />);
      expect(screen.getByPlaceholderText(/text input/i)).toBeInTheDocument();
    });
  });
});
