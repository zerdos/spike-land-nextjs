import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttributionToggle } from "./AttributionToggle";

describe("AttributionToggle", () => {
  it("renders both toggle options", () => {
    render(
      <AttributionToggle value="first-touch" onChange={vi.fn()} />,
    );

    expect(screen.getByText("First-touch")).toBeInTheDocument();
    expect(screen.getByText("Last-touch")).toBeInTheDocument();
  });

  it("highlights first-touch when selected", () => {
    render(
      <AttributionToggle value="first-touch" onChange={vi.fn()} />,
    );

    const firstTouch = screen.getByText("First-touch").closest("button");
    const lastTouch = screen.getByText("Last-touch").closest("button");

    expect(firstTouch).toHaveClass("bg-background");
    expect(lastTouch).not.toHaveClass("bg-background");
  });

  it("highlights last-touch when selected", () => {
    render(
      <AttributionToggle value="last-touch" onChange={vi.fn()} />,
    );

    const firstTouch = screen.getByText("First-touch").closest("button");
    const lastTouch = screen.getByText("Last-touch").closest("button");

    expect(firstTouch).not.toHaveClass("bg-background");
    expect(lastTouch).toHaveClass("bg-background");
  });

  it("calls onChange with first-touch when first-touch button is clicked", () => {
    const onChange = vi.fn();
    render(
      <AttributionToggle value="last-touch" onChange={onChange} />,
    );

    fireEvent.click(screen.getByText("First-touch"));

    expect(onChange).toHaveBeenCalledWith("first-touch");
  });

  it("calls onChange with last-touch when last-touch button is clicked", () => {
    const onChange = vi.fn();
    render(
      <AttributionToggle value="first-touch" onChange={onChange} />,
    );

    fireEvent.click(screen.getByText("Last-touch"));

    expect(onChange).toHaveBeenCalledWith("last-touch");
  });

  it("applies custom className", () => {
    const { container } = render(
      <AttributionToggle
        value="first-touch"
        onChange={vi.fn()}
        className="custom-class"
      />,
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });
});
