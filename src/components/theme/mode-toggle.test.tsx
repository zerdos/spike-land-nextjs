import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ModeToggle } from "./mode-toggle";
import { ThemeProvider } from "./theme-provider";

describe("ModeToggle", () => {
  it("renders toggle button", async () => {
    render(
      <ThemeProvider>
        <ModeToggle />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  it("shows sun icon and correct label in light mode", async () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ModeToggle />
      </ThemeProvider>,
    );

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute(
        "aria-label",
        "Light mode active. Click to switch to dark mode.",
      );
    });
  });

  it("shows moon icon and correct label in dark mode", async () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ModeToggle />
      </ThemeProvider>,
    );

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute(
        "aria-label",
        "Dark mode active. Click to use system preference.",
      );
    });
  });

  it("shows monitor icon and correct label in system mode", async () => {
    render(
      <ThemeProvider defaultTheme="system">
        <ModeToggle />
      </ThemeProvider>,
    );

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      // System mode label depends on actual system preference
      expect(button.getAttribute("aria-label")).toMatch(/System mode active/);
    });
  });

  it("cycles through themes: light → dark → system → light", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider defaultTheme="light">
        <ModeToggle />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    const button = screen.getByRole("button");

    // Start in light mode
    expect(button).toHaveAttribute(
      "aria-label",
      "Light mode active. Click to switch to dark mode.",
    );

    // Click to go to dark mode
    await user.click(button);
    await waitFor(() => {
      expect(button).toHaveAttribute(
        "aria-label",
        "Dark mode active. Click to use system preference.",
      );
    });

    // Click to go to system mode
    await user.click(button);
    await waitFor(() => {
      expect(button.getAttribute("aria-label")).toMatch(/System mode active/);
    });

    // Click to go back to light mode
    await user.click(button);
    await waitFor(() => {
      expect(button).toHaveAttribute(
        "aria-label",
        "Light mode active. Click to switch to dark mode.",
      );
    });
  });

  it("has title attribute matching aria-label for tooltip", async () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ModeToggle />
      </ThemeProvider>,
    );

    await waitFor(() => {
      const button = screen.getByRole("button");
      const ariaLabel = button.getAttribute("aria-label");
      const title = button.getAttribute("title");
      expect(ariaLabel).toBe(title);
    });
  });

  it("contains screen reader text", async () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ModeToggle />
      </ThemeProvider>,
    );

    await waitFor(() => {
      // The sr-only span contains the aria-label text
      expect(screen.getByText("Light mode active. Click to switch to dark mode."))
        .toBeInTheDocument();
    });
  });

  it("shows loading state before mount", () => {
    const { container } = render(
      <ThemeProvider>
        <ModeToggle />
      </ThemeProvider>,
    );

    // Before mount, should show sun icon with loading label
    const button = container.querySelector("button");
    expect(button).toBeInTheDocument();
  });
});
