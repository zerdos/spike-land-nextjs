import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MixShareQRCode } from "./MixShareQRCode";

// Mock qrcode.react
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({
    value,
    "aria-label": ariaLabel,
  }: {
    value: string;
    size?: number;
    level?: string;
    includeMargin?: boolean;
    "aria-label"?: string;
  }) => (
    <svg data-testid="qr-code-svg" aria-label={ariaLabel}>
      <title>{value}</title>
    </svg>
  ),
}));

describe("MixShareQRCode", () => {
  const defaultProps = {
    shareUrl: "https://spike.land/apps/pixel/mix/test-job-123",
  };

  const mockClipboard = {
    writeText: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Object.defineProperty(navigator, "clipboard", {
      value: mockClipboard,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Rendering", () => {
    it("renders expanded by default", () => {
      render(<MixShareQRCode {...defaultProps} />);

      expect(screen.getByTestId("qr-code-container")).toBeInTheDocument();
      expect(screen.getByTestId("qr-code-svg")).toBeInTheDocument();
      expect(screen.getByText("Share this mix")).toBeInTheDocument();
    });

    it("renders QR code with correct shareUrl", () => {
      render(<MixShareQRCode {...defaultProps} />);

      const qrCode = screen.getByTestId("qr-code-svg");
      const title = qrCode.querySelector("title");
      expect(title?.textContent).toBe(defaultProps.shareUrl);
    });

    it("renders with correct aria-label for accessibility", () => {
      render(<MixShareQRCode {...defaultProps} />);

      const qrCode = screen.getByTestId("qr-code-svg");
      expect(qrCode).toHaveAttribute(
        "aria-label",
        "QR code for sharing this mix",
      );
    });

    it("renders copy button with 'Copy Link' text", () => {
      render(<MixShareQRCode {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Copy Link/i }))
        .toBeInTheDocument();
    });

    it("renders close button in expanded state", () => {
      render(<MixShareQRCode {...defaultProps} />);

      // The X button inside the expanded panel
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(2); // Close and Copy buttons
    });

    it("applies custom className", () => {
      const { container } = render(
        <MixShareQRCode {...defaultProps} className="custom-class" />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("custom-class");
    });

    it("has hidden lg:block classes for mobile hiding", () => {
      const { container } = render(<MixShareQRCode {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("hidden");
      expect(wrapper.className).toContain("lg:block");
    });

    it("is fixed positioned in bottom-right corner", () => {
      const { container } = render(<MixShareQRCode {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("fixed");
      expect(wrapper.className).toContain("bottom-6");
      expect(wrapper.className).toContain("right-6");
    });
  });

  describe("Toggle functionality", () => {
    it("collapses when close button is clicked", async () => {
      render(<MixShareQRCode {...defaultProps} />);

      // Find and click the close button (X icon)
      const closeButton = screen.getAllByRole("button")[0]; // First button is close
      fireEvent.click(closeButton);

      // Should show collapsed state with QR icon button
      await waitFor(() => {
        expect(screen.queryByTestId("qr-code-container")).not.toBeInTheDocument();
      });
    });

    it("expands when QR icon button is clicked from collapsed state", async () => {
      render(<MixShareQRCode {...defaultProps} />);

      // Collapse first
      const closeButton = screen.getAllByRole("button")[0];
      fireEvent.click(closeButton);

      // Wait for collapsed state
      await waitFor(() => {
        expect(screen.queryByTestId("qr-code-container")).not.toBeInTheDocument();
      });

      // Click the QR icon button to expand
      const expandButton = screen.getByRole("button");
      fireEvent.click(expandButton);

      // Should show expanded state again
      await waitFor(() => {
        expect(screen.getByTestId("qr-code-container")).toBeInTheDocument();
      });
    });

    it("shows rounded QR icon button when collapsed", async () => {
      render(<MixShareQRCode {...defaultProps} />);

      // Collapse
      const closeButton = screen.getAllByRole("button")[0];
      fireEvent.click(closeButton);

      await waitFor(() => {
        const expandButton = screen.getByRole("button");
        expect(expandButton.className).toContain("rounded-full");
      });
    });
  });

  describe("Copy functionality", () => {
    it("copies URL using navigator.clipboard.writeText", async () => {
      render(<MixShareQRCode {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /Copy Link/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          defaultProps.shareUrl,
        );
      });
    });

    it("shows 'Copied!' feedback after successful copy", async () => {
      render(<MixShareQRCode {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /Copy Link/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
    });

    it("reverts to 'Copy Link' after 2 seconds", async () => {
      render(<MixShareQRCode {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /Copy Link/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });

      // Advance timers by 2000ms
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText("Copy Link")).toBeInTheDocument();
      });
    });

    it("uses execCommand fallback when clipboard API fails", async () => {
      const mockExecCommand = vi.fn();
      document.execCommand = mockExecCommand;

      mockClipboard.writeText.mockRejectedValueOnce(
        new Error("Clipboard failed"),
      );

      render(<MixShareQRCode {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /Copy Link/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockExecCommand).toHaveBeenCalledWith("copy");
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
    });

    it("handles both clipboard API and execCommand failure gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockExecCommand = vi.fn().mockImplementation(() => {
        throw new Error("execCommand failed");
      });
      document.execCommand = mockExecCommand;

      mockClipboard.writeText.mockRejectedValueOnce(
        new Error("Clipboard failed"),
      );

      render(<MixShareQRCode {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /Copy Link/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Copy failed: clipboard not available",
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it("creates hidden textarea for fallback copy", async () => {
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");
      const mockExecCommand = vi.fn();
      document.execCommand = mockExecCommand;

      mockClipboard.writeText.mockRejectedValueOnce(
        new Error("Clipboard failed"),
      );

      render(<MixShareQRCode {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /Copy Link/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
        expect(mockExecCommand).toHaveBeenCalledWith("copy");
      });

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe("URL handling", () => {
    it("uses shareUrl prop for QR code value", () => {
      const customUrl = "https://example.com/custom-path";
      render(<MixShareQRCode shareUrl={customUrl} />);

      const qrCode = screen.getByTestId("qr-code-svg");
      const title = qrCode.querySelector("title");
      expect(title?.textContent).toBe(customUrl);
    });

    it("copies the correct URL when shareUrl changes", async () => {
      const { rerender } = render(<MixShareQRCode {...defaultProps} />);

      const newUrl = "https://spike.land/apps/pixel/mix/new-job-456";
      rerender(<MixShareQRCode shareUrl={newUrl} />);

      const copyButton = screen.getByRole("button", { name: /Copy Link/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(newUrl);
      });
    });
  });
});
