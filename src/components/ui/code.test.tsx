import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Code } from "./code";

describe("Code Component", () => {
  it("should render code with children", () => {
    render(<Code>const x = 1;</Code>);
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
  });

  it("should apply default styles", () => {
    render(<Code data-testid="code">console.log</Code>);
    const code = screen.getByTestId("code");
    expect(code).toHaveClass("font-mono");
    expect(code).toHaveClass("text-aurora-green");
    expect(code).toHaveClass("bg-black/30");
  });

  it("should merge custom className", () => {
    render(<Code className="custom-class" data-testid="code">test</Code>);
    expect(screen.getByTestId("code")).toHaveClass("custom-class");
  });
});
