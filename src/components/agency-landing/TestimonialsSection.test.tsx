import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TestimonialsSection } from "./TestimonialsSection";

// Mock framer-motion to avoid animation-related issues in tests
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
      p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    },
  };
});

describe("TestimonialsSection Component", () => {
  it("should render the section heading", () => {
    render(<TestimonialsSection />);
    expect(screen.getByText("Trusted by Industry Leaders")).toBeInTheDocument();
  });

  it("should render the section description", () => {
    render(<TestimonialsSection />);
    expect(
      screen.getByText(
        "Don't just take our word for it. Here's what our clients have to say about their experience working with us.",
      ),
    ).toBeInTheDocument();
  });

  it("should render all 3 testimonials", () => {
    render(<TestimonialsSection />);

    // Check for author names
    expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();
    expect(screen.getByText("Michael Chen")).toBeInTheDocument();
    expect(screen.getByText("Emily Davis")).toBeInTheDocument();

    // Check for roles
    expect(screen.getByText("Marketing Director, TechFlow")).toBeInTheDocument();
    expect(screen.getByText("CEO, StartUp Inc.")).toBeInTheDocument();
    expect(screen.getByText("Product Manager, Creative Solutions")).toBeInTheDocument();

    // Check for content snippets
    expect(screen.getByText(/Working with this agency was a game-changer/)).toBeInTheDocument();
    expect(screen.getByText(/The attention to detail/)).toBeInTheDocument();
    expect(screen.getByText(/Professional, timely, and incredibly talented/)).toBeInTheDocument();
  });

  it("should render avatars for each testimonial", () => {
    render(<TestimonialsSection />);
    // Avatar fallbacks should be rendered since we don't have images
    expect(screen.getByText("SJ")).toBeInTheDocument();
    expect(screen.getByText("MC")).toBeInTheDocument();
    expect(screen.getByText("ED")).toBeInTheDocument();
  });
});
