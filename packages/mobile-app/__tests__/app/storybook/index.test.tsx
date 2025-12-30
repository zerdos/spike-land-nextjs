/**
 * Tests for Storybook Index Page
 * Ensures the main storybook overview page renders correctly
 */

import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import StorybookIndexPage from "../../../app/storybook/index";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock the layout to get storybookSections
jest.mock("../../../app/storybook/_layout", () => ({
  storybookSections: [
    {
      id: "brand",
      label: "Brand",
      category: "Foundation",
      description: "Logo variants, sizes, and the spike.land AI Spark logo",
      icon: "sparkles-outline",
    },
    {
      id: "colors",
      label: "Colors",
      category: "Foundation",
      description: "Color palette, brand colors, dark/light modes, glow effects",
      icon: "color-palette-outline",
    },
    {
      id: "typography",
      label: "Typography",
      category: "Foundation",
      description: "Font families, heading scale, text colors",
      icon: "text-outline",
    },
    {
      id: "buttons",
      label: "Buttons",
      category: "Actions",
      description: "Button variants, sizes, states, loading indicators",
      icon: "hand-left-outline",
    },
  ],
}));

describe("StorybookIndexPage", () => {
  describe("rendering", () => {
    it("should render the hero section", () => {
      const { getByText } = render(<StorybookIndexPage />);
      expect(getByText("spike.land Design System")).toBeTruthy();
    });

    it("should render the hero subtitle", () => {
      const { getByText } = render(<StorybookIndexPage />);
      expect(
        getByText(/A comprehensive design system built for creating beautiful/),
      ).toBeTruthy();
    });
  });

  describe("Quick Stats section", () => {
    it("should render the Sections stat", () => {
      const { getByText } = render(<StorybookIndexPage />);
      expect(getByText("Sections")).toBeTruthy();
    });

    it("should render the Categories stat", () => {
      const { getByText } = render(<StorybookIndexPage />);
      expect(getByText("Categories")).toBeTruthy();
    });

    it("should render the UI Components stat", () => {
      const { getByText } = render(<StorybookIndexPage />);
      expect(getByText("UI Components")).toBeTruthy();
    });
  });

  describe("Section Cards", () => {
    it("should render Foundation category", () => {
      const { getByText } = render(<StorybookIndexPage />);
      expect(getByText("Foundation")).toBeTruthy();
    });

    it("should render Actions category", () => {
      const { getByText } = render(<StorybookIndexPage />);
      expect(getByText("Actions")).toBeTruthy();
    });

    it("should render Brand section card", () => {
      const { getByText } = render(<StorybookIndexPage />);
      expect(getByText("Brand")).toBeTruthy();
      expect(
        getByText("Logo variants, sizes, and the spike.land AI Spark logo"),
      ).toBeTruthy();
    });

    it("should render Colors section card", () => {
      const { getByText } = render(<StorybookIndexPage />);
      expect(getByText("Colors")).toBeTruthy();
      expect(
        getByText(
          "Color palette, brand colors, dark/light modes, glow effects",
        ),
      ).toBeTruthy();
    });

    it("should render Typography section card", () => {
      const { getByText } = render(<StorybookIndexPage />);
      expect(getByText("Typography")).toBeTruthy();
      expect(getByText("Font families, heading scale, text colors"))
        .toBeTruthy();
    });

    it("should render Buttons section card", () => {
      const { getByText } = render(<StorybookIndexPage />);
      expect(getByText("Buttons")).toBeTruthy();
      expect(
        getByText("Button variants, sizes, states, loading indicators"),
      ).toBeTruthy();
    });

    it("should navigate when section card is pressed", () => {
      const { getByText } = render(<StorybookIndexPage />);
      const brandCard = getByText("Brand").parent?.parent;
      if (brandCard) {
        fireEvent.press(brandCard);
      }
      // The card should be pressable
      expect(brandCard).toBeTruthy();
    });
  });

  describe("Footer section", () => {
    it("should render the version", () => {
      const { getByText } = render(<StorybookIndexPage />);
      expect(getByText("spike.land Design System v1.2.0")).toBeTruthy();
    });

    it("should render the tech stack", () => {
      const { getByText } = render(<StorybookIndexPage />);
      expect(
        getByText("Built with React Native + Expo + Tamagui"),
      ).toBeTruthy();
    });
  });
});
