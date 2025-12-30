/**
 * Tests for Typography Storybook Page
 * Ensures typography scale and text styles render correctly
 */

import { render } from "@testing-library/react-native";
import React from "react";

import TypographyPage from "../../../app/storybook/typography";

describe("TypographyPage", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      const { getByText } = render(<TypographyPage />);
      expect(getByText("Typography")).toBeTruthy();
    });

    it("should render the subtitle", () => {
      const { getByText } = render(<TypographyPage />);
      expect(
        getByText("Font families, heading scale, text colors"),
      ).toBeTruthy();
    });
  });

  describe("Heading Scale section", () => {
    it("should render Heading Scale section title", () => {
      const { getByText } = render(<TypographyPage />);
      expect(getByText("Heading Scale")).toBeTruthy();
    });

    it("should render all heading levels", () => {
      const { getByText } = render(<TypographyPage />);
      expect(getByText("Heading 1 (2xl)")).toBeTruthy();
      expect(getByText("Heading 2 (xl)")).toBeTruthy();
      expect(getByText("Heading 3 (lg)")).toBeTruthy();
      expect(getByText("Heading 4 (base)")).toBeTruthy();
      expect(getByText("Heading 5 (sm)")).toBeTruthy();
      expect(getByText("Heading 6 (xs)")).toBeTruthy();
    });
  });

  describe("Font Sizes section", () => {
    it("should render Font Sizes section title", () => {
      const { getByText } = render(<TypographyPage />);
      expect(getByText("Font Sizes")).toBeTruthy();
    });

    it("should render all font size examples", () => {
      const { getByText } = render(<TypographyPage />);
      expect(getByText("XS (12px)")).toBeTruthy();
      expect(getByText("SM (14px)")).toBeTruthy();
      expect(getByText("Base (16px)")).toBeTruthy();
      expect(getByText("LG (18px)")).toBeTruthy();
      expect(getByText("XL (20px)")).toBeTruthy();
      expect(getByText("2XL (24px)")).toBeTruthy();
    });

    it("should render font size values", () => {
      const { getByText } = render(<TypographyPage />);
      expect(getByText("fontSize.xs")).toBeTruthy();
      expect(getByText("fontSize.sm")).toBeTruthy();
      expect(getByText("fontSize.base")).toBeTruthy();
      expect(getByText("fontSize.lg")).toBeTruthy();
      expect(getByText("fontSize.xl")).toBeTruthy();
      expect(getByText('fontSize["2xl"]')).toBeTruthy();
    });
  });

  describe("Font Weights section", () => {
    it("should render Font Weights section title", () => {
      const { getByText } = render(<TypographyPage />);
      expect(getByText("Font Weights")).toBeTruthy();
    });

    it("should render all font weight examples", () => {
      const { getByText } = render(<TypographyPage />);
      expect(getByText("Normal (400)")).toBeTruthy();
      expect(getByText("Medium (500)")).toBeTruthy();
      expect(getByText("Semibold (600)")).toBeTruthy();
      expect(getByText("Bold (700)")).toBeTruthy();
      expect(getByText("Extra Bold (800)")).toBeTruthy();
    });
  });

  describe("Text Colors section", () => {
    it("should render Text Colors section title", () => {
      const { getByText } = render(<TypographyPage />);
      expect(getByText("Text Colors")).toBeTruthy();
    });

    it("should render all text color examples", () => {
      const { getByText } = render(<TypographyPage />);
      expect(getByText("Primary Text (foreground)")).toBeTruthy();
      expect(getByText("Secondary Text (muted)")).toBeTruthy();
      expect(getByText("Accent Text (primary)")).toBeTruthy();
      expect(getByText("Error Text (destructive)")).toBeTruthy();
      expect(getByText("Success Text (success)")).toBeTruthy();
    });
  });

  describe("Paragraph Text section", () => {
    it("should render Paragraph Text section title", () => {
      const { getByText } = render(<TypographyPage />);
      expect(getByText("Paragraph Text")).toBeTruthy();
    });

    it("should render paragraph example", () => {
      const { getByText } = render(<TypographyPage />);
      expect(
        getByText(
          /The spike\.land design system uses a carefully crafted typography scale/,
        ),
      ).toBeTruthy();
    });
  });
});
