import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress } from "./progress";

describe("Progress", () => {
  it("renders without crashing", () => {
    const { container } = render(<Progress />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("applies default classes", () => {
    const { container } = render(<Progress />);
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveClass("relative");
    expect(element).toHaveClass("h-2");
    expect(element).toHaveClass("w-full");
    expect(element).toHaveClass("overflow-hidden");
    expect(element).toHaveClass("rounded-full");
    expect(element).toHaveClass("bg-primary/20");
  });

  it("renders with value", () => {
    const { container } = render(<Progress value={50} />);
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveAttribute("aria-valuenow", "50");
  });

  it("renders with zero value when not provided", () => {
    const { container } = render(<Progress />);
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveAttribute("aria-valuenow", "0");
  });

  it("applies glow effect when glow prop is true", () => {
    const { container } = render(<Progress value={50} glow />);
    const root = container.firstChild as HTMLElement;
    const indicator = root.firstChild as HTMLElement;
    expect(indicator.className).toContain("shadow-[0_0_10px_hsl(var(--primary)/0.5)]");
  });

  it("does not apply glow effect by default", () => {
    const { container } = render(<Progress value={50} />);
    const root = container.firstChild as HTMLElement;
    const indicator = root.firstChild as HTMLElement;
    expect(indicator.className).not.toContain("shadow-[0_0_10px_hsl(var(--primary)/0.5)]");
  });

  it("accepts custom className", () => {
    const { container } = render(<Progress className="custom-class" />);
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveClass("custom-class");
    expect(element).toHaveClass("relative");
  });

  it("renders indicator with correct style attribute", () => {
    const { container } = render(<Progress value={75} />);
    const root = container.firstChild as HTMLElement;
    const indicator = root.firstChild as HTMLElement;
    expect(indicator.getAttribute("style")).toContain("translateX(-25%)");
  });
});
