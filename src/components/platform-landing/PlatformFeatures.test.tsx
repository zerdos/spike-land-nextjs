import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlatformFeatures } from "./PlatformFeatures";

describe("PlatformFeatures Component", () => {
  it("should render the section heading", () => {
    render(<PlatformFeatures />);
    expect(screen.getByText("Why Spike Land?")).toBeInTheDocument();
  });

  it("should render the section description", () => {
    render(<PlatformFeatures />);
    expect(
      screen.getByText(/Everything you need to build, deploy, and monetize/),
    ).toBeInTheDocument();
  });

  it("should render all 4 feature cards", () => {
    const { container } = render(<PlatformFeatures />);
    const cards = container.querySelectorAll(".bg-background");
    expect(cards.length).toBe(4);
  });

  it("should render AI-Powered Development feature", () => {
    render(<PlatformFeatures />);
    expect(screen.getByText("AI-Powered Development")).toBeInTheDocument();
    expect(
      screen.getByText(/Connect with AI agents that understand/),
    ).toBeInTheDocument();
  });

  it("should render Flexible Token Economy feature", () => {
    render(<PlatformFeatures />);
    expect(screen.getByText("Flexible Token Economy")).toBeInTheDocument();
    expect(
      screen.getByText(/Pay-as-you-go pricing with auto-regenerating/),
    ).toBeInTheDocument();
  });

  it("should render Easy Deployment feature", () => {
    render(<PlatformFeatures />);
    expect(screen.getByText("Easy Deployment")).toBeInTheDocument();
    expect(screen.getByText(/Deploy your apps with one click/)).toBeInTheDocument();
  });

  it("should render Secure & Compliant feature", () => {
    render(<PlatformFeatures />);
    expect(screen.getByText("Secure & Compliant")).toBeInTheDocument();
    expect(
      screen.getByText(/Enterprise-grade security with GDPR compliance/),
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

  it("should render Bot icon for AI-Powered Development", () => {
    const { container } = render(<PlatformFeatures />);
    const botIcon = container.querySelector("svg.lucide-bot");
    expect(botIcon).toBeInTheDocument();
  });

  it("should render Coins icon for Flexible Token Economy", () => {
    const { container } = render(<PlatformFeatures />);
    const coinsIcon = container.querySelector("svg.lucide-coins");
    expect(coinsIcon).toBeInTheDocument();
  });

  it("should render Rocket icon for Easy Deployment", () => {
    const { container } = render(<PlatformFeatures />);
    const rocketIcon = container.querySelector("svg.lucide-rocket");
    expect(rocketIcon).toBeInTheDocument();
  });

  it("should render Shield icon for Secure & Compliant", () => {
    const { container } = render(<PlatformFeatures />);
    const shieldIcon = container.querySelector("svg.lucide-shield");
    expect(shieldIcon).toBeInTheDocument();
  });

  it("should have center-aligned text in header", () => {
    const { container } = render(<PlatformFeatures />);
    const headerDiv = container.querySelector(".text-center.mb-16");
    expect(headerDiv).toBeInTheDocument();
  });
});
