import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppWorkspaceError from "./error";

// Mock console.error to avoid test output noise
vi.spyOn(console, "error").mockImplementation(() => {});

describe("AppWorkspaceError", () => {
  const mockReset = vi.fn();
  const mockError = new Error("Failed to load app");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders error card with title", () => {
    render(<AppWorkspaceError error={mockError} reset={mockReset} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We encountered an error while loading this app workspace.",
      ),
    ).toBeInTheDocument();
  });

  it("displays error message", () => {
    render(<AppWorkspaceError error={mockError} reset={mockReset} />);

    expect(screen.getByText("Failed to load app")).toBeInTheDocument();
  });

  it("displays default message when error message is empty", () => {
    const emptyError = new Error("");
    render(<AppWorkspaceError error={emptyError} reset={mockReset} />);

    expect(screen.getByText("An unexpected error occurred"))
      .toBeInTheDocument();
  });

  it("calls reset when Try Again button is clicked", async () => {
    const user = userEvent.setup();
    render(<AppWorkspaceError error={mockError} reset={mockReset} />);

    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    await user.click(tryAgainButton);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("renders Back to My Apps link", () => {
    render(<AppWorkspaceError error={mockError} reset={mockReset} />);

    expect(screen.getByRole("button", { name: /back to my apps/i }))
      .toBeInTheDocument();
  });

  it("logs error on mount", () => {
    render(<AppWorkspaceError error={mockError} reset={mockReset} />);

    expect(console.error).toHaveBeenCalledWith(
      "App workspace error:",
      mockError,
    );
  });

  it("has both action buttons", () => {
    render(<AppWorkspaceError error={mockError} reset={mockReset} />);

    expect(screen.getByRole("button", { name: /try again/i }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to my apps/i }))
      .toBeInTheDocument();
  });

  it("displays error digest when provided", () => {
    const errorWithDigest = Object.assign(new Error("Error with digest"), {
      digest: "abc123xyz",
    });

    render(<AppWorkspaceError error={errorWithDigest} reset={mockReset} />);

    expect(screen.getByText(/Error ID: abc123xyz/i)).toBeInTheDocument();
  });

  it("does not display error digest section when no digest is provided", () => {
    render(<AppWorkspaceError error={mockError} reset={mockReset} />);

    expect(screen.queryByText(/Error ID:/i)).not.toBeInTheDocument();
  });

  it("renders within container", () => {
    const { container } = render(
      <AppWorkspaceError error={mockError} reset={mockReset} />,
    );

    expect(container.querySelector(".container")).toBeInTheDocument();
  });

  it("renders card structure", () => {
    const { container } = render(
      <AppWorkspaceError error={mockError} reset={mockReset} />,
    );

    expect(container.querySelector('[class*="rounded-2xl"]'))
      .toBeInTheDocument();
  });

  it("re-logs error if error changes", () => {
    const { rerender } = render(
      <AppWorkspaceError error={mockError} reset={mockReset} />,
    );

    expect(console.error).toHaveBeenCalledTimes(1);

    const newError = new Error("New error");
    rerender(<AppWorkspaceError error={newError} reset={mockReset} />);

    expect(console.error).toHaveBeenCalledTimes(2);
  });
});
