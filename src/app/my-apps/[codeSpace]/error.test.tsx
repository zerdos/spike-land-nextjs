import * as consoleCaptureModule from "@/lib/errors/console-capture.client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CodeSpaceError from "./error";

vi.mock("@/lib/errors/console-capture.client", () => ({
  reportErrorBoundary: vi.fn(),
}));

vi.mock("@/components/ui/link", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode; }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("CodeSpaceError (CodeSpace Error Boundary)", () => {
  const mockReset = vi.fn();
  const mockError = new Error("Failed to load codespace");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render error card with title and description", () => {
    render(<CodeSpaceError error={mockError} reset={mockReset} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We encountered an error while loading this codespace.",
      ),
    ).toBeInTheDocument();
  });

  it("should display error message", () => {
    render(<CodeSpaceError error={mockError} reset={mockReset} />);

    expect(screen.getByText("Failed to load codespace")).toBeInTheDocument();
  });

  it("should display default message when error message is empty", () => {
    const emptyError = new Error("");
    render(<CodeSpaceError error={emptyError} reset={mockReset} />);

    expect(
      screen.getByText("An unexpected error occurred"),
    ).toBeInTheDocument();
  });

  it("should display error digest when provided", () => {
    const errorWithDigest = Object.assign(new Error("Test error"), {
      digest: "abc123",
    });
    render(<CodeSpaceError error={errorWithDigest} reset={mockReset} />);

    expect(screen.getByText("Error ID: abc123")).toBeInTheDocument();
  });

  it("should not display error digest when not provided", () => {
    render(<CodeSpaceError error={mockError} reset={mockReset} />);

    expect(screen.queryByText(/Error ID:/)).not.toBeInTheDocument();
  });

  it("should call reset when Try Again button is clicked", async () => {
    const user = userEvent.setup();
    render(<CodeSpaceError error={mockError} reset={mockReset} />);

    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    await user.click(tryAgainButton);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("should have a link back to My Apps", () => {
    render(<CodeSpaceError error={mockError} reset={mockReset} />);

    const link = screen.getByRole("link", { name: /back to my apps/i });
    expect(link).toHaveAttribute("href", "/my-apps");
  });

  it("should report error on mount via reportErrorBoundary", () => {
    render(<CodeSpaceError error={mockError} reset={mockReset} />);

    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenCalledWith(
      mockError,
    );
  });

  it("should re-report error if error changes", () => {
    const { rerender } = render(
      <CodeSpaceError error={mockError} reset={mockReset} />,
    );

    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenCalledTimes(1);

    const newError = new Error("New error");
    rerender(<CodeSpaceError error={newError} reset={mockReset} />);

    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenCalledTimes(2);
    expect(consoleCaptureModule.reportErrorBoundary).toHaveBeenLastCalledWith(
      newError,
    );
  });

  it("should render within background container", () => {
    const { container } = render(
      <CodeSpaceError error={mockError} reset={mockReset} />,
    );

    expect(container.querySelector(".min-h-screen.bg-background"))
      .toBeInTheDocument();
  });

  it("should have both action buttons", () => {
    render(<CodeSpaceError error={mockError} reset={mockReset} />);

    expect(screen.getByRole("button", { name: /try again/i }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to my apps/i }))
      .toBeInTheDocument();
  });
});
