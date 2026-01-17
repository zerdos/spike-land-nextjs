import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MiniPreview } from "./MiniPreview";

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Setup IntersectionObserver mock
  mockIntersectionObserver.mockImplementation((callback) => {
    // Immediately trigger intersection (visible)
    setTimeout(() => {
      callback([{ isIntersecting: true }]);
    }, 0);
    return {
      observe: mockObserve,
      unobserve: mockUnobserve,
      disconnect: mockDisconnect,
    };
  });
  global.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;
});

describe("MiniPreview", () => {
  const defaultProps = {
    codespaceUrl: "https://testing.spike.land/live/test-app/",
    versionNumber: 1,
    isLatest: false,
    onClick: vi.fn(),
  };

  describe("Rendering", () => {
    it("should render the preview container", () => {
      render(<MiniPreview {...defaultProps} />);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("should render version badge with version number", () => {
      render(<MiniPreview {...defaultProps} />);
      expect(screen.getByText("v1")).toBeInTheDocument();
    });

    it("should render latest badge when isLatest is true", () => {
      render(<MiniPreview {...defaultProps} isLatest={true} />);
      expect(screen.getByText("v1 (latest)")).toBeInTheDocument();
    });

    it("should not render version badge when versionNumber is undefined", () => {
      render(<MiniPreview {...defaultProps} versionNumber={undefined} />);
      expect(screen.queryByText(/^v\d/)).not.toBeInTheDocument();
    });

    it("should render traffic lights in browser chrome", () => {
      render(<MiniPreview {...defaultProps} />);
      // Browser chrome contains three circles (traffic lights)
      const trafficLights = document.querySelectorAll(".rounded-full");
      // At least the traffic light elements should be present
      expect(trafficLights.length).toBeGreaterThan(0);
    });

    it("should render URL bar placeholder text", () => {
      render(<MiniPreview {...defaultProps} />);
      expect(screen.getByText("testing.spike.land/live/...")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have correct aria-label", () => {
      render(<MiniPreview {...defaultProps} />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute(
        "aria-label",
        "Preview version 1 - Click to expand",
      );
    });

    it("should have correct aria-label when version is undefined", () => {
      render(<MiniPreview {...defaultProps} versionNumber={undefined} />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute(
        "aria-label",
        "Preview version - Click to expand",
      );
    });

    it("should have tabIndex for keyboard navigation", () => {
      render(<MiniPreview {...defaultProps} />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("tabIndex", "0");
    });
  });

  describe("Interaction", () => {
    it("should call onClick when clicked", () => {
      const onClick = vi.fn();
      render(<MiniPreview {...defaultProps} onClick={onClick} />);
      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should call onClick when Enter key is pressed", () => {
      const onClick = vi.fn();
      render(<MiniPreview {...defaultProps} onClick={onClick} />);
      const button = screen.getByRole("button");
      fireEvent.keyDown(button, { key: "Enter" });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should call onClick when Space key is pressed", () => {
      const onClick = vi.fn();
      render(<MiniPreview {...defaultProps} onClick={onClick} />);
      const button = screen.getByRole("button");
      fireEvent.keyDown(button, { key: " " });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onClick for other keys", () => {
      const onClick = vi.fn();
      render(<MiniPreview {...defaultProps} onClick={onClick} />);
      const button = screen.getByRole("button");
      fireEvent.keyDown(button, { key: "Tab" });
      fireEvent.keyDown(button, { key: "Escape" });
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("Lazy Loading", () => {
    it("should use IntersectionObserver for lazy loading", () => {
      render(<MiniPreview {...defaultProps} />);
      expect(mockIntersectionObserver).toHaveBeenCalled();
      expect(mockObserve).toHaveBeenCalled();
    });

    it("should disconnect observer on unmount", () => {
      const { unmount } = render(<MiniPreview {...defaultProps} />);
      unmount();
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it("should show loading text initially", () => {
      // Override to not trigger intersection
      mockIntersectionObserver.mockImplementation(() => ({
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: mockDisconnect,
      }));

      render(<MiniPreview {...defaultProps} />);
      expect(screen.getByText("Loading preview...")).toBeInTheDocument();
    });
  });

  describe("Hover State", () => {
    it("should render expand hint text", () => {
      render(<MiniPreview {...defaultProps} />);
      expect(screen.getByText("Click to expand")).toBeInTheDocument();
    });
  });

  describe("Version Badge Styling", () => {
    it("should apply latest styling when isLatest is true", () => {
      render(<MiniPreview {...defaultProps} isLatest={true} />);
      const badge = screen.getByText("v1 (latest)");
      expect(badge).toHaveClass("bg-teal-500/20");
      expect(badge).toHaveClass("text-teal-300");
    });

    it("should apply non-latest styling when isLatest is false", () => {
      render(<MiniPreview {...defaultProps} isLatest={false} />);
      const badge = screen.getByText("v1");
      expect(badge).toHaveClass("bg-zinc-700/50");
      expect(badge).toHaveClass("text-zinc-400");
    });
  });
});
