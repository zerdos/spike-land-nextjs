import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock comparison components
vi.mock("@/components/enhance/ImageComparisonSlider", () => ({
  ImageComparisonSlider: ({
    originalUrl,
    enhancedUrl,
  }: {
    originalUrl: string;
    enhancedUrl: string;
  }) => (
    <div
      data-testid="image-comparison-slider"
      data-original={originalUrl}
      data-enhanced={enhancedUrl}
    >
      ImageComparisonSlider
    </div>
  ),
}));

vi.mock("@/components/enhance/ComparisonViewToggle", () => ({
  ComparisonViewToggle: ({
    originalUrl,
    enhancedUrl,
  }: {
    originalUrl: string;
    enhancedUrl: string;
  }) => (
    <div
      data-testid="comparison-view-toggle"
      data-original={originalUrl}
      data-enhanced={enhancedUrl}
    >
      ComparisonViewToggle
    </div>
  ),
}));

import ComparisonPage from "./page";

describe("ComparisonPage", () => {
  describe("rendering", () => {
    it("should render the section title", () => {
      render(<ComparisonPage />);
      expect(screen.getByText("Image Comparison")).toBeInTheDocument();
    });

    it("should render the section description", () => {
      render(<ComparisonPage />);
      expect(
        screen.getByText(
          /before\/after comparison components for showcasing image enhancements/i,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("image comparison slider section", () => {
    it("should render image comparison slider card", () => {
      render(<ComparisonPage />);
      expect(screen.getByText("Image Comparison Slider")).toBeInTheDocument();
      expect(
        screen.getByText(
          /drag the handle to compare original and enhanced images/i,
        ),
      ).toBeInTheDocument();
    });

    it("should render ImageComparisonSlider components", () => {
      render(<ComparisonPage />);
      const sliders = screen.getAllByTestId("image-comparison-slider");
      expect(sliders.length).toBeGreaterThan(0);
    });

    it("should render aspect ratio badges", () => {
      render(<ComparisonPage />);
      expect(screen.getByText("16:9")).toBeInTheDocument();
      expect(screen.getByText("4:3")).toBeInTheDocument();
      expect(screen.getByText("1:1")).toBeInTheDocument();
    });
  });

  describe("comparison view toggle section", () => {
    it("should render comparison view toggle card", () => {
      render(<ComparisonPage />);
      expect(screen.getByText("Comparison View Toggle")).toBeInTheDocument();
      expect(
        screen.getByText(/switch between different comparison modes/i),
      ).toBeInTheDocument();
    });

    it("should render ComparisonViewToggle component", () => {
      render(<ComparisonPage />);
      expect(screen.getByTestId("comparison-view-toggle")).toBeInTheDocument();
    });
  });
});
