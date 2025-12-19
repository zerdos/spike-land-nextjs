import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

describe("ToggleGroup", () => {
  it("renders toggle group with items", () => {
    render(
      <ToggleGroup type="single" defaultValue="a">
        <ToggleGroupItem value="a">Option A</ToggleGroupItem>
        <ToggleGroupItem value="b">Option B</ToggleGroupItem>
        <ToggleGroupItem value="c">Option C</ToggleGroupItem>
      </ToggleGroup>,
    );

    expect(screen.getByText("Option A")).toBeDefined();
    expect(screen.getByText("Option B")).toBeDefined();
    expect(screen.getByText("Option C")).toBeDefined();
  });

  it("allows single selection", () => {
    const onChange = vi.fn();
    render(
      <ToggleGroup type="single" defaultValue="a" onValueChange={onChange}>
        <ToggleGroupItem value="a">Option A</ToggleGroupItem>
        <ToggleGroupItem value="b">Option B</ToggleGroupItem>
      </ToggleGroup>,
    );

    fireEvent.click(screen.getByText("Option B"));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("allows multiple selection", () => {
    const onChange = vi.fn();
    render(
      <ToggleGroup
        type="multiple"
        defaultValue={["a"]}
        onValueChange={onChange}
      >
        <ToggleGroupItem value="a">Option A</ToggleGroupItem>
        <ToggleGroupItem value="b">Option B</ToggleGroupItem>
      </ToggleGroup>,
    );

    fireEvent.click(screen.getByText("Option B"));
    expect(onChange).toHaveBeenCalledWith(["a", "b"]);
  });

  it("applies custom className", () => {
    render(
      <ToggleGroup type="single" className="custom-class">
        <ToggleGroupItem value="a">Option A</ToggleGroupItem>
      </ToggleGroup>,
    );

    const group = screen.getByRole("group");
    expect(group.className).toContain("custom-class");
  });

  it("applies disabled state", () => {
    render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="a" disabled>
          Disabled Option
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    const item = screen.getByText("Disabled Option");
    expect(item.closest("button")).toHaveProperty("disabled", true);
  });
});
