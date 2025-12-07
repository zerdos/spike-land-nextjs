import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrustedBy } from "./TrustedBy";

describe("TrustedBy Component", () => {
  it("should render the trusted by label", () => {
    render(<TrustedBy />);
    expect(screen.getByText(/trusted by/i)).toBeInTheDocument();
  });

  it("should render all company logos/names", () => {
    render(<TrustedBy />);
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
    expect(screen.getByText("Discovery")).toBeInTheDocument();
    expect(screen.getByText("Forbes")).toBeInTheDocument();
    expect(screen.getByText("The Wington Post")).toBeInTheDocument();
    expect(screen.getByText("TECH & MODEEVERY")).toBeInTheDocument();
    expect(screen.getByText("SAMSUNG")).toBeInTheDocument();
  });

  it("should have section element", () => {
    const { container } = render(<TrustedBy />);
    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();
  });

  it("should have border-t class for top border", () => {
    const { container } = render(<TrustedBy />);
    const section = container.querySelector("section");
    expect(section).toHaveClass("border-t");
  });

  it("should accept custom className", () => {
    const { container } = render(<TrustedBy className="custom-class" />);
    const section = container.querySelector("section");
    expect(section).toHaveClass("custom-class");
  });

  it("should have uppercase label with tracking", () => {
    render(<TrustedBy />);
    const label = screen.getByText(/trusted by/i);
    expect(label).toHaveClass("uppercase");
    expect(label).toHaveClass("tracking-widest");
  });

  it("should render logos with muted-foreground color", () => {
    render(<TrustedBy />);
    const enterpriseLogo = screen.getByText("Enterprise");
    expect(enterpriseLogo).toHaveClass("text-muted-foreground/60");
  });

  it("should have appropriate padding", () => {
    const { container } = render(<TrustedBy />);
    const section = container.querySelector("section");
    expect(section).toHaveClass("py-8");
  });

  it("should center logos horizontally", () => {
    const { container } = render(<TrustedBy />);
    const logosContainer = container.querySelector(".flex-wrap");
    expect(logosContainer).toHaveClass("justify-center");
  });

  it("should have gap between logos", () => {
    const { container } = render(<TrustedBy />);
    const logosContainer = container.querySelector(".flex-wrap");
    expect(logosContainer).toHaveClass("gap-x-8");
    expect(logosContainer).toHaveClass("md:gap-x-12");
  });
});
