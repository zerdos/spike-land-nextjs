import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeatureShowcase } from "./FeatureShowcase";

describe("FeatureShowcase Component", () => {
  it("should render the section heading", () => {
    render(<FeatureShowcase />);
    expect(screen.getByText("Why Choose Our AI Enhancement")).toBeInTheDocument();
  });

  it("should render the section description", () => {
    render(<FeatureShowcase />);
    expect(screen.getByText(/Powerful features designed to make/)).toBeInTheDocument();
  });

  it("should render all 8 feature cards", () => {
    render(<FeatureShowcase />);
    const cards = document.querySelectorAll(".bg-background");
    expect(cards.length).toBe(8);
  });

  it("should render AI-Powered Enhancement feature", () => {
    render(<FeatureShowcase />);
    expect(screen.getByText("AI-Powered Enhancement")).toBeInTheDocument();
    expect(screen.getByText(/Advanced machine learning models/)).toBeInTheDocument();
  });

  it("should render Multiple Resolutions feature", () => {
    render(<FeatureShowcase />);
    expect(screen.getByText("Multiple Resolutions")).toBeInTheDocument();
    expect(screen.getByText(/1K, 2K, or 4K output/)).toBeInTheDocument();
  });

  it("should render Fast Processing feature", () => {
    render(<FeatureShowcase />);
    expect(screen.getByText("Fast Processing")).toBeInTheDocument();
    expect(screen.getByText(/in seconds, not minutes/)).toBeInTheDocument();
  });

  it("should render Secure & Private feature", () => {
    render(<FeatureShowcase />);
    expect(screen.getByText("Secure & Private")).toBeInTheDocument();
    expect(screen.getByText(/encrypted and automatically deleted/)).toBeInTheDocument();
  });

  it("should render Easy Downloads feature", () => {
    render(<FeatureShowcase />);
    expect(screen.getByText("Easy Downloads")).toBeInTheDocument();
    expect(screen.getByText(/No watermarks, no restrictions/)).toBeInTheDocument();
  });

  it("should render Pay As You Go feature", () => {
    render(<FeatureShowcase />);
    expect(screen.getByText("Pay As You Go")).toBeInTheDocument();
    expect(screen.getByText(/Flexible token-based pricing/)).toBeInTheDocument();
  });

  it("should render All Image Types feature", () => {
    render(<FeatureShowcase />);
    expect(screen.getByText("All Image Types")).toBeInTheDocument();
    expect(screen.getByText(/portraits, landscapes, products/)).toBeInTheDocument();
  });

  it("should render Simple Controls feature", () => {
    render(<FeatureShowcase />);
    expect(screen.getByText("Simple Controls")).toBeInTheDocument();
    expect(screen.getByText(/No complex settings/)).toBeInTheDocument();
  });

  it("should have icons for each feature", () => {
    const { container } = render(<FeatureShowcase />);
    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThanOrEqual(8);
  });

  it("should have muted background", () => {
    const { container } = render(<FeatureShowcase />);
    const section = container.querySelector("section");
    expect(section).toHaveClass("bg-muted/30");
  });

  it("should have responsive grid layout", () => {
    const { container } = render(<FeatureShowcase />);
    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("sm:grid-cols-2");
    expect(grid).toHaveClass("lg:grid-cols-4");
  });

  it("should have hover transition on cards", () => {
    const { container } = render(<FeatureShowcase />);
    const cards = container.querySelectorAll(".hover\\:scale-\\[1\\.02\\]");
    expect(cards.length).toBe(8);
  });
});
