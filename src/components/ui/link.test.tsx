import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Link } from "./link";

// Mock next-view-transitions since it might depend on Next.js context
vi.mock("next-view-transitions", async (importOriginal) => {
  const React = await import("react");
  return {
    Link: React.forwardRef(({ children, href, className, ...props }: any, ref: any) => (
      <a href={href} className={className} ref={ref} {...props}>
        {children}
      </a>
    )),
  };
});

describe("Link", () => {
  it("renders correctly with href", () => {
    render(<Link href="/test">Click me</Link>);
    const link = screen.getByRole("link", { name: "Click me" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
  });

  it("applies custom className", () => {
    render(
      <Link href="/test" className="custom-class">
        Link
      </Link>
    );
    const link = screen.getByRole("link");
    expect(link).toHaveClass("custom-class");
  });

  it("passes other props", () => {
    render(
      <Link href="/test" target="_blank" rel="noopener noreferrer">
        External Link
      </Link>
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("forwards ref", () => {
    const ref = { current: null };
    render(<Link href="/test" ref={ref}>Ref Link</Link>);
    expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
  });
});
