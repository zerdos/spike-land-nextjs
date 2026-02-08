import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateCTASection } from "./CreateCTASection";

vi.mock("@/components/orbit-landing/ScrollReveal", () => ({
  ScrollReveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("CreateCTASection", () => {
  it("renders the heading", () => {
    render(<CreateCTASection />);
    expect(screen.getByText(/Ready to build your/)).toBeInTheDocument();
    expect(screen.getByText("next app?")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<CreateCTASection />);
    expect(
      screen.getByText(/Join thousands of creators/),
    ).toBeInTheDocument();
  });

  it("renders Start Creating link", () => {
    render(<CreateCTASection />);
    const link = screen.getByRole("link", { name: /start creating/i });
    expect(link).toHaveAttribute("href", "/create");
  });

  it("renders Explore Apps link", () => {
    render(<CreateCTASection />);
    const link = screen.getByRole("link", { name: /explore apps/i });
    expect(link).toHaveAttribute("href", "/create");
  });
});
