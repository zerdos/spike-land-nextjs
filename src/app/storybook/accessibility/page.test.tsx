import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock ContrastCheckerDemo component
vi.mock("@/components/storybook", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/components/storybook")>();
  return {
    ...original,
    ContrastCheckerDemo: () => <div data-testid="contrast-checker-demo">ContrastCheckerDemo</div>,
  };
});

import AccessibilityPage from "./page";

describe("AccessibilityPage", () => {
  describe("rendering", () => {
    it("should render the section title", () => {
      render(<AccessibilityPage />);
      expect(screen.getByText("Accessibility Tools")).toBeInTheDocument();
    });

    it("should render the section description", () => {
      render(<AccessibilityPage />);
      expect(
        screen.getByText(/tools and guidelines for ensuring accessible components/i),
      ).toBeInTheDocument();
    });
  });

  describe("contrast checker section", () => {
    it("should render color contrast checker card", () => {
      render(<AccessibilityPage />);
      expect(screen.getByText("Color Contrast Checker")).toBeInTheDocument();
      expect(screen.getByText(/test color combinations against wcag 2\.1 guidelines/i))
        .toBeInTheDocument();
    });

    it("should render ContrastCheckerDemo component", () => {
      render(<AccessibilityPage />);
      expect(screen.getByTestId("contrast-checker-demo")).toBeInTheDocument();
    });
  });

  describe("keyboard navigation section", () => {
    it("should render keyboard navigation card", () => {
      render(<AccessibilityPage />);
      expect(screen.getByText("Keyboard Navigation")).toBeInTheDocument();
      expect(
        screen.getByText(/expected keyboard behavior for interactive components/i),
      ).toBeInTheDocument();
    });

    it("should render keyboard shortcuts", () => {
      render(<AccessibilityPage />);
      expect(screen.getByText("Tab")).toBeInTheDocument();
      expect(screen.getByText("Shift + Tab")).toBeInTheDocument();
      expect(screen.getByText("Enter / Space")).toBeInTheDocument();
      expect(screen.getByText("Escape")).toBeInTheDocument();
      expect(screen.getByText("Arrow Keys")).toBeInTheDocument();
    });

    it("should render test area buttons", () => {
      render(<AccessibilityPage />);
      expect(screen.getByRole("button", { name: "Button 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Button 2" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Button 3" })).toBeInTheDocument();
    });
  });

  describe("ARIA attributes section", () => {
    it("should render ARIA attributes card", () => {
      render(<AccessibilityPage />);
      expect(screen.getByText("ARIA Attributes")).toBeInTheDocument();
      expect(screen.getByText(/key aria attributes used in our components/i)).toBeInTheDocument();
    });

    it("should render ARIA attribute examples", () => {
      render(<AccessibilityPage />);
      expect(screen.getByText("aria-label")).toBeInTheDocument();
      expect(screen.getByText("aria-busy")).toBeInTheDocument();
      expect(screen.getByText("aria-expanded")).toBeInTheDocument();
      expect(screen.getByText("aria-hidden")).toBeInTheDocument();
    });
  });

  describe("animation tokens section", () => {
    it("should render animation tokens card", () => {
      render(<AccessibilityPage />);
      expect(screen.getByText("Animation Tokens")).toBeInTheDocument();
      expect(
        screen.getByText(/css custom properties for consistent animation durations/i),
      ).toBeInTheDocument();
    });

    it("should render animation token examples", () => {
      render(<AccessibilityPage />);
      expect(screen.getByText("--animation-fast")).toBeInTheDocument();
      expect(screen.getByText("--animation-normal")).toBeInTheDocument();
      expect(screen.getByText("--animation-slow")).toBeInTheDocument();
    });

    it("should render prefers-reduced-motion note", () => {
      render(<AccessibilityPage />);
      expect(screen.getByText(/prefers-reduced-motion/i)).toBeInTheDocument();
    });
  });
});
