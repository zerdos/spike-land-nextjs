import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock ColorSwatch component
vi.mock("@/components/storybook", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/components/storybook")
  >();
  return {
    ...original,
    ColorSwatch: ({ name }: { name: string; }) => <div data-testid="color-swatch">{name}</div>,
  };
});

import ColorsPage from "./page";

describe("ColorsPage", () => {
  describe("rendering", () => {
    it("should render the main title", () => {
      render(<ColorsPage />);
      expect(screen.getByText("Color System")).toBeInTheDocument();
    });

    it("should render the page description", () => {
      render(<ColorsPage />);
      expect(
        screen.getByText(
          /our color system is built on a foundation of deep space blues/i,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("sections", () => {
    it("should render brand identity section", () => {
      render(<ColorsPage />);
      expect(screen.getByText("Brand Identity")).toBeInTheDocument();
      expect(screen.getByText("SPIKE LAND CORE")).toBeInTheDocument();
    });

    it("should render theme foundations section", () => {
      render(<ColorsPage />);
      expect(screen.getByText("Theme Foundations")).toBeInTheDocument();
      expect(screen.getByText(/Dark Mode \(Deep Space\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Light Mode \(Carbon\)/i)).toBeInTheDocument();
    });

    it("should render optical effects section", () => {
      render(<ColorsPage />);
      expect(screen.getByText("Optical Effects")).toBeInTheDocument();
    });
  });

  describe("swatches", () => {
    it("should render spike.land Cyan swatch", () => {
      render(<ColorsPage />);
      expect(screen.getAllByText("spike.land Cyan").length).toBeGreaterThan(0);
    });

    it("should render spike.land Fuchsia swatch", () => {
      render(<ColorsPage />);
      expect(screen.getAllByText("spike.land Fuchsia").length).toBeGreaterThan(
        0,
      );
    });
  });

  describe("demos", () => {
    it("should render glow buttons", () => {
      render(<ColorsPage />);
      expect(screen.getByRole("button", { name: /action ready/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: /priority focus/i }))
        .toBeInTheDocument();
    });

    it("should render glass elevation tiers", () => {
      render(<ColorsPage />);
      expect(screen.getByText(/tier-0/i)).toBeInTheDocument();
      expect(screen.getByText(/tier-1/i)).toBeInTheDocument();
      expect(screen.getByText(/tier-2/i)).toBeInTheDocument();
    });
  });
});
