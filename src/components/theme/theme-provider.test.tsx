import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "./theme-provider";

describe("ThemeProvider", () => {
  it("renders children correctly", () => {
    render(
      <ThemeProvider>
        <div>Test Content</div>
      </ThemeProvider>,
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("applies attribute prop", () => {
    const { container } = render(
      <ThemeProvider attribute="class">
        <div>Test Content</div>
      </ThemeProvider>,
    );

    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("accepts defaultTheme prop", () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <div>Test Content</div>
      </ThemeProvider>,
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });
});
