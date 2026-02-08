import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PhotoMixDemo } from "./PhotoMixDemo";

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

describe("PhotoMixDemo", () => {
  it("renders the section heading", () => {
    render(<PhotoMixDemo />);
    expect(screen.getByText(/Beyond/)).toBeInTheDocument();
    expect(screen.getByText("Hybridization")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<PhotoMixDemo />);
    expect(
      screen.getByText(/PhotoMix isn't just a layer blend/),
    ).toBeInTheDocument();
  });

  it("renders the visual demo elements", () => {
    render(<PhotoMixDemo />);
    expect(screen.getByText("Essence A")).toBeInTheDocument();
    expect(screen.getByText("Essence B")).toBeInTheDocument();
  });

  it("renders the Synthesize Now link", () => {
    render(<PhotoMixDemo />);
    const link = screen.getByRole("link", { name: /synthesize now/i });
    expect(link).toHaveAttribute("href", "/apps/pixel/mix");
  });

  it("renders the badge", () => {
    render(<PhotoMixDemo />);
    expect(screen.getByText("Neural Synthesis")).toBeInTheDocument();
  });
});
