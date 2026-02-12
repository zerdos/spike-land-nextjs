import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LearnItSection } from "./LearnItSection";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _i, whileInView: _w, viewport: _v, transition: _t, whileHover: _h, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    h2: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _i, whileInView: _w, viewport: _v, transition: _t, ...rest } = props;
      return <h2 {...rest}>{children}</h2>;
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _i, whileInView: _w, viewport: _v, transition: _t, ...rest } = props;
      return <p {...rest}>{children}</p>;
    },
  },
}));

describe("LearnItSection", () => {
  it("renders heading with gradient text", () => {
    render(<LearnItSection />);
    expect(screen.getByText("Learn")).toBeInTheDocument();
    expect(screen.getByText("It")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    render(<LearnItSection />);
    expect(
      screen.getByText(/A wiki about absolutely anything/),
    ).toBeInTheDocument();
  });

  it("renders all three feature cards", () => {
    render(<LearnItSection />);
    expect(screen.getByText("Works from URL")).toBeInTheDocument();
    expect(screen.getByText("Powered by Claude 4.7 Opus")).toBeInTheDocument();
    expect(screen.getByText("Listen to any article")).toBeInTheDocument();
  });

  it("renders feature descriptions", () => {
    render(<LearnItSection />);
    expect(screen.getByText("Create learning materials from any link")).toBeInTheDocument();
    expect(screen.getByText(/State-of-the-art AI/)).toBeInTheDocument();
    expect(screen.getByText(/Text-to-speech built in/)).toBeInTheDocument();
  });

  it("renders CTA link to /learnit", () => {
    render(<LearnItSection />);
    const link = screen.getByRole("link", { name: /Start Learning/i });
    expect(link).toHaveAttribute("href", "/learnit");
  });

  it("renders badge with AI Learning label", () => {
    render(<LearnItSection />);
    expect(screen.getByText("AI Learning")).toBeInTheDocument();
  });
});
