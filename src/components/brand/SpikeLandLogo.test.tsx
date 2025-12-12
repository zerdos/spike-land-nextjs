import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SpikeLandLogo } from "./SpikeLandLogo";

describe("SpikeLandLogo", () => {
  describe("rendering", () => {
    it("renders the logo with default props", () => {
      render(<SpikeLandLogo />);
      expect(screen.getByText("spike.land")).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Spike Land logo" })).toBeInTheDocument();
    });

    it("renders SVG element (Zap icon)", () => {
      const { container } = render(<SpikeLandLogo />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("variants", () => {
    it("renders icon-only variant without text", () => {
      render(<SpikeLandLogo variant="icon" />);
      expect(screen.queryByText("spike.land")).not.toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Spike Land logo" })).toBeInTheDocument();
    });

    it("renders horizontal variant with text", () => {
      render(<SpikeLandLogo variant="horizontal" />);
      expect(screen.getByText("spike.land")).toBeInTheDocument();
    });

    it("renders stacked variant with text", () => {
      render(<SpikeLandLogo variant="stacked" />);
      expect(screen.getByText("spike.land")).toBeInTheDocument();
    });

    it("stacked variant has flex-col class", () => {
      const { container } = render(<SpikeLandLogo variant="stacked" />);
      expect(container.firstChild).toHaveClass("flex-col");
    });
  });

  describe("sizes", () => {
    it("renders small size", () => {
      const { container } = render(<SpikeLandLogo size="sm" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "24");
      expect(svg).toHaveAttribute("height", "24");
    });

    it("renders medium size (default)", () => {
      const { container } = render(<SpikeLandLogo size="md" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "32");
      expect(svg).toHaveAttribute("height", "32");
    });

    it("renders large size", () => {
      const { container } = render(<SpikeLandLogo size="lg" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "48");
      expect(svg).toHaveAttribute("height", "48");
    });

    it("renders xl size", () => {
      const { container } = render(<SpikeLandLogo size="xl" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "64");
      expect(svg).toHaveAttribute("height", "64");
    });
  });

  describe("showText prop", () => {
    it("hides text when showText is false", () => {
      render(<SpikeLandLogo showText={false} />);
      expect(screen.queryByText("spike.land")).not.toBeInTheDocument();
    });

    it("shows text when showText is true (default)", () => {
      render(<SpikeLandLogo showText={true} />);
      expect(screen.getByText("spike.land")).toBeInTheDocument();
    });

    it("icon variant ignores showText=true", () => {
      render(<SpikeLandLogo variant="icon" showText={true} />);
      expect(screen.queryByText("spike.land")).not.toBeInTheDocument();
    });
  });

  describe("className prop", () => {
    it("applies custom className to container", () => {
      const { container } = render(<SpikeLandLogo className="custom-class" />);
      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("merges custom className with default classes", () => {
      const { container } = render(<SpikeLandLogo className="my-custom-class" />);
      expect(container.firstChild).toHaveClass("inline-flex");
      expect(container.firstChild).toHaveClass("my-custom-class");
    });
  });

  describe("accessibility", () => {
    it("has correct aria-label", () => {
      render(<SpikeLandLogo />);
      expect(screen.getByRole("img", { name: "Spike Land logo" })).toBeInTheDocument();
    });

    it("SVG has aria-hidden attribute", () => {
      const { container } = render(<SpikeLandLogo />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("icon styling", () => {
    it("Zap icon has fill-amber-400 class", () => {
      const { container } = render(<SpikeLandLogo />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("fill-amber-400");
    });

    it("Zap icon has stroke-amber-500 class", () => {
      const { container } = render(<SpikeLandLogo />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("stroke-amber-500");
    });

    it("Zap icon has flex-shrink-0 class", () => {
      const { container } = render(<SpikeLandLogo />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("flex-shrink-0");
    });
  });

  describe("wordmark styling", () => {
    it("has font-heading class for Montserrat", () => {
      render(<SpikeLandLogo />);
      const wordmark = screen.getByText("spike.land");
      expect(wordmark).toHaveClass("font-heading");
    });

    it("has font-bold class", () => {
      render(<SpikeLandLogo />);
      const wordmark = screen.getByText("spike.land");
      expect(wordmark).toHaveClass("font-bold");
    });

    it("has lowercase class", () => {
      render(<SpikeLandLogo />);
      const wordmark = screen.getByText("spike.land");
      expect(wordmark).toHaveClass("lowercase");
    });

    it("applies correct text size for each size variant", () => {
      const { rerender } = render(<SpikeLandLogo size="sm" />);
      expect(screen.getByText("spike.land")).toHaveClass("text-lg");

      rerender(<SpikeLandLogo size="md" />);
      expect(screen.getByText("spike.land")).toHaveClass("text-xl");

      rerender(<SpikeLandLogo size="lg" />);
      expect(screen.getByText("spike.land")).toHaveClass("text-2xl");

      rerender(<SpikeLandLogo size="xl" />);
      expect(screen.getByText("spike.land")).toHaveClass("text-4xl");
    });
  });
});
