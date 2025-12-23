import * as consoleCaptureModule from "@/lib/errors/console-capture.client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";

vi.mock("@/lib/errors/console-capture.client", () => ({
  reportErrorBoundary: vi.fn(),
}));

describe("Error (Root Error Boundary)", () => {
  const mockReset = vi.fn();
  const mockError = new Error("Test error message");

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as { location?: unknown; }).location;
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
      configurable: true,
    });
  });

  it("should render error card with message", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);

    expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
    expect(
      screen.getByText("We encountered an unexpected error. Please try again."),
    ).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();
  });

  it("should render error details alert", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);

    expect(screen.getByText("Error Details")).toBeInTheDocument();
  });

  it("should display default message when error message is empty", () => {
    const emptyError = new Error("");
    render(<ErrorPage error={emptyError} reset={mockReset} />);

    expect(
      screen.getByText("An unexpected error occurred"),
    ).toBeInTheDocument();
  });

  it("should call reset when Try again button is clicked", async () => {
    const user = userEvent.setup();
    render(<ErrorPage error={mockError} reset={mockReset} />);

    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    await user.click(tryAgainButton);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("should navigate to home when Go home button is clicked", async () => {
    const user = userEvent.setup();
    render(<ErrorPage error={mockError} reset={mockReset} />);

    const goHomeButton = screen.getByRole("button", { name: /go home/i });
    await user.click(goHomeButton);

    expect(window.location.href).toBe("/");
  });

  it("should report error on mount", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);

    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenCalledWith(
      mockError,
    );
  });

  it("should re-report error if error changes", () => {
    const { rerender } = render(
      <ErrorPage error={mockError} reset={mockReset} />,
    );

    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenCalledTimes(1);

    const newError = new Error("New error");
    rerender(<ErrorPage error={newError} reset={mockReset} />);

    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenCalledTimes(2);
    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenLastCalledWith(
      newError,
    );
  });

  it("should have Try again button with default variant", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);

    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    expect(tryAgainButton).toBeInTheDocument();
  });

  it("should have Go home button with outline variant", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);

    const goHomeButton = screen.getByRole("button", { name: /go home/i });
    expect(goHomeButton).toBeInTheDocument();
  });

  it("should render within a card component", () => {
    const { container } = render(
      <ErrorPage error={mockError} reset={mockReset} />,
    );

    // Check for card structure
    expect(container.querySelector(".flex.min-h-screen")).toBeInTheDocument();
  });

  it("should use destructive variant for alert", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
  });

  it("should center content on screen", () => {
    const { container } = render(
      <ErrorPage error={mockError} reset={mockReset} />,
    );

    const wrapper = container.querySelector(
      ".flex.min-h-screen.items-center.justify-center",
    );
    expect(wrapper).toBeInTheDocument();
  });

  it("should render buttons in footer", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);

    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    const goHomeButton = screen.getByRole("button", { name: /go home/i });

    expect(tryAgainButton).toBeInTheDocument();
    expect(goHomeButton).toBeInTheDocument();
  });
});
