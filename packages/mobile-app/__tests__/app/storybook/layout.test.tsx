/**
 * Tests for Layout Storybook Page
 * Ensures grid, masonry, and layout patterns render correctly
 */

import { render } from "@testing-library/react-native";
import React from "react";

import LayoutPage from "../../../app/storybook/layout";

describe("LayoutPage", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      const { getByText } = render(<LayoutPage />);
      expect(getByText("Layout")).toBeTruthy();
    });

    it("should render the subtitle", () => {
      const { getByText } = render(<LayoutPage />);
      expect(
        getByText("Masonry grid, text overlays, and zoom controls"),
      ).toBeTruthy();
    });
  });

  describe("Grid System section", () => {
    it("should render Grid System section title", () => {
      const { getByText } = render(<LayoutPage />);
      expect(getByText("Grid System")).toBeTruthy();
    });

    it("should render Grid System description", () => {
      const { getByText } = render(<LayoutPage />);
      expect(
        getByText("Responsive grid layouts for content organization."),
      ).toBeTruthy();
    });

    it("should render Full Width label", () => {
      const { getByText } = render(<LayoutPage />);
      expect(getByText("Full Width")).toBeTruthy();
    });

    it("should render half width grid labels", () => {
      const { getAllByText } = render(<LayoutPage />);
      const halfLabels = getAllByText("1/2");
      expect(halfLabels.length).toBe(2);
    });

    it("should render third width grid labels", () => {
      const { getAllByText } = render(<LayoutPage />);
      const thirdLabels = getAllByText("1/3");
      expect(thirdLabels.length).toBe(3);
    });
  });

  describe("Masonry Grid section", () => {
    it("should render Masonry Grid section title", () => {
      const { getByText } = render(<LayoutPage />);
      expect(getByText("Masonry Grid")).toBeTruthy();
    });

    it("should render Masonry Grid description", () => {
      const { getByText } = render(<LayoutPage />);
      expect(
        getByText("Pinterest-style layout for variable height content."),
      ).toBeTruthy();
    });
  });

  describe("Text Overlays section", () => {
    it("should render Text Overlays section title", () => {
      const { getByText } = render(<LayoutPage />);
      expect(getByText("Text Overlays")).toBeTruthy();
    });

    it("should render Text Overlays description", () => {
      const { getByText } = render(<LayoutPage />);
      expect(
        getByText("Layered text on images with gradient backgrounds."),
      ).toBeTruthy();
    });

    it("should render overlay example content", () => {
      const { getByText } = render(<LayoutPage />);
      expect(getByText("Featured Image")).toBeTruthy();
      expect(getByText("With gradient overlay")).toBeTruthy();
    });
  });

  describe("Zoom Controls section", () => {
    it("should render Zoom Controls section title", () => {
      const { getByText } = render(<LayoutPage />);
      expect(getByText("Zoom Controls")).toBeTruthy();
    });

    it("should render Zoom Controls description", () => {
      const { getByText } = render(<LayoutPage />);
      expect(
        getByText("Pinch-to-zoom and button controls for image viewing."),
      ).toBeTruthy();
    });

    it("should render zoom placeholder", () => {
      const { getByText } = render(<LayoutPage />);
      expect(getByText("Zoomable Image")).toBeTruthy();
    });

    it("should render zoom level indicator", () => {
      const { getByText } = render(<LayoutPage />);
      expect(getByText("100%")).toBeTruthy();
    });
  });

  describe("Spacing Scale section", () => {
    it("should render Spacing Scale section title", () => {
      const { getByText } = render(<LayoutPage />);
      expect(getByText("Spacing Scale")).toBeTruthy();
    });

    it("should render Spacing Scale description", () => {
      const { getByText } = render(<LayoutPage />);
      expect(
        getByText("Consistent spacing tokens for layout consistency."),
      ).toBeTruthy();
    });

    it("should render spacing values", () => {
      const { getByText } = render(<LayoutPage />);
      expect(getByText(/spacing\[1\]/)).toBeTruthy();
      expect(getByText(/spacing\[2\]/)).toBeTruthy();
      expect(getByText(/spacing\[4\]/)).toBeTruthy();
    });
  });
});
