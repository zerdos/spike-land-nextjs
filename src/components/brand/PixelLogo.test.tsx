import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PixelLogo } from "./PixelLogo";

describe("PixelLogo", () => {
  describe("rendering", () => {
    it("renders the logo with default props", () => {
      render(<PixelLogo />);
      expect(screen.getByText("pixel")).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Pixel logo" }))
        .toBeInTheDocument();
    });

    it("renders SVG element", () => {
      const { container } = render(<PixelLogo />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("renders all 9 grid cells in the SVG", () => {
      const { container } = render(<PixelLogo />);
      const rects = container.querySelectorAll("svg rect");
      expect(rects.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe("variants", () => {
    it("renders icon-only variant without text", () => {
      render(<PixelLogo variant="icon" />);
      expect(screen.queryByText("pixel")).not.toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Pixel logo" }))
        .toBeInTheDocument();
    });

    it("renders horizontal variant with text", () => {
      render(<PixelLogo variant="horizontal" />);
      expect(screen.getByText("pixel")).toBeInTheDocument();
    });

    it("renders stacked variant with text", () => {
      render(<PixelLogo variant="stacked" />);
      expect(screen.getByText("pixel")).toBeInTheDocument();
    });

    it("stacked variant has flex-col class", () => {
      const { container } = render(<PixelLogo variant="stacked" />);
      expect(container.firstChild).toHaveClass("flex-col");
    });
  });

  describe("sizes", () => {
    it("renders small size", () => {
      const { container } = render(<PixelLogo size="sm" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "32");
      expect(svg).toHaveAttribute("height", "32");
    });

    it("renders medium size (default)", () => {
      const { container } = render(<PixelLogo size="md" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "48");
      expect(svg).toHaveAttribute("height", "48");
    });

    it("renders large size", () => {
      const { container } = render(<PixelLogo size="lg" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "64");
      expect(svg).toHaveAttribute("height", "64");
    });

    it("renders xl size", () => {
      const { container } = render(<PixelLogo size="xl" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "96");
      expect(svg).toHaveAttribute("height", "96");
    });
  });

  describe("showText prop", () => {
    it("hides text when showText is false", () => {
      render(<PixelLogo showText={false} />);
      expect(screen.queryByText("pixel")).not.toBeInTheDocument();
    });

    it("shows text when showText is true (default)", () => {
      render(<PixelLogo showText={true} />);
      expect(screen.getByText("pixel")).toBeInTheDocument();
    });

    it("icon variant ignores showText=true", () => {
      render(<PixelLogo variant="icon" showText={true} />);
      expect(screen.queryByText("pixel")).not.toBeInTheDocument();
    });
  });

  describe("className prop", () => {
    it("applies custom className to container", () => {
      const { container } = render(<PixelLogo className="custom-class" />);
      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("merges custom className with default classes", () => {
      const { container } = render(<PixelLogo className="my-custom-class" />);
      expect(container.firstChild).toHaveClass("inline-flex");
      expect(container.firstChild).toHaveClass("my-custom-class");
    });
  });

  describe("accessibility", () => {
    it("has correct aria-label", () => {
      render(<PixelLogo />);
      expect(screen.getByRole("img", { name: "Pixel logo" }))
        .toBeInTheDocument();
    });

    it("SVG has aria-hidden attribute", () => {
      const { container } = render(<PixelLogo />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("SVG structure", () => {
    it("contains glow filter definition", () => {
      const { container } = render(<PixelLogo />);
      const filter = container.querySelector("filter");
      expect(filter).toBeInTheDocument();
    });

    it("contains gradient definitions", () => {
      const { container } = render(<PixelLogo />);
      const radialGradient = container.querySelector("radialGradient");
      const linearGradient = container.querySelector("linearGradient");
      expect(radialGradient).toBeInTheDocument();
      expect(linearGradient).toBeInTheDocument();
    });

    it("has unique IDs for multiple instances to avoid conflicts", () => {
      const { container } = render(
        <>
          <PixelLogo size="md" />
          <PixelLogo size="md" />
        </>,
      );

      const filters = container.querySelectorAll("filter");
      const filterIds = Array.from(filters).map((f) => f.id);

      // Each filter should have a unique ID (using React's useId())
      expect(filters.length).toBe(2);
      expect(filterIds[0]).not.toBe(filterIds[1]);
    });
  });

  describe("wordmark styling", () => {
    it("has font-heading class for Montserrat", () => {
      render(<PixelLogo />);
      const wordmark = screen.getByText("pixel");
      expect(wordmark).toHaveClass("font-heading");
    });

    it("has font-bold class", () => {
      render(<PixelLogo />);
      const wordmark = screen.getByText("pixel");
      expect(wordmark).toHaveClass("font-bold");
    });

    it("has lowercase class", () => {
      render(<PixelLogo />);
      const wordmark = screen.getByText("pixel");
      expect(wordmark).toHaveClass("lowercase");
    });

    it("applies correct text size for each size variant", () => {
      const { rerender } = render(<PixelLogo size="sm" />);
      expect(screen.getByText("pixel")).toHaveClass("text-lg");

      rerender(<PixelLogo size="md" />);
      expect(screen.getByText("pixel")).toHaveClass("text-xl");

      rerender(<PixelLogo size="lg" />);
      expect(screen.getByText("pixel")).toHaveClass("text-2xl");

      rerender(<PixelLogo size="xl" />);
      expect(screen.getByText("pixel")).toHaveClass("text-4xl");
    });
  });
});
