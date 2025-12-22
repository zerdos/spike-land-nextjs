import { render, screen } from "@testing-library/react";
import { ColorSwatch } from "./ColorSwatch";
import { describe, it, expect } from "vitest";

describe("ColorSwatch Component", () => {
  it("renders with name, hex, description, and role", () => {
    render(
      <ColorSwatch
        name="Primary"
        hex="#000000"
        desc="Primary color"
        role="Brand"
      />
    );

    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("#000000")).toBeInTheDocument();
    expect(screen.getByText("Primary color")).toBeInTheDocument();
    expect(screen.getByText("Brand")).toBeInTheDocument();
  });

  it("renders without role", () => {
    render(
      <ColorSwatch
        name="Primary"
        hex="#000000"
        desc="Primary color"
      />
    );

    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.queryByText("Brand")).not.toBeInTheDocument();
  });

  it("renders contrast pass badge when contrastPass is true", () => {
    render(
      <ColorSwatch
        name="Primary"
        hex="#000000"
        desc="Primary color"
        contrastPass={true}
      />
    );

    expect(screen.getByText("Contrast Pass (AA)")).toBeInTheDocument();
  });

  it("applies the correct background color style", () => {
    const { container } = render(
      <ColorSwatch
        name="Primary"
        hex="#123456"
        desc="Primary color"
      />
    );

    // The swatch div has class "w-16 h-16 rounded-xl border border-border shadow-sm flex-shrink-0"
    const swatch = container.querySelector(".w-16");
    expect(swatch).toHaveStyle({ backgroundColor: "rgb(18, 52, 86)" }); // #123456 in rgb
  });
});
