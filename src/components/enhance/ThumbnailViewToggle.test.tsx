import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThumbnailViewToggle } from "./ThumbnailViewToggle";

describe("ThumbnailViewToggle Component", () => {
  const defaultProps = {
    showEnhanced: false,
    onToggle: vi.fn(),
    hasEnhancedImages: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render the component", () => {
      render(<ThumbnailViewToggle {...defaultProps} />);
      expect(screen.getByTestId("thumbnail-view-toggle")).toBeInTheDocument();
    });

    it("should render both labels", () => {
      render(<ThumbnailViewToggle {...defaultProps} />);
      expect(screen.getByText("Original")).toBeInTheDocument();
      expect(screen.getByText("Enhanced")).toBeInTheDocument();
    });

    it("should render the switch", () => {
      render(<ThumbnailViewToggle {...defaultProps} />);
      expect(screen.getByTestId("thumbnail-view-switch")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(<ThumbnailViewToggle {...defaultProps} className="custom-class" />);
      expect(screen.getByTestId("thumbnail-view-toggle")).toHaveClass("custom-class");
    });

    it("should have proper accessibility label", () => {
      render(<ThumbnailViewToggle {...defaultProps} />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute(
        "aria-label",
        "Toggle between original and enhanced thumbnail view",
      );
    });
  });

  describe("State Display", () => {
    it("should show unchecked state when showEnhanced is false", () => {
      render(<ThumbnailViewToggle {...defaultProps} showEnhanced={false} />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("data-state", "unchecked");
    });

    it("should show checked state when showEnhanced is true", () => {
      render(<ThumbnailViewToggle {...defaultProps} showEnhanced={true} />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("data-state", "checked");
    });

    it("should highlight Original label when showEnhanced is false", () => {
      render(<ThumbnailViewToggle {...defaultProps} showEnhanced={false} />);
      const originalLabel = screen.getByText("Original");
      const enhancedLabel = screen.getByText("Enhanced");
      expect(originalLabel).toHaveClass("text-foreground", "font-medium");
      expect(enhancedLabel).toHaveClass("text-muted-foreground");
    });

    it("should highlight Enhanced label when showEnhanced is true", () => {
      render(<ThumbnailViewToggle {...defaultProps} showEnhanced={true} />);
      const originalLabel = screen.getByText("Original");
      const enhancedLabel = screen.getByText("Enhanced");
      expect(enhancedLabel).toHaveClass("text-foreground", "font-medium");
      expect(originalLabel).toHaveClass("text-muted-foreground");
    });
  });

  describe("Interaction", () => {
    it("should call onToggle with true when clicking unchecked switch", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(<ThumbnailViewToggle {...defaultProps} showEnhanced={false} onToggle={onToggle} />);

      const switchElement = screen.getByRole("switch");
      await user.click(switchElement);

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it("should call onToggle with false when clicking checked switch", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(<ThumbnailViewToggle {...defaultProps} showEnhanced={true} onToggle={onToggle} />);

      const switchElement = screen.getByRole("switch");
      await user.click(switchElement);

      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it("should be keyboard accessible", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(<ThumbnailViewToggle {...defaultProps} showEnhanced={false} onToggle={onToggle} />);

      const switchElement = screen.getByRole("switch");
      switchElement.focus();
      await user.keyboard(" ");

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it("should toggle with Enter key", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(<ThumbnailViewToggle {...defaultProps} showEnhanced={false} onToggle={onToggle} />);

      const switchElement = screen.getByRole("switch");
      switchElement.focus();
      await user.keyboard("{Enter}");

      expect(onToggle).toHaveBeenCalledWith(true);
    });
  });

  describe("Disabled State", () => {
    it("should disable switch when hasEnhancedImages is false", () => {
      render(<ThumbnailViewToggle {...defaultProps} hasEnhancedImages={false} />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toBeDisabled();
    });

    it("should apply opacity class when disabled", () => {
      render(<ThumbnailViewToggle {...defaultProps} hasEnhancedImages={false} />);
      expect(screen.getByTestId("thumbnail-view-toggle")).toHaveClass("opacity-50");
    });

    it("should not apply opacity class when enabled", () => {
      render(<ThumbnailViewToggle {...defaultProps} hasEnhancedImages={true} />);
      expect(screen.getByTestId("thumbnail-view-toggle")).not.toHaveClass("opacity-50");
    });

    it("should not call onToggle when clicking disabled switch", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(
        <ThumbnailViewToggle {...defaultProps} hasEnhancedImages={false} onToggle={onToggle} />,
      );

      const switchElement = screen.getByRole("switch");
      await user.click(switchElement);

      expect(onToggle).not.toHaveBeenCalled();
    });

    it("should apply cursor-not-allowed to labels when disabled", () => {
      render(<ThumbnailViewToggle {...defaultProps} hasEnhancedImages={false} />);
      const originalLabel = screen.getByText("Original");
      const enhancedLabel = screen.getByText("Enhanced");
      expect(originalLabel).toHaveClass("cursor-not-allowed");
      expect(enhancedLabel).toHaveClass("cursor-not-allowed");
    });

    it("should not highlight either label when disabled", () => {
      render(
        <ThumbnailViewToggle
          {...defaultProps}
          hasEnhancedImages={false}
          showEnhanced={true}
        />,
      );
      const originalLabel = screen.getByText("Original");
      const enhancedLabel = screen.getByText("Enhanced");
      expect(originalLabel).not.toHaveClass("font-medium");
      expect(enhancedLabel).not.toHaveClass("font-medium");
    });
  });

  describe("Label Interaction", () => {
    it("should have switch with proper id", () => {
      render(<ThumbnailViewToggle {...defaultProps} />);
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("id", "thumbnail-view-switch");
    });

    it("should call onToggle when clicking Original label", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(<ThumbnailViewToggle {...defaultProps} showEnhanced={true} onToggle={onToggle} />);

      const originalLabel = screen.getByTestId("original-label");
      await user.click(originalLabel);

      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it("should call onToggle when clicking Enhanced label", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(<ThumbnailViewToggle {...defaultProps} showEnhanced={false} onToggle={onToggle} />);

      const enhancedLabel = screen.getByTestId("enhanced-label");
      await user.click(enhancedLabel);

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it("should not call onToggle when clicking disabled label", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(
        <ThumbnailViewToggle {...defaultProps} hasEnhancedImages={false} onToggle={onToggle} />,
      );

      const originalLabel = screen.getByTestId("original-label");
      await user.click(originalLabel);

      expect(onToggle).not.toHaveBeenCalled();
    });

    it("should have cursor-pointer on labels when enabled", () => {
      render(<ThumbnailViewToggle {...defaultProps} hasEnhancedImages={true} />);
      const originalLabel = screen.getByText("Original");
      const enhancedLabel = screen.getByText("Enhanced");
      expect(originalLabel).toHaveClass("cursor-pointer");
      expect(enhancedLabel).toHaveClass("cursor-pointer");
    });
  });

  describe("Styling", () => {
    it("should have flex layout", () => {
      render(<ThumbnailViewToggle {...defaultProps} />);
      expect(screen.getByTestId("thumbnail-view-toggle")).toHaveClass(
        "flex",
        "items-center",
        "gap-3",
      );
    });

    it("should have text-xs on labels", () => {
      render(<ThumbnailViewToggle {...defaultProps} />);
      const originalLabel = screen.getByText("Original");
      const enhancedLabel = screen.getByText("Enhanced");
      expect(originalLabel).toHaveClass("text-xs");
      expect(enhancedLabel).toHaveClass("text-xs");
    });

    it("should have select-none on labels to prevent text selection", () => {
      render(<ThumbnailViewToggle {...defaultProps} />);
      const originalLabel = screen.getByText("Original");
      const enhancedLabel = screen.getByText("Enhanced");
      expect(originalLabel).toHaveClass("select-none");
      expect(enhancedLabel).toHaveClass("select-none");
    });
  });
});
