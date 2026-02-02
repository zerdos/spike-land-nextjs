import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PortfolioPage from "./page";

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
    h1: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <h1 className={className}>{children}</h1>,
    h2: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <h2 className={className}>{children}</h2>,
    p: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <p className={className}>{children}</p>,
    span: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <span className={className}>{children}</span>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode; }) => <>{children}</>,
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => <img src={src} alt={alt} className={className} />,
}));

describe("PortfolioPage", () => {
  it("renders the page header", () => {
    render(<PortfolioPage />);

    expect(screen.getByText("Our Work")).toBeInTheDocument();
    expect(
      screen.getByText(/Building the Future/i),
    ).toBeInTheDocument();
  });

  it("renders Pixel case study", () => {
    render(<PortfolioPage />);

    expect(screen.getByText("Pixel")).toBeInTheDocument();
    expect(screen.getByText(/AI-powered image enhancement/i)).toBeInTheDocument();
  });

  it("renders tech stack badges", () => {
    render(<PortfolioPage />);

    expect(screen.getByText("Next.js 15")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("renders the main content section", () => {
    render(<PortfolioPage />);

    // Check that main element exists
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
  });

  it("has proper structure with sections", () => {
    render(<PortfolioPage />);

    // Portfolio page should have multiple sections
    const sections = document.querySelectorAll("section");
    expect(sections.length).toBeGreaterThan(0);
  });
});
