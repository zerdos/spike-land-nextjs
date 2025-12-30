/**
 * Tests for brand components (PixelLogo and SpikeLandLogo)
 */

import { render, screen } from "@testing-library/react-native";
import React from "react";

import { PixelLogo } from "../PixelLogo";
import { SpikeLandLogo } from "../SpikeLandLogo";

describe("PixelLogo", () => {
  describe("icon variant", () => {
    it("renders without text when variant is icon", () => {
      render(<PixelLogo variant="icon" />);
      expect(screen.queryByText("pixel")).toBeNull();
    });

    it("renders without text when showText is false", () => {
      render(<PixelLogo showText={false} />);
      expect(screen.queryByText("pixel")).toBeNull();
    });
  });

  describe("horizontal variant", () => {
    it("renders with text by default", () => {
      render(<PixelLogo variant="horizontal" />);
      expect(screen.getByText("pixel")).toBeTruthy();
    });

    it("renders text for all sizes", () => {
      const sizes = ["sm", "md", "lg", "xl"] as const;
      for (const size of sizes) {
        const { unmount } = render(
          <PixelLogo size={size} variant="horizontal" />,
        );
        expect(screen.getByText("pixel")).toBeTruthy();
        unmount();
      }
    });
  });

  describe("stacked variant", () => {
    it("renders with text", () => {
      render(<PixelLogo variant="stacked" />);
      expect(screen.getByText("pixel")).toBeTruthy();
    });
  });
});

describe("SpikeLandLogo", () => {
  describe("icon variant", () => {
    it("renders without text when variant is icon", () => {
      render(<SpikeLandLogo variant="icon" />);
      expect(screen.queryByText("spike.land")).toBeNull();
    });

    it("renders without text when showText is false", () => {
      render(<SpikeLandLogo showText={false} />);
      expect(screen.queryByText("spike.land")).toBeNull();
    });

    it("renders the flash icon", () => {
      render(<SpikeLandLogo variant="icon" />);
      expect(screen.getByTestId("spike-land-logo-icon")).toBeTruthy();
    });
  });

  describe("horizontal variant", () => {
    it("renders with text by default", () => {
      render(<SpikeLandLogo variant="horizontal" />);
      expect(screen.getByText("spike.land")).toBeTruthy();
    });

    it("renders text for all sizes", () => {
      const sizes = ["sm", "md", "lg", "xl"] as const;
      for (const size of sizes) {
        const { unmount } = render(
          <SpikeLandLogo size={size} variant="horizontal" />,
        );
        expect(screen.getByText("spike.land")).toBeTruthy();
        unmount();
      }
    });
  });

  describe("stacked variant", () => {
    it("renders with text", () => {
      render(<SpikeLandLogo variant="stacked" />);
      expect(screen.getByText("spike.land")).toBeTruthy();
    });
  });
});
