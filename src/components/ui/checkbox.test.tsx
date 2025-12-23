import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("renders unchecked by default", () => {
    render(<Checkbox aria-label="test checkbox" />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDefined();
    expect(checkbox.getAttribute("data-state")).toBe("unchecked");
  });

  it("renders checked when checked prop is true", () => {
    render(<Checkbox aria-label="test checkbox" checked />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.getAttribute("data-state")).toBe("checked");
  });

  it("calls onCheckedChange when clicked", () => {
    const handleChange = vi.fn();
    render(
      <Checkbox aria-label="test checkbox" onCheckedChange={handleChange} />,
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it("can be disabled", () => {
    render(<Checkbox aria-label="test checkbox" disabled />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveProperty("disabled", true);
  });

  it("applies custom className", () => {
    render(<Checkbox aria-label="test checkbox" className="custom-class" />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.classList.contains("custom-class")).toBe(true);
  });

  it("forwards ref correctly", () => {
    const ref = vi.fn();
    render(<Checkbox aria-label="test checkbox" ref={ref} />);

    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0]![0]).toBeInstanceOf(HTMLButtonElement);
  });

  it("supports controlled state", () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <Checkbox
        aria-label="test checkbox"
        checked={false}
        onCheckedChange={handleChange}
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.getAttribute("data-state")).toBe("unchecked");

    rerender(
      <Checkbox
        aria-label="test checkbox"
        checked={true}
        onCheckedChange={handleChange}
      />,
    );
    expect(checkbox.getAttribute("data-state")).toBe("checked");
  });

  it("renders with id attribute", () => {
    render(<Checkbox id="my-checkbox" aria-label="test checkbox" />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.id).toBe("my-checkbox");
  });

  it("can be toggled multiple times", () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <Checkbox
        aria-label="test checkbox"
        checked={false}
        onCheckedChange={handleChange}
      />,
    );

    const checkbox = screen.getByRole("checkbox");

    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenLastCalledWith(true);

    rerender(
      <Checkbox
        aria-label="test checkbox"
        checked={true}
        onCheckedChange={handleChange}
      />,
    );

    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenLastCalledWith(false);

    expect(handleChange).toHaveBeenCalledTimes(2);
  });

  it("should not call onCheckedChange when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Checkbox
        disabled
        onCheckedChange={onCheckedChange}
        aria-label="test checkbox"
      />,
    );

    await user.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).not.toHaveBeenCalled();
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
    expect(checkbox).toHaveClass("h-5", "w-5", "rounded-md");
  });
});
