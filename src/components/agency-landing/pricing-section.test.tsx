import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PricingSection } from "./pricing-section";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
  },
}));

// Mock scroll-reveal components
vi.mock("./scroll-reveal", () => ({
  ScrollReveal: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  StaggerContainer: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  StaggerItem: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

describe("PricingSection", () => {
  it("renders the section header", () => {
    render(<PricingSection />);

    expect(screen.getByText("Pricing Plans")).toBeInTheDocument();
    expect(screen.getByText(/Choose Your Path to/i)).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it("renders all three pricing tiers", () => {
    render(<PricingSection />);

    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Growth")).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
  });

  it("displays pricing labels", () => {
    render(<PricingSection />);

    expect(screen.getByText("Prototype")).toBeInTheDocument();
    expect(screen.getByText("Full App")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("shows Most Popular badge on Growth tier", () => {
    render(<PricingSection />);

    expect(screen.getByText("Most Popular")).toBeInTheDocument();
  });

  it("renders tier descriptions", () => {
    render(<PricingSection />);

    expect(
      screen.getByText("Perfect for MVPs and validating ideas"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Scale your business with a complete solution"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Tailored solutions for large organizations"),
    ).toBeInTheDocument();
  });

  it("renders features for each tier", () => {
    render(<PricingSection />);

    // Starter features
    expect(screen.getByText("Rapid prototyping")).toBeInTheDocument();
    expect(screen.getByText("Mobile responsive")).toBeInTheDocument();

    // Growth features
    expect(screen.getByText("Full-stack development")).toBeInTheDocument();
    expect(screen.getByText("SEO optimized")).toBeInTheDocument();

    // Enterprise features
    expect(screen.getByText("Custom architecture")).toBeInTheDocument();
    expect(screen.getByText("SLA guarantees")).toBeInTheDocument();
  });

  it("renders CTA buttons for each tier", () => {
    render(<PricingSection />);

    expect(
      screen.getByRole("button", { name: "Start Prototype" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Get Full App" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Contact Sales" }),
    ).toBeInTheDocument();
  });
});
