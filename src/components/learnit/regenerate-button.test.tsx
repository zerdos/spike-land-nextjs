import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegenerateButton } from "./regenerate-button";

const mockRefresh = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe("RegenerateButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders button with correct text", () => {
    render(<RegenerateButton slug="react/hooks" />);
    expect(screen.getByText("Regenerate")).toBeInTheDocument();
  });

  it("shows loading state during regeneration", async () => {
    const user = userEvent.setup();
    // Make fetch hang to keep loading state
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<RegenerateButton slug="react/hooks" />);
    await user.click(screen.getByRole("button"));

    expect(screen.getByText("Regenerating...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows success toast and refreshes on successful regeneration", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "PUBLISHED" }),
    });

    render(<RegenerateButton slug="react/hooks" />);
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Content regenerated successfully!");
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows login toast on 401 error", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
    });

    render(<RegenerateButton slug="react/hooks" />);
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("You must be logged in to regenerate content.");
    });
  });

  it("shows error toast on generic error", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<RegenerateButton slug="react/hooks" />);
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Failed to regenerate content. Please try again.",
      );
    });
  });
});
