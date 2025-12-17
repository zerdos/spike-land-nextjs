import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlatformFeatures } from "./PlatformFeatures";

describe("PlatformFeatures Component", () => {
  it("should render the section heading", () => {
    render(<PlatformFeatures />);
    expect(screen.getByText("Why Pixel?")).toBeInTheDocument();
  });

  it("should render the section description", () => {
    render(<PlatformFeatures />);
    expect(
      screen.getByText(/The fastest way to restore your memories/),
    ).toBeInTheDocument();
  });

  it("should render all 4 feature cards", () => {
    const { container } = render(<PlatformFeatures />);
    const cards = container.querySelectorAll(".bg-background");
    expect(cards.length).toBe(4);
  });

  it("should render 60-Second Magic feature", () => {
    render(<PlatformFeatures />);
    expect(screen.getByText("60-Second Magic")).toBeInTheDocument();
    expect(
      screen.getByText(/Upload. Enhance. Download. That's it./),
    ).toBeInTheDocument();
  });

  it("should render Print-Ready 4K feature", () => {
    render(<PlatformFeatures />);
    expect(screen.getByText("Print-Ready 4K")).toBeInTheDocument();
    expect(
      screen.getByText(/Good enough to frame. Finally./),
    ).toBeInTheDocument();
  });

  it("should render Batch Albums feature", () => {
    render(<PlatformFeatures />);
    expect(screen.getByText("Batch Albums")).toBeInTheDocument();
    expect(screen.getByText(/Restore 100 photos at once/))
      .toBeInTheDocument();
  });

  it("should render Free Forever Tier feature", () => {
    render(<PlatformFeatures />);
    expect(screen.getByText("Free Forever Tier")).toBeInTheDocument();
    expect(
      screen.getByText(/Tokens regenerate every 15 minutes/),
    ).toBeInTheDocument();
  });

  it("should have icons for each feature", () => {
    const { container } = render(<PlatformFeatures />);
    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThanOrEqual(4);
  });

  it("should have muted background", () => {
    const { container } = render(<PlatformFeatures />);
    const section = container.querySelector("section");
    expect(section).toHaveClass("bg-muted/30");
  });

  it("should have responsive grid layout", () => {
    const { container } = render(<PlatformFeatures />);
    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("sm:grid-cols-2");
    expect(grid).toHaveClass("lg:grid-cols-4");
  });

  it("should have hover transition on cards", () => {
    const { container } = render(<PlatformFeatures />);
    const cards = container.querySelectorAll(".hover\\:scale-\\[1\\.02\\]");
    expect(cards.length).toBe(4);
  });

  it("should have gradient icon backgrounds", () => {
    const { container } = render(<PlatformFeatures />);
    const gradientIcons = container.querySelectorAll(".bg-gradient-to-br");
    expect(gradientIcons.length).toBe(4);
  });

  it("should have responsive padding", () => {
    const { container } = render(<PlatformFeatures />);
    const section = container.querySelector("section");
    expect(section).toHaveClass("py-20");
    expect(section).toHaveClass("sm:py-28");
  });

  it("should have responsive heading size", () => {
    render(<PlatformFeatures />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveClass("text-3xl");
    expect(heading).toHaveClass("sm:text-4xl");
  });

  it("should render Clock icon for 60-Second Magic", () => {
    const { container } = render(<PlatformFeatures />);
    const clockIcon = container.querySelector("svg.lucide-clock");
    expect(clockIcon).toBeInTheDocument();
  });

  it("should render Image icon for Print-Ready 4K", () => {
    const { container } = render(<PlatformFeatures />);
    const imageIcon = container.querySelector("svg.lucide-image");
    expect(imageIcon).toBeInTheDocument();
  });

  it("should render Layers icon for Batch Albums", () => {
    const { container } = render(<PlatformFeatures />);
    const layersIcon = container.querySelector("svg.lucide-layers");
    expect(layersIcon).toBeInTheDocument();
  });

  it("should render Coins icon for Free Forever Tier", () => {
    const { container } = render(<PlatformFeatures />);
    const coinsIcon = container.querySelector("svg.lucide-coins");
    expect(coinsIcon).toBeInTheDocument();
  });

  it("should have center-aligned text in header", () => {
    const { container } = render(<PlatformFeatures />);
    const headerDiv = container.querySelector(".text-center.mb-16");
    expect(headerDiv).toBeInTheDocument();
  });
});
