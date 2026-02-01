import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TechStackSection } from "./tech-stack-section";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: (
      { children, className, initial, whileInView, viewport, transition, whileHover, ...props }:
        any,
    ) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

describe("TechStackSection", () => {
  it("renders the section title", () => {
    render(<TechStackSection />);
    expect(screen.getByText("Built with Modern Technologies")).toBeDefined();
  });

  it("renders all tech stack items", () => {
    render(<TechStackSection />);

    const techs = [
      "Next.js",
      "TypeScript",
      "React",
      "Tailwind CSS",
      "Framer Motion",
      "OpenAI",
      "Anthropic",
    ];

    techs.forEach((tech) => {
      // The text might appear multiple times (e.g., in SVG text fallback and label)
      const elements = screen.getAllByText(tech);
      expect(elements.length).toBeGreaterThan(0);
      elements.forEach(element => {
        expect(element).toBeDefined();
      });
    });
  });
});
