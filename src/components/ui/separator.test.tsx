import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Separator } from "./separator";

describe("Separator", () => {
  it("renders a horizontal separator by default", () => {
    render(<Separator data-testid="separator" />);

    const separator = screen.getByTestId("separator");
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveClass("h-[1px]");
    expect(separator).toHaveClass("w-full");
  });

  it("renders a vertical separator when orientation is vertical", () => {
    render(<Separator orientation="vertical" data-testid="separator" />);

    const separator = screen.getByTestId("separator");
    expect(separator).toHaveClass("h-full");
    expect(separator).toHaveClass("w-[1px]");
  });

  it("applies custom className", () => {
    render(<Separator className="custom-class" data-testid="separator" />);

    const separator = screen.getByTestId("separator");
    expect(separator).toHaveClass("custom-class");
  });

  it("has decorative true by default", () => {
    render(<Separator data-testid="separator" />);

    const separator = screen.getByTestId("separator");
    expect(separator).toHaveAttribute("data-orientation", "horizontal");
  });

  it("can be set as non-decorative", () => {
    render(<Separator decorative={false} data-testid="separator" />);

    const separator = screen.getByTestId("separator");
    expect(separator).toHaveAttribute("role", "separator");
  });

  it("applies base styling classes", () => {
    render(<Separator data-testid="separator" />);

    const separator = screen.getByTestId("separator");
    expect(separator).toHaveClass("shrink-0");
    expect(separator).toHaveClass("bg-border");
  });

  it("forwards ref correctly", () => {
    const ref = { current: null };
    render(<Separator ref={ref} data-testid="separator" />);

    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it("passes through additional props", () => {
    render(<Separator data-testid="separator" aria-label="divider" />);

    const separator = screen.getByTestId("separator");
    expect(separator).toHaveAttribute("aria-label", "divider");
  });

  it("combines custom className with default classes", () => {
    render(<Separator className="my-4" data-testid="separator" />);

    const separator = screen.getByTestId("separator");
    expect(separator).toHaveClass("shrink-0");
    expect(separator).toHaveClass("bg-border");
    expect(separator).toHaveClass("my-4");
  });

  it("has correct displayName", () => {
    expect(Separator.displayName).toBe("Separator");
  });

  it("supports horizontal orientation explicitly", () => {
    render(<Separator orientation="horizontal" data-testid="separator" />);

    const separator = screen.getByTestId("separator");
    expect(separator).toHaveAttribute("data-orientation", "horizontal");
    expect(separator).toHaveClass("h-[1px]");
    expect(separator).toHaveClass("w-full");
  });

  it("has correct data-orientation attribute for vertical", () => {
    render(<Separator orientation="vertical" data-testid="separator" />);

    const separator = screen.getByTestId("separator");
    expect(separator).toHaveAttribute("data-orientation", "vertical");
  });
});
