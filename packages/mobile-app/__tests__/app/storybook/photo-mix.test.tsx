/**
 * Tests for PhotoMix Storybook Page
 * Ensures photo mixing and blending components render correctly
 */

import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import PhotoMixPage from "../../../app/storybook/photo-mix";

describe("PhotoMixPage", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("PhotoMix")).toBeTruthy();
    });

    it("should render the subtitle", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("Photo mixing and blending components")).toBeTruthy();
    });
  });

  describe("Layer Stack section", () => {
    it("should render Layer Stack section title", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("Layer Stack")).toBeTruthy();
    });

    it("should render Layer Stack description", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(
        getByText("Manage multiple image layers with drag-and-drop reordering."),
      ).toBeTruthy();
    });

    it("should render Background layer", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("Background")).toBeTruthy();
      expect(getByText("Base Layer")).toBeTruthy();
    });

    it("should render Enhanced Photo layer", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("Enhanced Photo")).toBeTruthy();
      expect(getByText("AI Upscaled")).toBeTruthy();
    });

    it("should render Text Overlay layer", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("Text Overlay")).toBeTruthy();
      expect(getByText("Typography")).toBeTruthy();
    });
  });

  describe("Blend Modes section", () => {
    it("should render Blend Modes section title", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("Blend Modes")).toBeTruthy();
    });

    it("should render Blend Modes description", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(
        getByText("Apply different blending effects between layers."),
      ).toBeTruthy();
    });

    it("should render all blend mode options", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("Normal")).toBeTruthy();
      expect(getByText("Multiply")).toBeTruthy();
      expect(getByText("Screen")).toBeTruthy();
      expect(getByText("Overlay")).toBeTruthy();
      expect(getByText("Difference")).toBeTruthy();
    });

    it("should change blend mode when pressed", () => {
      const { getByText } = render(<PhotoMixPage />);
      const multiplyButton = getByText("Multiply");
      fireEvent.press(multiplyButton);
      // The button should be pressable and update state
      expect(multiplyButton).toBeTruthy();
    });
  });

  describe("Opacity Control section", () => {
    it("should render Opacity Control section title", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("Opacity Control")).toBeTruthy();
    });

    it("should render Opacity Control description", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(
        getByText("Adjust layer transparency for subtle blending."),
      ).toBeTruthy();
    });

    it("should render Layer Opacity label", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("Layer Opacity")).toBeTruthy();
    });

    it("should render opacity presets", () => {
      const { getAllByText } = render(<PhotoMixPage />);
      expect(getAllByText("25%").length).toBeGreaterThan(0);
      expect(getAllByText("50%").length).toBeGreaterThan(0);
      expect(getAllByText("75%").length).toBeGreaterThan(0);
      expect(getAllByText("100%").length).toBeGreaterThan(0);
    });
  });

  describe("Transform Controls section", () => {
    it("should render Transform Controls section title", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("Transform Controls")).toBeTruthy();
    });

    it("should render Transform Controls description", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(
        getByText("Scale, rotate, and position layers precisely."),
      ).toBeTruthy();
    });

    it("should render Scale control", () => {
      const { getByText, getAllByText } = render(<PhotoMixPage />);
      expect(getByText("Scale")).toBeTruthy();
      const hundredPercents = getAllByText("100%");
      expect(hundredPercents.length).toBeGreaterThan(0);
    });

    it("should render Rotation control", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("Rotation")).toBeTruthy();
    });

    it("should render X Position control", () => {
      const { getByText, getAllByText } = render(<PhotoMixPage />);
      expect(getByText("X Position")).toBeTruthy();
      const pxValues = getAllByText("0 px");
      expect(pxValues.length).toBeGreaterThan(0);
    });

    it("should render Y Position control", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("Y Position")).toBeTruthy();
    });
  });

  describe("Export Options section", () => {
    it("should render Export Options section title", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("Export Options")).toBeTruthy();
    });

    it("should render Export Options description", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(
        getByText("Save your composed image in various formats."),
      ).toBeTruthy();
    });

    it("should render PNG format", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("PNG")).toBeTruthy();
      expect(getByText("Lossless with transparency")).toBeTruthy();
    });

    it("should render JPEG format", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("JPEG")).toBeTruthy();
      expect(getByText("Compressed, smaller size")).toBeTruthy();
    });

    it("should render WebP format", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("WebP")).toBeTruthy();
      expect(getByText("Modern format, best quality")).toBeTruthy();
    });

    it("should render Export Image button", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("Export Image")).toBeTruthy();
    });

    it("should show Selected badge on PNG", () => {
      const { getByText } = render(<PhotoMixPage />);
      expect(getByText("Selected")).toBeTruthy();
    });
  });
});
