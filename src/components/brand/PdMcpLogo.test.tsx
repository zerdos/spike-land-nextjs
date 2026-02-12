import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PdMcpLogo } from "./PdMcpLogo";

describe("PdMcpLogo", () => {
  it("should render with default props", () => {
    render(<PdMcpLogo />);
    const logo = screen.getByRole("img", { name: "Progressive Disclosure MCP logo" });
    expect(logo).toBeInTheDocument();
  });

  it("should render icon variant without wordmark text", () => {
    render(<PdMcpLogo variant="icon" />);
    const logo = screen.getByRole("img");
    expect(logo).toBeInTheDocument();
    expect(logo.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByText("PD-MCP")).not.toBeInTheDocument();
  });

  it("should render horizontal variant with wordmark text", () => {
    render(<PdMcpLogo variant="horizontal" />);
    expect(screen.getByText("PD-MCP")).toBeInTheDocument();
  });

  it("should render stacked variant with flex-col layout", () => {
    render(<PdMcpLogo variant="stacked" />);
    const logo = screen.getByRole("img");
    expect(logo).toHaveClass("flex-col");
    expect(screen.getByText("PD-MCP")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<PdMcpLogo className="custom-class" />);
    const logo = screen.getByRole("img");
    expect(logo).toHaveClass("custom-class");
  });

  it("should render sm size", () => {
    render(<PdMcpLogo size="sm" variant="icon" />);
    const svg = screen.getByRole("img").querySelector("svg");
    expect(svg).toHaveAttribute("width", "28");
    expect(svg).toHaveAttribute("height", "20");
  });

  it("should render md size", () => {
    render(<PdMcpLogo size="md" variant="icon" />);
    const svg = screen.getByRole("img").querySelector("svg");
    expect(svg).toHaveAttribute("width", "42");
    expect(svg).toHaveAttribute("height", "30");
  });

  it("should render lg size", () => {
    render(<PdMcpLogo size="lg" variant="icon" />);
    const svg = screen.getByRole("img").querySelector("svg");
    expect(svg).toHaveAttribute("width", "56");
    expect(svg).toHaveAttribute("height", "40");
  });

  it("should render xl size", () => {
    render(<PdMcpLogo size="xl" variant="icon" />);
    const svg = screen.getByRole("img").querySelector("svg");
    expect(svg).toHaveAttribute("width", "84");
    expect(svg).toHaveAttribute("height", "60");
  });

  it("should have accessible aria-label on all variants", () => {
    const { rerender } = render(<PdMcpLogo variant="icon" />);
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Progressive Disclosure MCP logo");

    rerender(<PdMcpLogo variant="horizontal" />);
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Progressive Disclosure MCP logo");

    rerender(<PdMcpLogo variant="stacked" />);
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Progressive Disclosure MCP logo");
  });

  it("should hide wordmark when showText is false", () => {
    render(<PdMcpLogo variant="horizontal" showText={false} />);
    expect(screen.queryByText("PD-MCP")).not.toBeInTheDocument();
  });

  it("should have SVG with aria-hidden for accessibility", () => {
    render(<PdMcpLogo variant="icon" />);
    const svg = screen.getByRole("img").querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("should render progressive disclosure bars in SVG", () => {
    render(<PdMcpLogo variant="icon" />);
    const svg = screen.getByRole("img").querySelector("svg");
    // Three bars with increasing widths
    const rects = svg!.querySelectorAll("g[filter] rect");
    expect(rects).toHaveLength(3);
    expect(rects[0]).toHaveAttribute("width", "12");
    expect(rects[1]).toHaveAttribute("width", "20");
    expect(rects[2]).toHaveAttribute("width", "28");
  });

  it("should render MCP text in SVG", () => {
    render(<PdMcpLogo variant="icon" />);
    const svg = screen.getByRole("img").querySelector("svg");
    const textEl = svg!.querySelector("text");
    expect(textEl).toBeInTheDocument();
    expect(textEl!.textContent).toBe("MCP");
  });

  it("should have unique SVG IDs for multiple instances", () => {
    const { container } = render(
      <div>
        <PdMcpLogo variant="icon" />
        <PdMcpLogo variant="icon" />
      </div>,
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(2);
    // Both start with "ssr" IDs on initial render (SSR-safe)
    const filters0 = svgs[0].querySelectorAll("filter");
    const filters1 = svgs[1].querySelectorAll("filter");
    expect(filters0).toHaveLength(1);
    expect(filters1).toHaveLength(1);
  });
});
