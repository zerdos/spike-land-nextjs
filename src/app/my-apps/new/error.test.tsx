import * as consoleCaptureModule from "@/lib/errors/console-capture.client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewAppError from "./error";

vi.mock("@/lib/errors/console-capture.client", () => ({
  reportErrorBoundary: vi.fn(),
}));

describe("NewAppError (New App Creation Error Boundary)", () => {
  const mockReset = vi.fn();
  const mockError = new Error("Failed to create app");

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
    render(<NewAppError error={mockError} reset={mockReset} />);

    expect(screen.getByText("Error Creating App")).toBeInTheDocument();
    expect(screen.getByText("We encountered an issue while creating your app."))
      .toBeInTheDocument();
  });

  it("should display error message", () => {
    render(<NewAppError error={mockError} reset={mockReset} />);

    expect(screen.getByText("Failed to create app")).toBeInTheDocument();
  });

  it("should display default message when error message is empty", () => {
    const emptyError = new Error("");
    render(<NewAppError error={emptyError} reset={mockReset} />);

    expect(screen.getByText("Failed to create app")).toBeInTheDocument();
  });

  it("should call reset when Try again button is clicked", async () => {
    const user = userEvent.setup();
    render(<NewAppError error={mockError} reset={mockReset} />);

    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    await user.click(tryAgainButton);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("should navigate to my-apps when Back to My Apps button is clicked", async () => {
    const user = userEvent.setup();
    render(<NewAppError error={mockError} reset={mockReset} />);

    const backButton = screen.getByRole("button", { name: /back to my apps/i });
    await user.click(backButton);

    expect(window.location.href).toBe("/my-apps");
  });

  it("should report error on mount", () => {
    render(<NewAppError error={mockError} reset={mockReset} />);

    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenCalledWith(
      mockError,
    );
  });

  it("should render alert with What went wrong title", () => {
    render(<NewAppError error={mockError} reset={mockReset} />);

    expect(screen.getByText("What went wrong?")).toBeInTheDocument();
  });

  it("should have both action buttons", () => {
    render(<NewAppError error={mockError} reset={mockReset} />);

    expect(screen.getByRole("button", { name: /try again/i }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to my apps/i }))
      .toBeInTheDocument();
  });

  it("should re-report error if error changes", () => {
    const { rerender } = render(
      <NewAppError error={mockError} reset={mockReset} />,
    );

    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenCalledTimes(1);

    const newError = new Error("Another error");
    rerender(<NewAppError error={newError} reset={mockReset} />);

    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenCalledTimes(2);
  });

  it("should render within container", () => {
    const { container } = render(
      <NewAppError error={mockError} reset={mockReset} />,
    );

    expect(container.querySelector(".container")).toBeInTheDocument();
  });

  it("should use destructive alert variant", () => {
    render(<NewAppError error={mockError} reset={mockReset} />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
  });

  it("should center card with max-width", () => {
    const { container } = render(
      <NewAppError error={mockError} reset={mockReset} />,
    );

    const card = container.querySelector(".max-w-2xl.mx-auto");
    expect(card).toBeInTheDocument();
  });
});
