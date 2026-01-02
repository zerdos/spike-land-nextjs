/**
 * Tests for Surfaces Storybook Page
 * Ensures glass-morphism tiers, elevation system, and transparency render correctly
 */

import { render } from "@testing-library/react-native";

import SurfacesPage from "../../../app/storybook/surfaces";

describe("SurfacesPage", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(getByText("Surfaces")).toBeTruthy();
    });

    it("should render the subtitle", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(
        getByText("Glass-morphism tiers, elevation system, and transparency"),
      ).toBeTruthy();
    });
  });

  describe("Glass Morphism Tiers section", () => {
    it("should render Glass Morphism Tiers section title", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(getByText("Glass Morphism Tiers")).toBeTruthy();
    });

    it("should render Glass Morphism Tiers description", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(
        getByText("Three levels of transparency for layered interfaces."),
      ).toBeTruthy();
    });

    it("should render all glass tiers", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(getByText("Glass 0")).toBeTruthy();
      expect(getByText("5% opacity")).toBeTruthy();
      expect(getByText("Glass 1")).toBeTruthy();
      expect(getByText("8% opacity")).toBeTruthy();
      expect(getByText("Glass 2")).toBeTruthy();
      expect(getByText("12% opacity")).toBeTruthy();
    });
  });

  describe("Elevation System section", () => {
    it("should render Elevation System section title", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(getByText("Elevation System")).toBeTruthy();
    });

    it("should render Elevation System description", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(
        getByText("Shadow depths for creating visual hierarchy."),
      ).toBeTruthy();
    });

    it("should render None elevation", () => {
      const { getAllByText, getByText } = render(<SurfacesPage />);
      const noneTexts = getAllByText("None");
      expect(noneTexts.length).toBeGreaterThan(0);
      expect(getByText("elevation: 0")).toBeTruthy();
    });

    it("should render Small elevation", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(getByText("Small")).toBeTruthy();
      expect(getByText("elevation: 1")).toBeTruthy();
    });

    it("should render Default elevation", () => {
      const { getAllByText, getByText } = render(<SurfacesPage />);
      const defaultTexts = getAllByText("Default");
      expect(defaultTexts.length).toBeGreaterThan(0);
      expect(getByText("elevation: 2")).toBeTruthy();
    });

    it("should render Medium elevation", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(getByText("Medium")).toBeTruthy();
      expect(getByText("elevation: 4")).toBeTruthy();
    });

    it("should render Large elevation", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(getByText("Large")).toBeTruthy();
      expect(getByText("elevation: 8")).toBeTruthy();
    });

    it("should render XL elevation", () => {
      const { getAllByText, getByText } = render(<SurfacesPage />);
      const xlTexts = getAllByText("XL");
      expect(xlTexts.length).toBeGreaterThan(0);
      expect(getByText("elevation: 12")).toBeTruthy();
    });
  });

  describe("Border Radius section", () => {
    it("should render Border Radius section title", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(getByText("Border Radius")).toBeTruthy();
    });

    it("should render Border Radius description", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(
        getByText("Consistent corner rounding for cohesive design."),
      ).toBeTruthy();
    });

    it("should render all border radius values", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(getByText("SM (4px)")).toBeTruthy();
      expect(getByText("Default (8px)")).toBeTruthy();
      expect(getByText("MD (10px)")).toBeTruthy();
      expect(getByText("LG (14px)")).toBeTruthy();
      expect(getByText("XL (18px)")).toBeTruthy();
      expect(getByText("2XL (24px)")).toBeTruthy();
      expect(getByText("Full")).toBeTruthy();
    });
  });

  describe("Card Variants section", () => {
    it("should render Card Variants section title", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(getByText("Card Variants")).toBeTruthy();
    });

    it("should render Card Variants description", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(
        getByText("Different card styles for various use cases."),
      ).toBeTruthy();
    });

    it("should render Default card", () => {
      const { getAllByText, getByText } = render(<SurfacesPage />);
      const defaultTexts = getAllByText("Default");
      expect(defaultTexts.length).toBeGreaterThan(0);
      expect(getByText("Standard card with border")).toBeTruthy();
    });

    it("should render Glass card", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(getByText("Glass")).toBeTruthy();
      expect(getByText("Transparent glass effect")).toBeTruthy();
    });

    it("should render Elevated card", () => {
      const { getByText } = render(<SurfacesPage />);
      expect(getByText("Elevated")).toBeTruthy();
      expect(getByText("Raised with shadow")).toBeTruthy();
    });
  });
});
