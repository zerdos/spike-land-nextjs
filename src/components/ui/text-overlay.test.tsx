import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TextOverlay } from "./text-overlay";

describe("TextOverlay Component", () => {
  it("should render children", () => {
    render(<TextOverlay>Test Label</TextOverlay>);
    expect(screen.getByText("Test Label")).toBeInTheDocument();
  });

  it("should have data-testid", () => {
    render(<TextOverlay>Label</TextOverlay>);
    expect(screen.getByTestId("text-overlay")).toBeInTheDocument();
  });

  it("should apply gradient classes by default", () => {
    render(<TextOverlay>Label</TextOverlay>);
    const overlay = screen.getByTestId("text-overlay");
    expect(overlay).toHaveClass("bg-black/60");
    expect(overlay).toHaveClass("backdrop-blur-sm");
  });

  it("should not apply gradient classes when gradient is false", () => {
    render(<TextOverlay gradient={false}>Label</TextOverlay>);
    const overlay = screen.getByTestId("text-overlay");
    expect(overlay).not.toHaveClass("bg-black/60");
    expect(overlay).not.toHaveClass("backdrop-blur-sm");
  });

  it("should apply bottom-left position by default", () => {
    render(<TextOverlay>Label</TextOverlay>);
    const overlay = screen.getByTestId("text-overlay");
    expect(overlay).toHaveClass("bottom-4");
    expect(overlay).toHaveClass("left-4");
  });

  it("should apply bottom-right position", () => {
    render(<TextOverlay position="bottom-right">Label</TextOverlay>);
    const overlay = screen.getByTestId("text-overlay");
    expect(overlay).toHaveClass("bottom-4");
    expect(overlay).toHaveClass("right-4");
  });

  it("should apply top-left position", () => {
    render(<TextOverlay position="top-left">Label</TextOverlay>);
    const overlay = screen.getByTestId("text-overlay");
    expect(overlay).toHaveClass("top-4");
    expect(overlay).toHaveClass("left-4");
  });

  it("should apply top-right position", () => {
    render(<TextOverlay position="top-right">Label</TextOverlay>);
    const overlay = screen.getByTestId("text-overlay");
    expect(overlay).toHaveClass("top-4");
    expect(overlay).toHaveClass("right-4");
  });

  it("should apply center position", () => {
    render(<TextOverlay position="center">Label</TextOverlay>);
    const overlay = screen.getByTestId("text-overlay");
    expect(overlay).toHaveClass("top-1/2");
    expect(overlay).toHaveClass("left-1/2");
    expect(overlay).toHaveClass("-translate-x-1/2");
    expect(overlay).toHaveClass("-translate-y-1/2");
  });

  it("should apply custom className", () => {
    render(<TextOverlay className="custom-class">Label</TextOverlay>);
    const overlay = screen.getByTestId("text-overlay");
    expect(overlay).toHaveClass("custom-class");
  });

  it("should have correct base styling", () => {
    render(<TextOverlay>Label</TextOverlay>);
    const overlay = screen.getByTestId("text-overlay");
    expect(overlay).toHaveClass("absolute");
    expect(overlay).toHaveClass("z-10");
    expect(overlay).toHaveClass("text-white/90");
    expect(overlay).toHaveClass("text-sm");
    expect(overlay).toHaveClass("font-medium");
    expect(overlay).toHaveClass("rounded-full");
    expect(overlay).toHaveClass("px-4");
    expect(overlay).toHaveClass("py-1.5");
    expect(overlay).toHaveClass("shadow-lg");
  });

  it("should forward ref correctly", () => {
    const ref = { current: null };
    render(<TextOverlay ref={ref}>Label</TextOverlay>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("should have correct display name", () => {
    expect(TextOverlay.displayName).toBe("TextOverlay");
  });

  describe("reduced motion", () => {
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it("should apply transition classes when reduced motion is not preferred", () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === "(prefers-reduced-motion: reduce)" ? false : false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      render(<TextOverlay>Label</TextOverlay>);
      const overlay = screen.getByTestId("text-overlay");
      expect(overlay).toHaveClass("transition-opacity");
      expect(overlay).toHaveClass("duration-150");
    });

    it("should not apply transition classes when reduced motion is preferred", () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === "(prefers-reduced-motion: reduce)" ? true : false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      render(<TextOverlay>Label</TextOverlay>);
      const overlay = screen.getByTestId("text-overlay");
      expect(overlay).not.toHaveClass("transition-opacity");
    });
  });
});
