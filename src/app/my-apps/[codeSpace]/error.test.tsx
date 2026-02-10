import * as consoleCaptureModule from "@/lib/errors/console-capture.client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CodeSpaceError from "./error";

vi.mock("@/lib/errors/console-capture.client", () => ({
  reportErrorBoundary: vi.fn(),
}));

vi.mock("@/components/ui/link", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("CodeSpaceError (CodeSpace Error Boundary)", () => {
  const mockReset = vi.fn();
  const mockError = new Error("Test codespace error");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render error card with message", () => {
    render(<CodeSpaceError error={mockError} reset={mockReset} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We encountered an error while loading this codespace.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Test codespace error")).toBeInTheDocument();
  });

  it("should display default message when error message is empty", () => {
    const emptyError = new Error("");
    render(<CodeSpaceError error={emptyError} reset={mockReset} />);

    expect(
      screen.getByText("An unexpected error occurred"),
    ).toBeInTheDocument();
  });

  it("should display error digest when available", () => {
    const errorWithDigest = Object.assign(new Error("digest error"), {
      digest: "abc123",
    });
    render(<CodeSpaceError error={errorWithDigest} reset={mockReset} />);

    expect(screen.getByText("Error ID: abc123")).toBeInTheDocument();
  });

  it("should not display error digest when not available", () => {
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

  it("should have a link to My Apps", () => {
    render(<CodeSpaceError error={mockError} reset={mockReset} />);

    const link = screen.getByRole("link");
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

  it("should render buttons in footer", () => {
    render(<CodeSpaceError error={mockError} reset={mockReset} />);

    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    const backButton = screen.getByRole("button", { name: /back to my apps/i });

    expect(tryAgainButton).toBeInTheDocument();
    expect(backButton).toBeInTheDocument();
  });

  it("should center content on screen", () => {
    const { container } = render(
      <CodeSpaceError error={mockError} reset={mockReset} />,
    );

    const wrapper = container.querySelector(".min-h-screen");
    expect(wrapper).toBeInTheDocument();
  });
});
