import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PhotoMixDemo } from "./PhotoMixDemo";

vi.mock("@/components/orbit-landing/ScrollReveal", () => ({
  ScrollReveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("PhotoMixDemo", () => {
  it("renders the section heading", () => {
    render(<PhotoMixDemo />);
    expect(screen.getByText(/Blend images with/)).toBeInTheDocument();
    expect(screen.getByText("AI magic")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<PhotoMixDemo />);
    expect(
      screen.getByText(/Combine two images into something entirely new/),
    ).toBeInTheDocument();
  });

  it("renders the visual demo elements", () => {
    render(<PhotoMixDemo />);
    expect(screen.getByText("Image A")).toBeInTheDocument();
    expect(screen.getByText("Image B")).toBeInTheDocument();
  });

  it("renders the Try PhotoMix link", () => {
    render(<PhotoMixDemo />);
    const link = screen.getByRole("link", { name: /try photomix/i });
    expect(link).toHaveAttribute("href", "/apps/pixel/mix");
  });

  it("renders the PhotoMix badge", () => {
    render(<PhotoMixDemo />);
    expect(screen.getByText("PhotoMix")).toBeInTheDocument();
  });
});
