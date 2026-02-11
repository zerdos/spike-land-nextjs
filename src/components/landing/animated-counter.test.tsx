import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnimatedCounter } from "./animated-counter";

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: vi.fn(() => true),
}));

vi.mock("framer-motion", () => ({
  useInView: vi.fn(() => true),
  useSpring: vi.fn(() => ({
    set: vi.fn(),
    get: () => 0,
    on: vi.fn(() => vi.fn()),
  })),
  useMotionValueEvent: vi.fn(),
}));

describe("AnimatedCounter", () => {
  it("renders the final value with reduced motion", () => {
    render(<AnimatedCounter value={1234} />);
    expect(screen.getByText(/1,234/)).toBeDefined();
  });

  it("renders the value with suffix", () => {
    render(<AnimatedCounter value={500} suffix="+" />);
    expect(screen.getByText(/500/)).toBeDefined();
    expect(screen.getByText(/\+/)).toBeDefined();
  });

  it("applies custom className", () => {
    const { container } = render(
      <AnimatedCounter value={100} className="text-4xl font-bold" />,
    );
    const span = container.querySelector("span");
    expect(span?.className).toContain("text-4xl");
    expect(span?.className).toContain("font-bold");
  });

  it("renders animated version when motion is not reduced", async () => {
    const { useReducedMotion } = await import("@/hooks/useReducedMotion");
    vi.mocked(useReducedMotion).mockReturnValue(false);

    const { container } = render(<AnimatedCounter value={999} suffix="+" />);
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    // Non-reduced motion path shows displayValue from useMotionValueEvent
    expect(span?.textContent).toContain("+");

    vi.mocked(useReducedMotion).mockReturnValue(true);
  });
});
