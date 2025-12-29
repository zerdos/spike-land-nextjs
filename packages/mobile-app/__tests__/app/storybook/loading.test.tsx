/**
 * Tests for Loading Storybook Page
 * Ensures skeleton loaders, progress bars, and spinners render correctly
 */

import { render } from "@testing-library/react-native";
import React from "react";

import LoadingPage from "../../../app/storybook/loading";

describe("LoadingPage", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      const { getByText } = render(<LoadingPage />);
      expect(getByText("Loading")).toBeTruthy();
    });

    it("should render the subtitle", () => {
      const { getByText } = render(<LoadingPage />);
      expect(
        getByText("Skeleton loaders, progress bars, spinners/animations"),
      ).toBeTruthy();
    });
  });

  describe("Spinners section", () => {
    it("should render Spinners section title", () => {
      const { getByText } = render(<LoadingPage />);
      expect(getByText("Spinners")).toBeTruthy();
    });

    it("should render Spinners description", () => {
      const { getByText } = render(<LoadingPage />);
      expect(
        getByText("Activity indicators for indeterminate loading states."),
      ).toBeTruthy();
    });

    it("should render Small spinner label", () => {
      const { getByText } = render(<LoadingPage />);
      expect(getByText("Small")).toBeTruthy();
    });

    it("should render Large spinner label", () => {
      const { getByText } = render(<LoadingPage />);
      expect(getByText("Large")).toBeTruthy();
    });

    it("should render Muted spinner label", () => {
      const { getByText } = render(<LoadingPage />);
      expect(getByText("Muted")).toBeTruthy();
    });
  });

  describe("Progress Bars section", () => {
    it("should render Progress Bars section title", () => {
      const { getByText } = render(<LoadingPage />);
      expect(getByText("Progress Bars")).toBeTruthy();
    });

    it("should render Progress Bars description", () => {
      const { getByText } = render(<LoadingPage />);
      expect(
        getByText("Determinate progress indicators with percentage."),
      ).toBeTruthy();
    });

    it("should render Uploading progress", () => {
      const { getByText, getAllByText } = render(<LoadingPage />);
      expect(getByText("Uploading...")).toBeTruthy();
      const percent25 = getAllByText("25%");
      expect(percent25.length).toBeGreaterThan(0);
    });

    it("should render Processing progress", () => {
      const { getByText } = render(<LoadingPage />);
      expect(getByText("Processing...")).toBeTruthy();
      expect(getByText("60%")).toBeTruthy();
    });

    it("should render Complete progress", () => {
      const { getAllByText } = render(<LoadingPage />);
      const completeTexts = getAllByText("Complete");
      expect(completeTexts.length).toBeGreaterThan(0);
      const hundredPercents = getAllByText("100%");
      expect(hundredPercents.length).toBeGreaterThan(0);
    });
  });

  describe("Skeleton Cards section", () => {
    it("should render Skeleton Cards section title", () => {
      const { getByText } = render(<LoadingPage />);
      expect(getByText("Skeleton Cards")).toBeTruthy();
    });

    it("should render Skeleton Cards description", () => {
      const { getByText } = render(<LoadingPage />);
      expect(getByText("Placeholder content while data loads.")).toBeTruthy();
    });
  });

  describe("Skeleton List section", () => {
    it("should render Skeleton List section title", () => {
      const { getByText } = render(<LoadingPage />);
      expect(getByText("Skeleton List")).toBeTruthy();
    });

    it("should render Skeleton List description", () => {
      const { getByText } = render(<LoadingPage />);
      expect(getByText("List item placeholders for tabular data.")).toBeTruthy();
    });
  });

  describe("Circular Progress section", () => {
    it("should render Circular Progress section title", () => {
      const { getByText } = render(<LoadingPage />);
      expect(getByText("Circular Progress")).toBeTruthy();
    });

    it("should render Circular Progress description", () => {
      const { getByText } = render(<LoadingPage />);
      expect(
        getByText("Radial progress indicators for compact spaces."),
      ).toBeTruthy();
    });

    it("should render Starting circular progress", () => {
      const { getByText, getAllByText } = render(<LoadingPage />);
      expect(getByText("Starting")).toBeTruthy();
      const percent25 = getAllByText("25%");
      expect(percent25.length).toBeGreaterThan(0);
    });

    it("should render Halfway circular progress", () => {
      const { getByText } = render(<LoadingPage />);
      expect(getByText("Halfway")).toBeTruthy();
      expect(getByText("50%")).toBeTruthy();
    });

    it("should render Complete circular progress", () => {
      const { getAllByText } = render(<LoadingPage />);
      const completeTexts = getAllByText("Complete");
      expect(completeTexts.length).toBeGreaterThan(0);
      const hundredPercents = getAllByText("100%");
      expect(hundredPercents.length).toBeGreaterThan(0);
    });
  });
});
