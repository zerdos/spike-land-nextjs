import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProcessSection } from "./ProcessSection";

// Mock framer-motion to avoid animation-related issues in tests
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: {
      div: ({
        children,
        className,
        ...props
      }: React.HTMLAttributes<HTMLDivElement>) => (
        <div className={className} {...props}>
          {children}
        </div>
      ),
      h2: ({
        children,
        className,
        ...props
      }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h2 className={className} {...props}>
          {children}
        </h2>
      ),
      p: ({
        children,
        className,
        ...props
      }: React.HTMLAttributes<HTMLParagraphElement>) => (
        <p className={className} {...props}>
          {children}
        </p>
      ),
    },
  };
});

describe("ProcessSection", () => {
  it("renders the section title and description", () => {
    render(<ProcessSection />);
    expect(screen.getByText("Our Process")).toBeInTheDocument();
    expect(
      screen.getByText(
        "From idea to launch and beyond, we follow a proven workflow to deliver exceptional results."
      )
    ).toBeInTheDocument();
  });

  it("renders all 5 process steps with titles", () => {
    render(<ProcessSection />);
    
    const steps = ["Discovery", "Design", "Build", "Ship", "Support"];
    
    steps.forEach((step) => {
      expect(screen.getByText(step)).toBeInTheDocument();
    });
  });

  it("renders step descriptions", () => {
    render(<ProcessSection />);
    
    expect(
      screen.getByText(/We start by diving deep into your vision/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/We create intuitive, high-fidelity prototypes/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/We develop your product using the latest technologies/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/We handle the deployment process/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/We provide ongoing maintenance and support/i)
    ).toBeInTheDocument();
  });
  
  it("renders step numbers", () => {
    render(<ProcessSection />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
