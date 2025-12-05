import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./input";

describe("Input", () => {
  it("should render input element", () => {
    render(<Input data-testid="test-input" />);
    expect(screen.getByTestId("test-input")).toBeInTheDocument();
  });

  it("should accept value prop", () => {
    render(<Input value="test value" readOnly />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("test value");
  });

  it("should accept type prop", () => {
    render(<Input type="password" data-testid="password-input" />);
    const input = screen.getByTestId("password-input");
    expect(input).toHaveAttribute("type", "password");
  });

  it("should apply custom className", () => {
    render(<Input className="custom-class" data-testid="custom-input" />);
    const input = screen.getByTestId("custom-input");
    expect(input).toHaveClass("custom-class");
  });

  it("should forward ref", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("should handle placeholder", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("should handle disabled state", () => {
    render(<Input disabled data-testid="disabled-input" />);
    expect(screen.getByTestId("disabled-input")).toBeDisabled();
  });
});
