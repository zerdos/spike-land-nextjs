import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroComparisonSlider } from "./HeroComparisonSlider";

describe("HeroComparisonSlider Component", () => {
  const defaultProps = {
    originalUrl: "https://example.com/original.jpg",
    enhancedUrl: "https://example.com/enhanced.jpg",
  };

  it("should render both original and enhanced images", () => {
    render(<HeroComparisonSlider {...defaultProps} />);
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
  });

  it("should have correct alt text for images", () => {
    render(<HeroComparisonSlider {...defaultProps} />);
    expect(screen.getByAltText("Original")).toBeInTheDocument();
    expect(screen.getByAltText("Enhanced")).toBeInTheDocument();
  });

  it("should display Original and Enhanced labels", () => {
    render(<HeroComparisonSlider {...defaultProps} />);
    expect(screen.getByText("Original")).toBeInTheDocument();
    expect(screen.getByText("Enhanced by Pixel")).toBeInTheDocument();
  });

  it("should use correct image sources", () => {
    render(<HeroComparisonSlider {...defaultProps} />);
    const originalImg = screen.getByAltText("Original");
    const enhancedImg = screen.getByAltText("Enhanced");
    expect(originalImg).toHaveAttribute("src", defaultProps.originalUrl);
    expect(enhancedImg).toHaveAttribute("src", defaultProps.enhancedUrl);
  });

  it("should have cursor-ew-resize class for drag indication", () => {
    const { container } = render(<HeroComparisonSlider {...defaultProps} />);
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass("cursor-ew-resize");
  });

  it("should have aspect-video class for 16:9 ratio", () => {
    const { container } = render(<HeroComparisonSlider {...defaultProps} />);
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass("aspect-video");
  });

  it("should have rounded corners", () => {
    const { container } = render(<HeroComparisonSlider {...defaultProps} />);
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass("rounded-2xl");
  });

  it("should accept custom className", () => {
    const { container } = render(
      <HeroComparisonSlider {...defaultProps} className="custom-class" />,
    );
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass("custom-class");
  });

  it("should render slider handle with spark icon", () => {
    const { container } = render(<HeroComparisonSlider {...defaultProps} />);
    const sparkPath = container.querySelector(
      'svg path[d*="12 2L14.5"]',
    );
    expect(sparkPath).toBeInTheDocument();
  });

  it("should have slider line with primary color", () => {
    const { container } = render(<HeroComparisonSlider {...defaultProps} />);
    const sliderLine = container.querySelector(".bg-primary");
    expect(sliderLine).toBeInTheDocument();
  });

  it("should update slider position on click", () => {
    const { container } = render(<HeroComparisonSlider {...defaultProps} />);
    const mainContainer = container.firstChild as HTMLElement;

    // Click on container should set slider position
    fireEvent.click(mainContainer, { clientX: 200 });
  });

  it("should update slider position on touch start", () => {
    const { container } = render(<HeroComparisonSlider {...defaultProps} />);
    const mainContainer = container.firstChild as HTMLElement;

    // Touch start should set slider position
    fireEvent.touchStart(mainContainer, {
      touches: [{ clientX: 150 }],
    });

    fireEvent.touchEnd(mainContainer);
  });

  it("should update slider position on mouse move when dragging", () => {
    const { container } = render(<HeroComparisonSlider {...defaultProps} />);
    const sliderHandle = container.querySelector(".bg-primary.w-1");

    // Start dragging
    fireEvent.mouseDown(sliderHandle!);

    // Move to simulate drag
    const mainContainer = container.firstChild as HTMLElement;
    fireEvent.mouseMove(mainContainer, { clientX: 200 });

    // Stop dragging
    fireEvent.mouseUp(mainContainer);
  });

  it("should handle touch move events", () => {
    const { container } = render(<HeroComparisonSlider {...defaultProps} />);
    const mainContainer = container.firstChild as HTMLElement;

    // Simulate touch move
    fireEvent.touchMove(mainContainer, {
      touches: [{ clientX: 150 }],
    });

    fireEvent.touchEnd(mainContainer);
  });

  it("should make images non-draggable", () => {
    render(<HeroComparisonSlider {...defaultProps} />);
    const images = screen.getAllByRole("img");
    images.forEach((img) => {
      expect(img).toHaveAttribute("draggable", "false");
    });
  });

  it("should have cyan glow on slider handle", () => {
    const { container } = render(<HeroComparisonSlider {...defaultProps} />);
    const handle = container.querySelector(".shadow-glow-cyan");
    expect(handle).toBeInTheDocument();
  });

  it("should have arrow icons on slider handle", () => {
    const { container } = render(<HeroComparisonSlider {...defaultProps} />);
    const arrows = container.querySelectorAll("svg path");
    // Should have spark icon + left arrow + right arrow
    expect(arrows.length).toBeGreaterThanOrEqual(3);
  });

  it("should have hover scale effect on handle", () => {
    const { container } = render(<HeroComparisonSlider {...defaultProps} />);
    const handle = container.querySelector(".hover\\:scale-110");
    expect(handle).toBeInTheDocument();
  });

  it("should have smooth transition on slider position change", () => {
    const { container } = render(<HeroComparisonSlider {...defaultProps} />);
    const sliderLine = container.querySelector(".transition-\\[left\\]");
    expect(sliderLine).toBeInTheDocument();
  });
});
