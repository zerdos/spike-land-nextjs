import { render, screen, fireEvent } from "@testing-library/react";
import { ContrastCheckerDemo } from "./ContrastCheckerDemo";
import { describe, it, expect } from "vitest";

describe("ContrastCheckerDemo Component", () => {
  it("renders with initial default values", () => {
    render(<ContrastCheckerDemo />);
    // Default fg: #FFFFFF, bg: #08081C

    expect(screen.getByLabelText("Foreground Color")).toHaveValue("#FFFFFF");
    expect(screen.getByLabelText("Background Color")).toHaveValue("#08081C");

    // Check for contrast ratio text
    // The main ratio is 19.78:1 for white on 08081C
    expect(screen.getByText(/19\.78:1/)).toBeInTheDocument();

    // Check that we have passes
    // #FFFFFF on #08081C is high contrast
    expect(screen.getAllByText("Pass")).toHaveLength(4);
  });

  it("updates foreground color and recalculates contrast", () => {
    render(<ContrastCheckerDemo />);

    const fgInput = screen.getByLabelText("Foreground Color");

    // Change to black (#000000)
    fireEvent.change(fgInput, { target: { value: "#000000" } });

    expect(fgInput).toHaveValue("#000000");
    // Contrast of #000000 on #08081C is very low, around 1.06:1
    expect(screen.getByText(/1\.06:1/)).toBeInTheDocument();
  });

  it("updates background color and recalculates contrast", () => {
    render(<ContrastCheckerDemo />);
    const bgInput = screen.getByLabelText("Background Color");

    // Change to white (#FFFFFF)
    fireEvent.change(bgInput, { target: { value: "#FFFFFF" } });

    expect(bgInput).toHaveValue("#FFFFFF");
    // Contrast of #FFFFFF (fg default) on #FFFFFF (bg) is 1:1
    expect(screen.getByText("1.00:1")).toBeInTheDocument();

    // All should fail
    expect(screen.getAllByText("Fail")).toHaveLength(4);
  });

  it("updates contrast statuses correctly", () => {
      render(<ContrastCheckerDemo />);
      const fgInput = screen.getByLabelText("Foreground Color");
      const bgInput = screen.getByLabelText("Background Color");

      // Set colors to have a contrast between 3 and 4.5
      // #777777 on #ffffff is approx 4.47:1
      fireEvent.change(fgInput, { target: { value: "#777777" } });
      fireEvent.change(bgInput, { target: { value: "#ffffff" } });

      // AA Normal (4.5) -> Fail
      // AA Large (3) -> Pass
      // AAA Normal (7) -> Fail
      // AAA Large (4.5) -> Fail

      const aaLargeContainer = screen.getByText("WCAG AA (Large)").closest("div.p-3");
      expect(aaLargeContainer).toHaveTextContent("Pass");

      const aaNormalContainer = screen.getByText("WCAG AA (Normal)").closest("div.p-3");
      expect(aaNormalContainer).toHaveTextContent("Fail");
  });
});
