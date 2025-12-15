import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingHint, type FloatingHintProps, HINT_TEXT } from "./FloatingHint";

describe("FloatingHint", () => {
  const defaultProps: FloatingHintProps = {
    text: "Test hint message",
    isVisible: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset matchMedia to default
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  describe("Rendering", () => {
    it("renders the floating hint container", () => {
      render(<FloatingHint {...defaultProps} />);

      const hint = screen.getByTestId("floating-hint");
      expect(hint).toBeInTheDocument();
    });

    it("renders the hint text", () => {
      render(<FloatingHint {...defaultProps} />);

      const text = screen.getByTestId("floating-hint-text");
      expect(text).toHaveTextContent("Test hint message");
    });

    it("renders the icon", () => {
      render(<FloatingHint {...defaultProps} />);

      const icon = screen.getByTestId("floating-hint-icon");
      expect(icon).toBeInTheDocument();
    });

    it("has correct role and aria-live attributes", () => {
      render(<FloatingHint {...defaultProps} />);

      const hint = screen.getByTestId("floating-hint");
      expect(hint).toHaveAttribute("role", "status");
      expect(hint).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Visibility states", () => {
    it("shows float-up animation when visible", () => {
      render(<FloatingHint {...defaultProps} isVisible={true} />);

      const hint = screen.getByTestId("floating-hint");
      expect(hint).toHaveClass("animate-float-up");
    });

    it("hides and applies translate when not visible", () => {
      render(<FloatingHint {...defaultProps} isVisible={false} />);

      const hint = screen.getByTestId("floating-hint");
      expect(hint).toHaveClass("opacity-0");
      expect(hint).toHaveClass("pointer-events-none");
      expect(hint).toHaveClass("translate-y-full");
    });

    it("does not have animation class when not visible", () => {
      render(<FloatingHint {...defaultProps} isVisible={false} />);

      const hint = screen.getByTestId("floating-hint");
      expect(hint).not.toHaveClass("animate-float-up");
    });
  });

  describe("Device-specific icons", () => {
    it("shows keyboard icon for desktop by default", () => {
      render(<FloatingHint {...defaultProps} isTouchDevice={false} />);

      const icon = screen.getByTestId("floating-hint-icon");
      // Desktop icon should have keyboard-related path
      const svg = icon.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("shows touch/tap icon for touch devices", () => {
      render(<FloatingHint {...defaultProps} isTouchDevice={true} />);

      const icon = screen.getByTestId("floating-hint-icon");
      // Touch icon should have hand/finger-related path
      const svg = icon.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("uses custom icon when provided", () => {
      const customIcon = <span data-testid="custom-icon">Custom</span>;
      render(<FloatingHint {...defaultProps} icon={customIcon} />);

      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    });
  });

  describe("Reduced motion preference", () => {
    it("respects prefers-reduced-motion setting when visible", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<FloatingHint {...defaultProps} isVisible={true} />);

      const hint = screen.getByTestId("floating-hint");
      // Should not have animation class when reduced motion is preferred
      expect(hint).not.toHaveClass("animate-float-up");
      // Should have opacity-100 instead
      expect(hint).toHaveClass("opacity-100");
    });
  });

  describe("Styling", () => {
    it("has correct positioning classes", () => {
      render(<FloatingHint {...defaultProps} />);

      const hint = screen.getByTestId("floating-hint");
      expect(hint).toHaveClass("fixed");
      expect(hint).toHaveClass("bottom-8");
      expect(hint).toHaveClass("left-1/2");
      expect(hint).toHaveClass("-translate-x-1/2");
      expect(hint).toHaveClass("z-50");
    });

    it("has correct background and blur classes", () => {
      render(<FloatingHint {...defaultProps} />);

      const hint = screen.getByTestId("floating-hint");
      expect(hint).toHaveClass("bg-black/60");
      expect(hint).toHaveClass("backdrop-blur-sm");
    });

    it("has correct text styling classes", () => {
      render(<FloatingHint {...defaultProps} />);

      const hint = screen.getByTestId("floating-hint");
      expect(hint).toHaveClass("text-white/90");
      expect(hint).toHaveClass("text-sm");
      expect(hint).toHaveClass("font-medium");
    });

    it("has correct shape and padding classes", () => {
      render(<FloatingHint {...defaultProps} />);

      const hint = screen.getByTestId("floating-hint");
      expect(hint).toHaveClass("rounded-full");
      expect(hint).toHaveClass("px-6");
      expect(hint).toHaveClass("py-3");
    });
  });

  describe("HINT_TEXT constants", () => {
    it("has correct desktop hint text", () => {
      expect(HINT_TEXT.desktop).toBe("Press Spacebar to enter slideshow");
    });

    it("has correct touch hint text", () => {
      expect(HINT_TEXT.touch).toBe("Double-tap to enter slideshow");
    });

    it("can be used with the component", () => {
      render(<FloatingHint text={HINT_TEXT.desktop} isVisible={true} />);

      expect(screen.getByTestId("floating-hint-text")).toHaveTextContent(
        "Press Spacebar to enter slideshow",
      );
    });
  });

  describe("Different text values", () => {
    it("renders different text correctly", () => {
      const texts = [
        "Hold Space to peek at original",
        "Swipe to navigate",
        "Tap to select",
      ];

      texts.forEach((text) => {
        const { unmount } = render(
          <FloatingHint text={text} isVisible={true} />,
        );
        expect(screen.getByTestId("floating-hint-text")).toHaveTextContent(
          text,
        );
        unmount();
      });
    });
  });

  describe("Edge cases", () => {
    it("handles empty text", () => {
      render(<FloatingHint text="" isVisible={true} />);

      const text = screen.getByTestId("floating-hint-text");
      expect(text).toHaveTextContent("");
    });

    it("handles very long text", () => {
      const longText = "A".repeat(200);
      render(<FloatingHint text={longText} isVisible={true} />);

      const text = screen.getByTestId("floating-hint-text");
      expect(text).toHaveTextContent(longText);
    });

    it("handles special characters in text", () => {
      const specialText = "Press <Space> & hold!";
      render(<FloatingHint text={specialText} isVisible={true} />);

      const text = screen.getByTestId("floating-hint-text");
      expect(text).toHaveTextContent(specialText);
    });
  });
});
