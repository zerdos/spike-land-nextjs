import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeatureHero } from "./FeatureHero";

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
      layout: _layout,
      whileHover: _whileHover,
      whileTap: _whileTap,
      style,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
      layout?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }) => (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    ),
    h1: ({
      children,
      className,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLHeadingElement> & {
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
    }) => (
      <h1 className={className} {...props}>
        {children}
      </h1>
    ),
    p: ({
      children,
      className,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLParagraphElement> & {
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
    }) => (
      <p className={className} {...props}>
        {children}
      </p>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode; }) => <>{children}</>,
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

describe("FeatureHero", () => {
  const defaultProps = {
    headline: "Test Headline",
    description: "Test description text",
    ctaText: "Get Started",
  };

  it("should render the headline", () => {
    render(<FeatureHero {...defaultProps} />);
    expect(screen.getByText("Test Headline")).toBeInTheDocument();
  });

  it("should render the description", () => {
    render(<FeatureHero {...defaultProps} />);
    expect(screen.getByText("Test description text")).toBeInTheDocument();
  });

  it("should render the primary CTA button", () => {
    render(<FeatureHero {...defaultProps} />);
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
  });

  it("should render a badge when provided", () => {
    render(<FeatureHero {...defaultProps} badge="New Feature" />);
    expect(screen.getByText("New Feature")).toBeInTheDocument();
  });

  it("should render secondary CTA when provided", () => {
    render(
      <FeatureHero
        {...defaultProps}
        secondaryCta={{
          text: "Learn More",
          href: "/learn",
        }}
      />,
    );
    expect(screen.getByRole("button", { name: /learn more/i })).toBeInTheDocument();
  });

  it("should highlight word when highlightedWord is provided", () => {
    render(
      <FeatureHero
        {...defaultProps}
        headline="Test Amazing Headline"
        highlightedWord="Amazing"
      />,
    );
    expect(screen.getByText("Amazing")).toBeInTheDocument();
    // The headline is split by the highlighted word, so we need to check the full h1 contains the parts
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(/Test/);
    expect(heading).toHaveTextContent(/Headline/);
  });

  it("should render children when provided", () => {
    render(
      <FeatureHero {...defaultProps}>
        <div data-testid="child-content">Child Content</div>
      </FeatureHero>,
    );
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("should not render badge element when not provided", () => {
    render(<FeatureHero {...defaultProps} />);
    // Badge contains a specific styling, check it doesn't exist
    const badgeElements = screen.queryAllByText(/./);
    const badgeWithPulse = badgeElements.filter((el) => el.className?.includes?.("animate-pulse"));
    expect(badgeWithPulse).toHaveLength(0);
  });
});
