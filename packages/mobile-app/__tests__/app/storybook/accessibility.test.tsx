/**
 * Tests for Accessibility Storybook Page
 * Ensures WCAG compliance info and accessibility features render correctly
 */

import { render } from "@testing-library/react-native";
import React from "react";

import AccessibilityPage from "../../../app/storybook/accessibility";

describe("AccessibilityPage", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(getByText("Accessibility")).toBeTruthy();
    });

    it("should render the subtitle", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(
        getByText("Contrast checker, keyboard navigation, ARIA attributes"),
      ).toBeTruthy();
    });
  });

  describe("WCAG 2.1 Compliance section", () => {
    it("should render WCAG Compliance section title", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(getByText("WCAG 2.1 Compliance")).toBeTruthy();
    });

    it("should render WCAG Compliance description", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(
        getByText("Our design system follows WCAG 2.1 Level AA guidelines."),
      ).toBeTruthy();
    });

    it("should render Color Contrast compliance item", () => {
      const { getAllByText, getByText } = render(<AccessibilityPage />);
      const colorContrastTexts = getAllByText("Color Contrast");
      expect(colorContrastTexts.length).toBeGreaterThan(0);
      expect(getByText("All text meets 4.5:1 contrast ratio")).toBeTruthy();
    });

    it("should render Touch Targets compliance item", () => {
      const { getAllByText, getByText } = render(<AccessibilityPage />);
      const touchTargetTexts = getAllByText("Touch Targets");
      expect(touchTargetTexts.length).toBeGreaterThan(0);
      expect(getByText("Minimum 44x44 pixel touch targets")).toBeTruthy();
    });

    it("should render Focus Indicators compliance item", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(getByText("Focus Indicators")).toBeTruthy();
      expect(getByText("Visible focus states for all controls")).toBeTruthy();
    });

    it("should render AA badges", () => {
      const { getAllByText } = render(<AccessibilityPage />);
      const aaBadges = getAllByText("AA");
      expect(aaBadges.length).toBe(3);
    });
  });

  describe("Color Contrast section", () => {
    it("should render Color Contrast section title", () => {
      const { getAllByText } = render(<AccessibilityPage />);
      const colorContrastTexts = getAllByText("Color Contrast");
      expect(colorContrastTexts.length).toBeGreaterThan(0);
    });

    it("should render Color Contrast section description", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(
        getByText("All color combinations meet WCAG AA requirements."),
      ).toBeTruthy();
    });

    it("should render Text on Background contrast", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(getByText("Text on Background")).toBeTruthy();
      expect(getByText("15.8:1")).toBeTruthy();
    });

    it("should render Text on Primary contrast", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(getByText("Text on Primary")).toBeTruthy();
      expect(getByText("8.2:1")).toBeTruthy();
    });

    it("should render Muted on Card contrast", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(getByText("Muted on Card")).toBeTruthy();
      expect(getByText("4.6:1")).toBeTruthy();
    });
  });

  describe("Touch Targets section", () => {
    it("should render Touch Targets section title", () => {
      const { getAllByText } = render(<AccessibilityPage />);
      const touchTargetTexts = getAllByText("Touch Targets");
      expect(touchTargetTexts.length).toBeGreaterThan(0);
    });

    it("should render Touch Targets section description", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(
        getByText("Interactive elements with proper sizing for mobile."),
      ).toBeTruthy();
    });

    it("should render Minimum size row", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(getByText("Minimum (44px)")).toBeTruthy();
      expect(getByText("Required for buttons and icons")).toBeTruthy();
    });

    it("should render Comfortable size row", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(getByText("Comfortable (48px)")).toBeTruthy();
      expect(getByText("Recommended for primary actions")).toBeTruthy();
    });

    it("should render Large size row", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(getByText("Large (56px)")).toBeTruthy();
      expect(getByText("For FABs and important CTAs")).toBeTruthy();
    });
  });

  describe("Accessibility Roles section", () => {
    it("should render Accessibility Roles section title", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(getByText("Accessibility Roles")).toBeTruthy();
    });

    it("should render Accessibility Roles section description", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(
        getByText("Semantic roles for screen reader compatibility."),
      ).toBeTruthy();
    });

    it("should render button role", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(getByText('accessibilityRole="button"')).toBeTruthy();
      expect(getByText("Interactive elements that perform actions"))
        .toBeTruthy();
    });

    it("should render header role", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(getByText('accessibilityRole="header"')).toBeTruthy();
      expect(getByText("Section titles and headings")).toBeTruthy();
    });

    it("should render link role", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(getByText('accessibilityRole="link"')).toBeTruthy();
      expect(getByText("Navigation links")).toBeTruthy();
    });

    it("should render alert role", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(getByText('accessibilityRole="alert"')).toBeTruthy();
      expect(getByText("Important announcements")).toBeTruthy();
    });
  });

  describe("Best Practices section", () => {
    it("should render Best Practices section title", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(getByText("Best Practices")).toBeTruthy();
    });

    it("should render positive guidelines", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(
        getByText("Always provide accessibilityLabel for icons and images"),
      ).toBeTruthy();
      expect(
        getByText("Use semantic heading levels in proper order"),
      ).toBeTruthy();
      expect(
        getByText("Ensure focus order follows visual layout"),
      ).toBeTruthy();
      expect(
        getByText("Provide text alternatives for non-text content"),
      ).toBeTruthy();
    });

    it("should render negative guidelines", () => {
      const { getByText } = render(<AccessibilityPage />);
      expect(
        getByText("Don't rely solely on color to convey meaning"),
      ).toBeTruthy();
      expect(
        getByText("Don't disable zoom or text scaling"),
      ).toBeTruthy();
    });
  });
});
