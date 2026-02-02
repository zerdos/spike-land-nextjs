import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ServicesPage from "./page";

// Mock the ScrollReveal component
vi.mock("@/components/orbit-landing/ScrollReveal", () => ({
  ScrollReveal: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

describe("ServicesPage", () => {
  it("renders the page header", () => {
    render(<ServicesPage />);

    expect(screen.getByText("Our Expertise")).toBeInTheDocument();
    expect(screen.getByText("Services & Solutions")).toBeInTheDocument();
  });

  it("renders AI Integration service", () => {
    render(<ServicesPage />);

    expect(screen.getByText("AI Integration")).toBeInTheDocument();
    expect(screen.getByText(/Custom LLM Agents/i)).toBeInTheDocument();
  });

  it("renders Rapid Prototyping service", () => {
    render(<ServicesPage />);

    expect(screen.getByText("Rapid Prototyping")).toBeInTheDocument();
    expect(screen.getByText(/MVP Development/i)).toBeInTheDocument();
  });

  it("renders Full-Stack Development service", () => {
    render(<ServicesPage />);

    expect(screen.getByText("Full-Stack Development")).toBeInTheDocument();
    expect(screen.getByText(/Next.js & React/i)).toBeInTheDocument();
  });

  it("renders AI Products service", () => {
    render(<ServicesPage />);

    expect(screen.getByText("AI Products")).toBeInTheDocument();
    expect(screen.getByText(/AI-First SaaS/i)).toBeInTheDocument();
  });

  it("has proper main element structure", () => {
    render(<ServicesPage />);

    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
  });

  it("renders service cards with descriptions", () => {
    render(<ServicesPage />);

    // Check for service descriptions
    expect(
      screen.getByText(/Seamlessly integrate advanced AI capabilities/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Turn your concepts into functional MVPs/i),
    ).toBeInTheDocument();
  });
});
