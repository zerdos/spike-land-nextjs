import * as consoleCaptureModule from "@/lib/errors/console-capture.client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsError from "./error";

vi.mock("@/lib/errors/console-capture.client", () => ({
  reportErrorBoundary: vi.fn(),
}));

describe("SettingsError (Settings Error Boundary)", () => {
  const mockReset = vi.fn();
  const mockError = new Error("Failed to load settings");

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as { location?: unknown; }).location;
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
      configurable: true,
    });
  });

  it("should render error card with title", () => {
    render(<SettingsError error={mockError} reset={mockReset} />);

    expect(screen.getByText("Error Loading Settings")).toBeInTheDocument();
    expect(
      screen.getByText("We couldn't load your settings. Please try again."),
    )
      .toBeInTheDocument();
  });

  it("should display error message", () => {
    render(<SettingsError error={mockError} reset={mockReset} />);

    expect(screen.getByText("Failed to load settings")).toBeInTheDocument();
  });

  it("should display default message when error message is empty", () => {
    const emptyError = new Error("");
    render(<SettingsError error={emptyError} reset={mockReset} />);

    expect(screen.getByText("Failed to load settings")).toBeInTheDocument();
  });

  it("should call reset when Try again button is clicked", async () => {
    const user = userEvent.setup();
    render(<SettingsError error={mockError} reset={mockReset} />);

    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    await user.click(tryAgainButton);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("should navigate to home when Go home button is clicked", async () => {
    const user = userEvent.setup();
    render(<SettingsError error={mockError} reset={mockReset} />);

    const goHomeButton = screen.getByRole("button", { name: /go home/i });
    await user.click(goHomeButton);

    expect(window.location.href).toBe("/");
  });

  it("should report error on mount", () => {
    render(<SettingsError error={mockError} reset={mockReset} />);

    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenCalledWith(
      mockError,
    );
  });

  it("should render alert with What happened title", () => {
    render(<SettingsError error={mockError} reset={mockReset} />);

    expect(screen.getByText("What happened?")).toBeInTheDocument();
  });

  it("should have both action buttons", () => {
    render(<SettingsError error={mockError} reset={mockReset} />);

    expect(screen.getByRole("button", { name: /try again/i }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: /go home/i }))
      .toBeInTheDocument();
  });

  it("should re-report error if error changes", () => {
    const { rerender } = render(
      <SettingsError error={mockError} reset={mockReset} />,
    );

    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenCalledTimes(1);

    const newError = new Error("Updated error");
    rerender(<SettingsError error={newError} reset={mockReset} />);

    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenCalledTimes(2);
  });

  it("should render within container", () => {
    const { container } = render(
      <SettingsError error={mockError} reset={mockReset} />,
    );

    expect(container.querySelector(".container")).toBeInTheDocument();
  });

  it("should use destructive alert variant", () => {
    render(<SettingsError error={mockError} reset={mockReset} />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
  });

  it("should center card with max-width", () => {
    const { container } = render(
      <SettingsError error={mockError} reset={mockReset} />,
    );

    const card = container.querySelector(".max-w-2xl.mx-auto");
    expect(card).toBeInTheDocument();
  });

  it("should have consistent styling with other error boundaries", () => {
    render(<SettingsError error={mockError} reset={mockReset} />);

    // Check for consistent button layout
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });
});
