/**
 * Tests for Brand Storybook Page
 * Ensures brand assets and logos render correctly
 */

import { render } from "@testing-library/react-native";
import React from "react";

import BrandPage from "../../../app/storybook/brand";

describe("BrandPage", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      const { getByText } = render(<BrandPage />);
      expect(getByText("Brand Identity")).toBeTruthy();
    });

    it("should render the subtitle", () => {
      const { getByText } = render(<BrandPage />);
      expect(
        getByText(/The visual core of the spike\.land design system/),
      ).toBeTruthy();
    });
  });

  describe("AI Spark Logo section", () => {
    it("should render AI Spark Logo section title", () => {
      const { getByText } = render(<BrandPage />);
      expect(getByText("AI Spark Logo")).toBeTruthy();
    });

    it("should render AI Spark Logo description", () => {
      const { getByText } = render(<BrandPage />);
      expect(
        getByText(/The primary symbol of our creative tools/),
      ).toBeTruthy();
    });

    it("should render Sizes & Scale card", () => {
      const { getByText } = render(<BrandPage />);
      expect(getByText("Sizes & Scale")).toBeTruthy();
    });

    it("should render all size badges", () => {
      const { getAllByText } = render(<BrandPage />);
      expect(getAllByText("SM").length).toBeGreaterThan(0);
      expect(getAllByText("MD").length).toBeGreaterThan(0);
      expect(getAllByText("LG").length).toBeGreaterThan(0);
      expect(getAllByText("XL").length).toBeGreaterThan(0);
    });

    it("should render Structural Variants card", () => {
      const { getByText } = render(<BrandPage />);
      expect(getByText("Structural Variants")).toBeTruthy();
    });

    it("should render variant badges", () => {
      const { getAllByText } = render(<BrandPage />);
      expect(getAllByText("HORIZONTAL").length).toBeGreaterThan(0);
      expect(getAllByText("ICON ONLY").length).toBeGreaterThan(0);
      expect(getAllByText("STACKED").length).toBeGreaterThan(0);
    });
  });

  describe("spike.land Platform Logo section", () => {
    it("should render spike.land Platform Logo section title", () => {
      const { getByText } = render(<BrandPage />);
      expect(getByText("spike.land Platform Logo")).toBeTruthy();
    });

    it("should render platform logo description", () => {
      const { getByText } = render(<BrandPage />);
      expect(
        getByText(
          /The parent platform identity featuring a lightning bolt icon/,
        ),
      ).toBeTruthy();
    });

    it("should render Platform Scale card", () => {
      const { getByText } = render(<BrandPage />);
      expect(getByText("Platform Scale")).toBeTruthy();
    });

    it("should render Platform Layouts card", () => {
      const { getByText } = render(<BrandPage />);
      expect(getByText("Platform Layouts")).toBeTruthy();
    });
  });

  describe("Brand Colors section", () => {
    it("should render Brand Colors section title", () => {
      const { getByText } = render(<BrandPage />);
      expect(getByText("Brand Colors")).toBeTruthy();
    });

    it("should render Pixel Cyan color", () => {
      const { getByText } = render(<BrandPage />);
      expect(getByText("Pixel Cyan")).toBeTruthy();
      expect(getByText("#00E5FF")).toBeTruthy();
    });

    it("should render Pixel Fuchsia color", () => {
      const { getByText } = render(<BrandPage />);
      expect(getByText("Pixel Fuchsia")).toBeTruthy();
      expect(getByText("#FF00FF")).toBeTruthy();
    });

    it("should render Spike Amber color", () => {
      const { getByText } = render(<BrandPage />);
      expect(getByText("Spike Amber")).toBeTruthy();
      expect(getByText("#FBBF24")).toBeTruthy();
    });
  });

  describe("Usage Guidelines section", () => {
    it("should render Usage Guidelines section title", () => {
      const { getByText } = render(<BrandPage />);
      expect(getByText("Usage Guidelines")).toBeTruthy();
    });

    it("should render usage guidelines", () => {
      const { getByText } = render(<BrandPage />);
      expect(
        getByText(/The AI Spark logo represents transformation/),
      ).toBeTruthy();
      expect(
        getByText(/Maintain clear space around the logo/),
      ).toBeTruthy();
      expect(
        getByText(/Use the horizontal variant for navigation bars/),
      ).toBeTruthy();
      expect(getByText(/Don't alter the logo colors or proportions/))
        .toBeTruthy();
      expect(
        getByText(/Don't place on low contrast backgrounds/),
      ).toBeTruthy();
    });
  });
});
