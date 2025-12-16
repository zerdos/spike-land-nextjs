import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeatureShowcase } from "./FeatureShowcase";

describe("FeatureShowcase Component", () => {
  it("should render the section heading", () => {
    render(<FeatureShowcase />);
    expect(screen.getByText("Why Pixel?")).toBeInTheDocument();
  });

  it("should render all 3 feature cards", () => {
    render(<FeatureShowcase />);
    const cards = document.querySelectorAll(".bg-background");
    expect(cards.length).toBe(3);
  });

  it("should render Instant results feature", () => {
    render(<FeatureShowcase />);
    expect(screen.getByText("Instant results")).toBeInTheDocument();
    expect(
      screen.getByText(/Upload\. Enhance\. Done\./),
    ).toBeInTheDocument();
  });

  it("should render Slideshow mode feature", () => {
    render(<FeatureShowcase />);
    expect(screen.getByText("Slideshow mode")).toBeInTheDocument();
    expect(
      screen.getByText(/Put your restored photos on an iPad/),
    ).toBeInTheDocument();
  });

  it("should render Share anywhere feature", () => {
    render(<FeatureShowcase />);
    expect(screen.getByText("Share anywhere")).toBeInTheDocument();
    expect(
      screen.getByText(/Download or share directly to social/),
    ).toBeInTheDocument();
  });

  it("should have icons for each feature", () => {
    const { container } = render(<FeatureShowcase />);
    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThanOrEqual(3);
  });

  it("should have muted background", () => {
    const { container } = render(<FeatureShowcase />);
    const section = container.querySelector("section");
    expect(section).toHaveClass("bg-muted/30");
  });

  it("should have responsive grid layout", () => {
    const { container } = render(<FeatureShowcase />);
    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("sm:grid-cols-3");
  });

  it("should have hover transition on cards", () => {
    const { container } = render(<FeatureShowcase />);
    const cards = container.querySelectorAll(".hover\\:scale-\\[1\\.02\\]");
    expect(cards.length).toBe(3);
  });

  it("should have gradient icon backgrounds", () => {
    const { container } = render(<FeatureShowcase />);
    const iconContainers = container.querySelectorAll(".bg-gradient-to-br");
    expect(iconContainers.length).toBe(3);
  });
});
