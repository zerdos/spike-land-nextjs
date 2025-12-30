/**
 * Tests for Colors Storybook Page
 * Ensures color palette renders correctly
 */

import { render } from "@testing-library/react-native";
import React from "react";

import ColorsPage from "../../../app/storybook/colors";

describe("ColorsPage", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Colors")).toBeTruthy();
    });

    it("should render the subtitle", () => {
      const { getByText } = render(<ColorsPage />);
      expect(
        getByText("Color palette, brand colors, dark/light modes, glow effects"),
      ).toBeTruthy();
    });
  });

  describe("Brand Colors section", () => {
    it("should render Brand Colors section title", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Brand Colors")).toBeTruthy();
    });

    it("should render Brand Colors description", () => {
      const { getByText } = render(<ColorsPage />);
      expect(
        getByText("Core brand colors that define the spike.land identity."),
      ).toBeTruthy();
    });

    it("should render Pixel Cyan color", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Pixel Cyan")).toBeTruthy();
      expect(getByText("Primary brand accent")).toBeTruthy();
    });

    it("should render Pixel Fuchsia color", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Pixel Fuchsia")).toBeTruthy();
      expect(getByText("Secondary accent")).toBeTruthy();
    });
  });

  describe("Semantic Colors section", () => {
    it("should render Semantic Colors section title", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Semantic Colors")).toBeTruthy();
    });

    it("should render Semantic Colors description", () => {
      const { getByText } = render(<ColorsPage />);
      expect(
        getByText("Colors that convey meaning and system states."),
      ).toBeTruthy();
    });

    it("should render Success color", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Success")).toBeTruthy();
      expect(getByText("Positive actions & states")).toBeTruthy();
    });

    it("should render Warning color", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Warning")).toBeTruthy();
      expect(getByText("Cautionary information")).toBeTruthy();
    });

    it("should render Destructive color", () => {
      const { getAllByText, getByText } = render(<ColorsPage />);
      const destructiveTexts = getAllByText("Destructive");
      expect(destructiveTexts.length).toBeGreaterThan(0);
      expect(getByText("Errors & deletions")).toBeTruthy();
    });
  });

  describe("Surface Colors section", () => {
    it("should render Surface Colors section title", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Surface Colors")).toBeTruthy();
    });

    it("should render Surface Colors description", () => {
      const { getByText } = render(<ColorsPage />);
      expect(
        getByText("Background and container colors for layering."),
      ).toBeTruthy();
    });

    it("should render Background color", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Background")).toBeTruthy();
      expect(getByText("Main background")).toBeTruthy();
    });

    it("should render Card color", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Card")).toBeTruthy();
      expect(getByText("Elevated surfaces")).toBeTruthy();
    });

    it("should render Muted color", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Muted")).toBeTruthy();
      expect(getByText("Subtle backgrounds")).toBeTruthy();
    });
  });

  describe("Text & Border Colors section", () => {
    it("should render Text & Border Colors section title", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Text & Border Colors")).toBeTruthy();
    });

    it("should render Text & Border Colors description", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Typography and outline colors.")).toBeTruthy();
    });

    it("should render Foreground color", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Foreground")).toBeTruthy();
      expect(getByText("Primary text")).toBeTruthy();
    });

    it("should render Muted Foreground color", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Muted Foreground")).toBeTruthy();
      expect(getByText("Secondary text")).toBeTruthy();
    });

    it("should render Border color", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Border")).toBeTruthy();
      expect(getByText("Dividers & outlines")).toBeTruthy();
    });
  });

  describe("Glow Effects section", () => {
    it("should render Glow Effects section title", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Glow Effects")).toBeTruthy();
    });

    it("should render Glow Effects description", () => {
      const { getByText } = render(<ColorsPage />);
      expect(
        getByText("Accent glows for highlighting interactive elements."),
      ).toBeTruthy();
    });

    it("should render Cyan Glow", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Cyan Glow")).toBeTruthy();
    });

    it("should render Fuchsia Glow", () => {
      const { getByText } = render(<ColorsPage />);
      expect(getByText("Fuchsia Glow")).toBeTruthy();
    });
  });
});
