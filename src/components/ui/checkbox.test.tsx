import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./checkbox";

describe("Checkbox Component", () => {
  it("should render checkbox", () => {
    render(<Checkbox aria-label="test checkbox" />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("should render unchecked by default", () => {
    render(<Checkbox aria-label="test checkbox" />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("should render checked when checked prop is true", () => {
    render(<Checkbox checked aria-label="test checkbox" />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("should call onCheckedChange when clicked", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox onCheckedChange={onCheckedChange} aria-label="test checkbox" />);

    await user.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("should toggle checked state when controlled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <Checkbox checked={false} onCheckedChange={onCheckedChange} aria-label="test checkbox" />
    );

    await user.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);

    rerender(
      <Checkbox checked={true} onCheckedChange={onCheckedChange} aria-label="test checkbox" />
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("should be disabled when disabled prop is true", () => {
    render(<Checkbox disabled aria-label="test checkbox" />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  it("should not call onCheckedChange when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox disabled onCheckedChange={onCheckedChange} aria-label="test checkbox" />);

    await user.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("should apply custom className", () => {
    render(<Checkbox className="custom-class" aria-label="test checkbox" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveClass("custom-class");
  });

  it("should forward ref correctly", () => {
    const ref = { current: null };
    render(<Checkbox ref={ref} aria-label="test checkbox" />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("should pass through additional props", () => {
    render(<Checkbox data-testid="test-checkbox" aria-label="Test" />);
    expect(screen.getByTestId("test-checkbox")).toBeInTheDocument();
  });

  it("should have correct display name", () => {
    expect(Checkbox.displayName).toBe("Checkbox");
  });

  it("should have proper default styling classes", () => {
    render(<Checkbox aria-label="test checkbox" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveClass("h-4", "w-4", "rounded-sm");
  });
});
