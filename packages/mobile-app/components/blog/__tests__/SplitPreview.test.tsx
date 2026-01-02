/**
 * Tests for SplitPreview and ImageComparisonSlider components
 */

import { fireEvent, render, screen } from "@testing-library/react-native";

import { ImageComparisonSlider, SplitPreview } from "../SplitPreview";

describe("SplitPreview", () => {
  const defaultProps = {
    originalUrl: "https://example.com/original.jpg",
    enhancedUrl: "https://example.com/enhanced.jpg",
  };

  describe("basic rendering", () => {
    it("renders with required props", () => {
      render(<SplitPreview {...defaultProps} />);
      expect(screen.getByTestId("split-preview")).toBeTruthy();
    });

    it("renders with default labels", () => {
      render(<SplitPreview {...defaultProps} />);
      expect(screen.getByText("Before")).toBeTruthy();
      expect(screen.getByText("After")).toBeTruthy();
    });

    it("renders with custom labels", () => {
      render(
        <SplitPreview
          {...defaultProps}
          originalLabel="VHS Original"
          enhancedLabel="4K Restored"
        />,
      );
      expect(screen.getByText("VHS Original")).toBeTruthy();
      expect(screen.getByText("4K Restored")).toBeTruthy();
    });
  });

  describe("layout handling", () => {
    it("updates container width on layout", () => {
      render(<SplitPreview {...defaultProps} />);
      const container = screen.getByTestId("split-preview");

      // Simulate layout event
      fireEvent(container, "layout", {
        nativeEvent: { layout: { width: 400 } },
      });

      // Component should not crash after layout update
      expect(screen.getByTestId("split-preview")).toBeTruthy();
    });
  });

  describe("images", () => {
    it("renders component with image container", () => {
      render(<SplitPreview {...defaultProps} />);

      // Component should render without errors when given image URLs
      expect(screen.getByTestId("split-preview")).toBeTruthy();
      // Labels should be visible indicating images are rendered
      expect(screen.getByText("Before")).toBeTruthy();
      expect(screen.getByText("After")).toBeTruthy();
    });
  });
});

describe("ImageComparisonSlider", () => {
  const defaultProps = {
    originalUrl: "https://example.com/original.jpg",
    enhancedUrl: "https://example.com/enhanced.jpg",
  };

  it("renders as an alias for SplitPreview", () => {
    render(<ImageComparisonSlider {...defaultProps} />);
    expect(screen.getByTestId("split-preview")).toBeTruthy();
  });

  it("passes props correctly to SplitPreview", () => {
    render(
      <ImageComparisonSlider
        {...defaultProps}
        originalLabel="Original Photo"
        enhancedLabel="Enhanced Photo"
      />,
    );
    expect(screen.getByText("Original Photo")).toBeTruthy();
    expect(screen.getByText("Enhanced Photo")).toBeTruthy();
  });
});
