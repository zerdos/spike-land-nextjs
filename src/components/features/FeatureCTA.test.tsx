import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeatureCTA } from "./FeatureCTA";

// Mock framer-motion to avoid animation complexities in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileInView: _whileInView,
      viewport: _viewport,
      style,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
      whileInView?: unknown;
      viewport?: unknown;
    }) => (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock the landing components
vi.mock("../landing-sections/shared/SectionWrapper", () => ({
  SectionWrapper: ({ children, className }: { children: React.ReactNode; className?: string; }) => (
    <section className={className}>{children}</section>
  ),
}));

vi.mock("../landing-sections/shared/ThemeButton", () => ({
  ThemeButton: ({
    children,
    className,
  }: { children: React.ReactNode; className?: string; }) => (
    <button className={className}>{children}</button>
  ),
}));

describe("FeatureCTA", () => {
  const defaultProps = {
    headline: "Ready to get started?",
    description: "Start building with powerful AI tools today.",
    primaryCta: {
      text: "Sign Up Now",
      href: "/signup",
    },
  };

  it("should render the headline", () => {
    render(<FeatureCTA {...defaultProps} />);
    expect(screen.getByText("Ready to get started?")).toBeInTheDocument();
  });

  it("should render the description", () => {
    render(<FeatureCTA {...defaultProps} />);
    expect(screen.getByText("Start building with powerful AI tools today.")).toBeInTheDocument();
  });

  it("should render the primary CTA button", () => {
    render(<FeatureCTA {...defaultProps} />);
    expect(screen.getByRole("button", { name: /sign up now/i })).toBeInTheDocument();
  });

  it("should render primary CTA as a link", () => {
    render(<FeatureCTA {...defaultProps} />);
    expect(screen.getByRole("link", { name: /sign up now/i })).toHaveAttribute(
      "href",
      "/signup",
    );
  });

  it("should render secondary CTA when provided", () => {
    render(
      <FeatureCTA
        {...defaultProps}
        secondaryCta={{
          text: "Learn More",
          href: "/about",
        }}
      />,
    );
    expect(screen.getByRole("button", { name: /learn more/i })).toBeInTheDocument();
  });

  it("should render secondary CTA as a link when provided", () => {
    render(
      <FeatureCTA
        {...defaultProps}
        secondaryCta={{
          text: "Learn More",
          href: "/about",
        }}
      />,
    );
    expect(screen.getByRole("link", { name: /learn more/i })).toHaveAttribute(
      "href",
      "/about",
    );
  });

  it("should not render secondary CTA when not provided", () => {
    render(<FeatureCTA {...defaultProps} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1); // Only primary CTA
  });

  it("should apply custom className when provided", () => {
    const { container } = render(
      <FeatureCTA {...defaultProps} className="custom-class" />,
    );
    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });

  it("should render with border top styling", () => {
    const { container } = render(<FeatureCTA {...defaultProps} />);
    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();
  });
});
