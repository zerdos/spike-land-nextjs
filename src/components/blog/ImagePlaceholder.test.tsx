import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ImagePlaceholder } from "./ImagePlaceholder";

describe("ImagePlaceholder", () => {
  describe("original type", () => {
    it("renders with description text", () => {
      render(
        <ImagePlaceholder
          description="Original photo before enhancement"
          type="original"
        />,
      );

      expect(screen.getByText("Original photo before enhancement")).toBeInTheDocument();
    });

    it("displays Original label", () => {
      render(
        <ImagePlaceholder
          description="Test description"
          type="original"
        />,
      );

      expect(screen.getByText("Original")).toBeInTheDocument();
    });

    it("has correct aria-label", () => {
      render(
        <ImagePlaceholder
          description="Test image description"
          type="original"
        />,
      );

      const placeholder = screen.getByRole("img");
      expect(placeholder).toHaveAttribute(
        "aria-label",
        "Image placeholder: Test image description",
      );
    });

    it("applies gray background styling", () => {
      render(
        <ImagePlaceholder
          description="Test"
          type="original"
        />,
      );

      const placeholder = screen.getByRole("img");
      expect(placeholder.className).toContain("bg-gray-100");
    });
  });

  describe("enhanced type", () => {
    it("renders with description text", () => {
      render(
        <ImagePlaceholder
          description="AI-enhanced result"
          type="enhanced"
        />,
      );

      expect(screen.getByText("AI-enhanced result")).toBeInTheDocument();
    });

    it("displays Enhanced label", () => {
      render(
        <ImagePlaceholder
          description="Test description"
          type="enhanced"
        />,
      );

      expect(screen.getByText("Enhanced")).toBeInTheDocument();
    });

    it("has correct aria-label", () => {
      render(
        <ImagePlaceholder
          description="Enhanced image description"
          type="enhanced"
        />,
      );

      const placeholder = screen.getByRole("img");
      expect(placeholder).toHaveAttribute(
        "aria-label",
        "Image placeholder: Enhanced image description",
      );
    });

    it("applies teal background styling", () => {
      render(
        <ImagePlaceholder
          description="Test"
          type="enhanced"
        />,
      );

      const placeholder = screen.getByRole("img");
      expect(placeholder.className).toContain("bg-teal-50");
    });
  });

  it("applies custom className", () => {
    render(
      <ImagePlaceholder
        description="Test"
        type="original"
        className="custom-class"
      />,
    );

    const placeholder = screen.getByRole("img");
    expect(placeholder.className).toContain("custom-class");
  });

  it("renders camera icon for original type", () => {
    const { container } = render(
      <ImagePlaceholder
        description="Test"
        type="original"
      />,
    );

    // Camera icon from lucide-react renders as an SVG
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders sparkle icon for enhanced type", () => {
    const { container } = render(
      <ImagePlaceholder
        description="Test"
        type="enhanced"
      />,
    );

    // Sparkles icon from lucide-react renders as an SVG
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
