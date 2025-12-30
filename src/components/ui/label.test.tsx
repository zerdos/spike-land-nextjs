import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Label } from "./label";

describe("Label", () => {
  it("renders correctly", () => {
    render(<Label>Test Label</Label>);
    const label = screen.getByText("Test Label");
    expect(label).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Label className="custom-class">Test Label</Label>);
    const label = screen.getByText("Test Label");
    expect(label).toHaveClass("custom-class");
  });

  it("forwards ref", () => {
    const ref = { current: null };
    render(<Label ref={ref}>Test Label</Label>);
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  it("associates with input via htmlFor", () => {
    render(
      <>
        <Label htmlFor="test-input">Test Label</Label>
        <input id="test-input" />
      </>,
    );
    const label = screen.getByText("Test Label");
    expect(label).toHaveAttribute("for", "test-input");
  });

  it("handles peer-disabled classes", () => {
    render(<Label>Test Label</Label>);
    const label = screen.getByText("Test Label");
    // Verify default classes from cva
    expect(label).toHaveClass("text-sm", "font-medium", "leading-none");
    expect(label).toHaveClass(
      "peer-disabled:cursor-not-allowed",
      "peer-disabled:opacity-70",
    );
  });
});
