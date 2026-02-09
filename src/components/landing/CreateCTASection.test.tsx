import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateCTASection } from "./CreateCTASection";

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

describe("CreateCTASection", () => {
  it("renders the heading", () => {
    render(<CreateCTASection />);
    expect(screen.getByText(/Ready to build the/)).toBeInTheDocument();
    expect(screen.getByText("unthinkable?")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<CreateCTASection />);
    expect(
      screen.getByText(/Join the collective of minds reshaping the digital frontier/),
    ).toBeInTheDocument();
  });

  it("renders Begin Creation link", () => {
    render(<CreateCTASection />);
    const link = screen.getByRole("link", { name: /begin creation/i });
    expect(link).toHaveAttribute("href", "/create");
  });

  it("renders Browse Archives link", () => {
    render(<CreateCTASection />);
    const link = screen.getByRole("link", { name: /browse archives/i });
    expect(link).toHaveAttribute("href", "/create");
  });
});
