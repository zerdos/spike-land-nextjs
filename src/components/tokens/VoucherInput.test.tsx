import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoucherInput } from "./VoucherInput";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  CheckCircle2: () => <div data-testid="check-circle-icon">CheckCircle2</div>,
  Loader2: ({ className }: { className?: string; }) => (
    <div data-testid="loader-icon" className={className}>Loader2</div>
  ),
  XCircle: () => <div data-testid="x-circle-icon">XCircle</div>,
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("VoucherInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("rendering", () => {
    it("renders voucher input with label", () => {
      render(<VoucherInput />);

      expect(screen.getByLabelText("Voucher Code")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter code")).toBeInTheDocument();
    });

    it("renders apply button", () => {
      render(<VoucherInput />);

      expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    });

    it("button is disabled when input is empty", () => {
      render(<VoucherInput />);

      const button = screen.getByRole("button", { name: "Apply" });
      expect(button).toBeDisabled();
    });

    it("button is enabled when input has value", async () => {
      const user = userEvent.setup();
      render(<VoucherInput />);

      await user.type(screen.getByLabelText("Voucher Code"), "TEST123");

      const button = screen.getByRole("button", { name: "Apply" });
      expect(button).not.toBeDisabled();
    });
  });

  describe("input behavior", () => {
    it("converts input to uppercase", async () => {
      const user = userEvent.setup();
      render(<VoucherInput />);

      const input = screen.getByLabelText("Voucher Code");
      await user.type(input, "test123");

      expect(input).toHaveValue("TEST123");
    });

    it("does not submit when input is empty", async () => {
      render(<VoucherInput />);

      const button = screen.getByRole("button", { name: "Apply" });
      fireEvent.click(button);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("does not submit when input is only whitespace", async () => {
      const user = userEvent.setup();
      render(<VoucherInput />);

      const input = screen.getByLabelText("Voucher Code");
      await user.type(input, "   ");

      const button = screen.getByRole("button", { name: "Apply" });
      fireEvent.click(button);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("trims whitespace from code before submitting", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, tokensGranted: 50, newBalance: 150 }),
      });

      const user = userEvent.setup();
      render(<VoucherInput />);

      const input = screen.getByLabelText("Voucher Code");
      await user.type(input, "  TEST123  ");

      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/vouchers/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: "TEST123" }),
        });
      });
    });
  });

  describe("successful redemption", () => {
    it("shows success message on successful redemption", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, tokensGranted: 50, newBalance: 150 }),
      });

      const user = userEvent.setup();
      render(<VoucherInput />);

      await user.type(screen.getByLabelText("Voucher Code"), "TEST123");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        expect(screen.getByText("Successfully redeemed! You received 50 tokens."))
          .toBeInTheDocument();
      });
    });

    it("clears input on successful redemption", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, tokensGranted: 50, newBalance: 150 }),
      });

      const user = userEvent.setup();
      render(<VoucherInput />);

      const input = screen.getByLabelText("Voucher Code");
      await user.type(input, "TEST123");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        expect(input).toHaveValue("");
      });
    });

    it("calls onRedeemed callback on successful redemption", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, tokensGranted: 50, newBalance: 150 }),
      });

      const onRedeemed = vi.fn();
      const user = userEvent.setup();
      render(<VoucherInput onRedeemed={onRedeemed} />);

      await user.type(screen.getByLabelText("Voucher Code"), "TEST123");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        expect(onRedeemed).toHaveBeenCalledWith(50, 150);
      });
    });

    it("shows success icon on successful redemption", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, tokensGranted: 100, newBalance: 200 }),
      });

      const user = userEvent.setup();
      render(<VoucherInput />);

      await user.type(screen.getByLabelText("Voucher Code"), "TEST123");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument();
      });
    });

    it("works without onRedeemed callback", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, tokensGranted: 50, newBalance: 150 }),
      });

      const user = userEvent.setup();
      render(<VoucherInput />);

      await user.type(screen.getByLabelText("Voucher Code"), "TEST123");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        expect(screen.getByText("Successfully redeemed! You received 50 tokens."))
          .toBeInTheDocument();
      });
    });
  });

  describe("failed redemption", () => {
    it("shows error message from API on failure", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: false, error: "Voucher has expired" }),
      });

      const user = userEvent.setup();
      render(<VoucherInput />);

      await user.type(screen.getByLabelText("Voucher Code"), "EXPIRED");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        expect(screen.getByText("Voucher has expired")).toBeInTheDocument();
      });
    });

    it("shows default error message when API returns no error", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: false }),
      });

      const user = userEvent.setup();
      render(<VoucherInput />);

      await user.type(screen.getByLabelText("Voucher Code"), "INVALID");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        expect(screen.getByText("Failed to redeem voucher")).toBeInTheDocument();
      });
    });

    it("shows error icon on failed redemption", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: false, error: "Invalid code" }),
      });

      const user = userEvent.setup();
      render(<VoucherInput />);

      await user.type(screen.getByLabelText("Voucher Code"), "INVALID");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        expect(screen.getByTestId("x-circle-icon")).toBeInTheDocument();
      });
    });

    it("does not clear input on failed redemption", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: false, error: "Invalid code" }),
      });

      const user = userEvent.setup();
      render(<VoucherInput />);

      const input = screen.getByLabelText("Voucher Code");
      await user.type(input, "INVALID");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        expect(screen.getByText("Invalid code")).toBeInTheDocument();
      });
      expect(input).toHaveValue("INVALID");
    });

    it("does not call onRedeemed callback on failure", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: false, error: "Invalid code" }),
      });

      const onRedeemed = vi.fn();
      const user = userEvent.setup();
      render(<VoucherInput onRedeemed={onRedeemed} />);

      await user.type(screen.getByLabelText("Voucher Code"), "INVALID");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        expect(screen.getByText("Invalid code")).toBeInTheDocument();
      });
      expect(onRedeemed).not.toHaveBeenCalled();
    });
  });

  describe("network error handling", () => {
    it("shows error message on network error", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const user = userEvent.setup();
      render(<VoucherInput />);

      await user.type(screen.getByLabelText("Voucher Code"), "TEST123");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        expect(screen.getByText("An error occurred. Please try again.")).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it("logs error to console on network error", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("Network error");
      mockFetch.mockRejectedValueOnce(error);

      const user = userEvent.setup();
      render(<VoucherInput />);

      await user.type(screen.getByLabelText("Voucher Code"), "TEST123");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith("[VoucherInput] Redemption error:", error);
      });

      consoleErrorSpy.mockRestore();
    });

    it("shows error icon on network error", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const user = userEvent.setup();
      render(<VoucherInput />);

      await user.type(screen.getByLabelText("Voucher Code"), "TEST123");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        expect(screen.getByTestId("x-circle-icon")).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("loading state", () => {
    it("shows loading spinner while redemption is in progress", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() =>
              resolve({
                json: async () => ({ success: true, tokensGranted: 50, newBalance: 150 }),
              }), 100)
          ),
      );

      const user = userEvent.setup();
      render(<VoucherInput />);

      await user.type(screen.getByLabelText("Voucher Code"), "TEST123");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      expect(screen.getByTestId("loader-icon")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId("loader-icon")).not.toBeInTheDocument();
      });
    });

    it("disables input while redemption is in progress", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() =>
              resolve({
                json: async () => ({ success: true, tokensGranted: 50, newBalance: 150 }),
              }), 100)
          ),
      );

      const user = userEvent.setup();
      render(<VoucherInput />);

      await user.type(screen.getByLabelText("Voucher Code"), "TEST123");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      expect(screen.getByLabelText("Voucher Code")).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByLabelText("Voucher Code")).not.toBeDisabled();
      });
    });

    it("disables button while redemption is in progress", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() =>
              resolve({
                json: async () => ({ success: true, tokensGranted: 50, newBalance: 150 }),
              }), 100)
          ),
      );

      const user = userEvent.setup();
      render(<VoucherInput />);

      await user.type(screen.getByLabelText("Voucher Code"), "TEST123");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      expect(screen.getByRole("button")).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByTestId("loader-icon")).not.toBeInTheDocument();
      });
    });

    it("clears previous result when starting new redemption", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: false, error: "Invalid code" }),
      });

      const user = userEvent.setup();
      render(<VoucherInput />);

      // First attempt - failure
      await user.type(screen.getByLabelText("Voucher Code"), "INVALID");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        expect(screen.getByText("Invalid code")).toBeInTheDocument();
      });

      // Start second attempt
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() =>
              resolve({
                json: async () => ({ success: true, tokensGranted: 50, newBalance: 150 }),
              }), 100)
          ),
      );

      await user.clear(screen.getByLabelText("Voucher Code"));
      await user.type(screen.getByLabelText("Voucher Code"), "VALID");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      // Previous result should be cleared
      expect(screen.queryByText("Invalid code")).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Successfully redeemed! You received 50 tokens."))
          .toBeInTheDocument();
      });
    });
  });

  describe("alert styling", () => {
    it("applies success styling on successful redemption", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, tokensGranted: 50, newBalance: 150 }),
      });

      const user = userEvent.setup();
      render(<VoucherInput />);

      await user.type(screen.getByLabelText("Voucher Code"), "TEST123");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert).toHaveClass("bg-green-500/10", "border-green-500/30", "text-green-400");
      });
    });

    it("applies error styling on failed redemption", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: false, error: "Invalid code" }),
      });

      const user = userEvent.setup();
      render(<VoucherInput />);

      await user.type(screen.getByLabelText("Voucher Code"), "INVALID");
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert).toHaveClass("bg-red-500/10", "border-red-500/30", "text-red-400");
      });
    });
  });
});
