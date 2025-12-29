/**
 * Tests for Buttons Storybook Page
 * Ensures button variants, sizes, and states render correctly
 */

import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import ButtonsPage from "../../../app/storybook/buttons";

describe("ButtonsPage", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Buttons")).toBeTruthy();
    });

    it("should render the subtitle", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(
        getByText("Button variants, sizes, states, loading indicators"),
      ).toBeTruthy();
    });
  });

  describe("Variants section", () => {
    it("should render Variants section title", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Variants")).toBeTruthy();
    });

    it("should render Variants description", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(
        getByText("Different button styles for various actions."),
      ).toBeTruthy();
    });

    it("should render Primary button", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Primary")).toBeTruthy();
    });

    it("should render Secondary button", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Secondary")).toBeTruthy();
    });

    it("should render Outline button", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Outline")).toBeTruthy();
    });

    it("should render Ghost button", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Ghost")).toBeTruthy();
    });

    it("should render Destructive button", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Destructive")).toBeTruthy();
    });
  });

  describe("Sizes section", () => {
    it("should render Sizes section title", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Sizes")).toBeTruthy();
    });

    it("should render Sizes description", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Three sizes for different contexts.")).toBeTruthy();
    });

    it("should render Small button with size label", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Small")).toBeTruthy();
      expect(getByText("36px height")).toBeTruthy();
    });

    it("should render Medium button with size label", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Medium")).toBeTruthy();
      expect(getByText("44px height")).toBeTruthy();
    });

    it("should render Large button with size label", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Large")).toBeTruthy();
      expect(getByText("52px height")).toBeTruthy();
    });
  });

  describe("States section", () => {
    it("should render States section title", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("States")).toBeTruthy();
    });

    it("should render States description", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Interactive states and accessibility.")).toBeTruthy();
    });

    it("should render Default button", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Default")).toBeTruthy();
    });

    it("should render Disabled button", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Disabled")).toBeTruthy();
    });

    it("should render Click to Load button", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Click to Load")).toBeTruthy();
    });

    it("should handle loading button press", () => {
      const { getByText } = render(<ButtonsPage />);
      const loadButton = getByText("Click to Load");
      expect(loadButton).toBeTruthy();
      // Press the button - the loading state is handled internally
      fireEvent.press(loadButton);
      // Button should still be present and interactive
      expect(loadButton).toBeTruthy();
    });
  });

  describe("With Icons section", () => {
    it("should render With Icons section title", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("With Icons")).toBeTruthy();
    });

    it("should render With Icons description", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(
        getByText("Buttons can include icons for enhanced UX."),
      ).toBeTruthy();
    });

    it("should render Add Item button", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Add Item")).toBeTruthy();
    });

    it("should render Next Step button", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Next Step")).toBeTruthy();
    });

    it("should render Delete button", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Delete")).toBeTruthy();
    });
  });

  describe("Full Width section", () => {
    it("should render Full Width section title", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Full Width")).toBeTruthy();
    });

    it("should render Full Width description", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(
        getByText("Buttons that span the full container width."),
      ).toBeTruthy();
    });

    it("should render Full Width Primary button", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Full Width Primary")).toBeTruthy();
    });

    it("should render Full Width Outline button", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Full Width Outline")).toBeTruthy();
    });
  });

  describe("Usage Guidelines section", () => {
    it("should render Usage Guidelines section title", () => {
      const { getAllByText } = render(<ButtonsPage />);
      const titles = getAllByText("Usage Guidelines");
      expect(titles.length).toBeGreaterThan(0);
    });

    it("should render usage guidelines", () => {
      const { getByText } = render(<ButtonsPage />);
      expect(getByText("Use primary buttons for main actions")).toBeTruthy();
      expect(getByText("Limit one primary button per view")).toBeTruthy();
      expect(
        getByText("Use destructive variant for dangerous actions"),
      ).toBeTruthy();
      expect(
        getByText("Avoid using multiple button styles together"),
      ).toBeTruthy();
    });
  });
});
