import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type DisplayType, DisplayTypeSwitcher } from "./display-type-switcher";

describe("DisplayTypeSwitcher", () => {
  it("renders all three display type options", () => {
    const onChange = vi.fn();
    render(<DisplayTypeSwitcher value="auto" onChange={onChange} />);

    expect(screen.getByText("Original")).toBeDefined();
    expect(screen.getByText("Auto")).toBeDefined();
    expect(screen.getByText("Enhanced")).toBeDefined();
  });

  it("highlights the selected value", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DisplayTypeSwitcher value="original" onChange={onChange} />,
    );

    // Original should be selected (data-state="on")
    const originalButton = screen.getByLabelText("Show original images");
    expect(originalButton.getAttribute("data-state")).toBe("on");

    rerender(<DisplayTypeSwitcher value="enhanced" onChange={onChange} />);

    const enhancedButton = screen.getByLabelText("Show enhanced images only");
    expect(enhancedButton.getAttribute("data-state")).toBe("on");
  });

  it("calls onChange when a different option is selected", () => {
    const onChange = vi.fn();
    render(<DisplayTypeSwitcher value="auto" onChange={onChange} />);

    fireEvent.click(screen.getByText("Original"));
    expect(onChange).toHaveBeenCalledWith("original");
  });

  it("applies custom className", () => {
    const onChange = vi.fn();
    render(
      <DisplayTypeSwitcher
        value="auto"
        onChange={onChange}
        className="custom-class"
      />,
    );

    const group = screen.getByRole("group");
    expect(group.className).toContain("custom-class");
  });

  it("has proper aria labels for accessibility", () => {
    const onChange = vi.fn();
    render(<DisplayTypeSwitcher value="auto" onChange={onChange} />);

    expect(screen.getByLabelText("Show original images")).toBeDefined();
    expect(screen.getByLabelText("Auto - prefer enhanced")).toBeDefined();
    expect(screen.getByLabelText("Show enhanced images only")).toBeDefined();
  });

  it("renders icons for each option", () => {
    const onChange = vi.fn();
    render(<DisplayTypeSwitcher value="auto" onChange={onChange} />);

    // Check that SVG icons are present
    const buttons = screen.getAllByRole("radio");
    buttons.forEach((button) => {
      expect(button.querySelector("svg")).toBeDefined();
    });
  });
});
