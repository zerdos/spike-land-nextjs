import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QRCodePanel } from "./QRCodePanel";

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
    <svg data-testid="qr-code" aria-label={ariaLabel}>
      <title>{value}</title>
    </svg>
  ),
}));

describe("QRCodePanel", () => {
  const defaultProps = {
    albumId: "test-album-123",
    shareToken: "share-token-abc",
    albumName: "My Test Album",
  };

  const mockClipboard = {
    writeText: vi.fn().mockResolvedValue(undefined),
  };

  const mockWindowOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: mockClipboard,
      writable: true,
    });
    window.open = mockWindowOpen;
  });

  describe("Rendering", () => {
    it("renders QR code", () => {
      render(<QRCodePanel {...defaultProps} />);

      expect(screen.getByTestId("qr-code")).toBeInTheDocument();
    });

    it("renders QR code with correct aria label", () => {
      render(<QRCodePanel {...defaultProps} />);

      const qrCode = screen.getByTestId("qr-code");
      expect(qrCode).toHaveAttribute(
        "aria-label",
        "QR code for My Test Album canvas display",
      );
    });

    it("renders settings form", () => {
      render(<QRCodePanel {...defaultProps} />);

      expect(screen.getByLabelText("Rotation")).toBeInTheDocument();
      expect(screen.getByLabelText("Order")).toBeInTheDocument();
      expect(screen.getByLabelText("Interval")).toBeInTheDocument();
    });

    it("renders copy URL button", () => {
      render(<QRCodePanel {...defaultProps} />);

      expect(screen.getByTestId("copy-url-button")).toBeInTheDocument();
      expect(screen.getByText("Copy URL")).toBeInTheDocument();
    });

    it("renders open canvas button", () => {
      render(<QRCodePanel {...defaultProps} />);

      expect(screen.getByTestId("open-canvas-button")).toBeInTheDocument();
      expect(screen.getByText("Open")).toBeInTheDocument();
    });

    it("renders Canvas Display title", () => {
      render(<QRCodePanel {...defaultProps} />);

      expect(screen.getByText("Canvas Display")).toBeInTheDocument();
    });

    it("renders QR code container", () => {
      render(<QRCodePanel {...defaultProps} />);

      expect(screen.getByTestId("qr-code-container")).toBeInTheDocument();
    });
  });

  describe("URL generation", () => {
    it("generates correct initial URL with default settings", () => {
      render(<QRCodePanel {...defaultProps} />);

      const qrCode = screen.getByTestId("qr-code");
      const title = qrCode.querySelector("title");
      expect(title?.textContent).toContain("/canvas/test-album-123");
      expect(title?.textContent).toContain("token=share-token-abc");
      // Default settings (rotation=0, order=album, interval=10) are not included in URL by shared utility
      expect(title?.textContent).not.toContain("rotation=");
      expect(title?.textContent).not.toContain("order=");
      expect(title?.textContent).not.toContain("interval=");
    });

    it("updates URL when rotation changes", () => {
      render(<QRCodePanel {...defaultProps} />);

      const rotationTrigger = screen.getByTestId("rotation-select");
      fireEvent.click(rotationTrigger);

      const option90 = screen.getByText("90 clockwise");
      fireEvent.click(option90);

      const qrCode = screen.getByTestId("qr-code");
      const title = qrCode.querySelector("title");
      expect(title?.textContent).toContain("rotation=90");
    });

    it("updates URL when order changes", () => {
      render(<QRCodePanel {...defaultProps} />);

      const orderTrigger = screen.getByTestId("order-select");
      fireEvent.click(orderTrigger);

      const randomOption = screen.getByText("Random");
      fireEvent.click(randomOption);

      const qrCode = screen.getByTestId("qr-code");
      const title = qrCode.querySelector("title");
      expect(title?.textContent).toContain("order=random");
    });

    it("updates URL when interval changes", () => {
      render(<QRCodePanel {...defaultProps} />);

      const intervalInput = screen.getByTestId("interval-input");
      fireEvent.change(intervalInput, { target: { value: "30" } });

      const qrCode = screen.getByTestId("qr-code");
      const title = qrCode.querySelector("title");
      expect(title?.textContent).toContain("interval=30");
    });
  });

  describe("Copy URL functionality", () => {
    it("copies URL to clipboard when copy button is clicked", async () => {
      render(<QRCodePanel {...defaultProps} />);

      const copyButton = screen.getByTestId("copy-url-button");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining("/canvas/test-album-123"),
        );
      });
    });

    it("shows 'Copied!' feedback after copying", async () => {
      render(<QRCodePanel {...defaultProps} />);

      const copyButton = screen.getByTestId("copy-url-button");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
    });

    it("reverts to 'Copy URL' after timeout", async () => {
      render(<QRCodePanel {...defaultProps} />);

      const copyButton = screen.getByTestId("copy-url-button");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });

      // Wait for the timeout (2000ms + buffer)
      await waitFor(
        () => {
          expect(screen.getByText("Copy URL")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("uses fallback copy method when clipboard API fails", async () => {
      const mockExecCommand = vi.fn();
      document.execCommand = mockExecCommand;

      mockClipboard.writeText.mockRejectedValueOnce(new Error("Clipboard failed"));

      render(<QRCodePanel {...defaultProps} />);

      const copyButton = screen.getByTestId("copy-url-button");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockExecCommand).toHaveBeenCalledWith("copy");
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
    });
  });

  describe("Open Canvas functionality", () => {
    it("opens canvas URL in new tab when open button is clicked", () => {
      render(<QRCodePanel {...defaultProps} />);

      const openButton = screen.getByTestId("open-canvas-button");
      fireEvent.click(openButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining("/canvas/test-album-123"),
        "_blank",
        "noopener,noreferrer",
      );
    });

    it("opens with current settings applied to URL", () => {
      render(<QRCodePanel {...defaultProps} />);

      // Change settings
      const rotationTrigger = screen.getByTestId("rotation-select");
      fireEvent.click(rotationTrigger);
      const option180 = screen.getByText("180");
      fireEvent.click(option180);

      const openButton = screen.getByTestId("open-canvas-button");
      fireEvent.click(openButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining("rotation=180"),
        "_blank",
        "noopener,noreferrer",
      );
    });
  });

  describe("Settings state management", () => {
    it("maintains settings state across changes", () => {
      render(<QRCodePanel {...defaultProps} />);

      // Change rotation
      const rotationTrigger = screen.getByTestId("rotation-select");
      fireEvent.click(rotationTrigger);
      const option90 = screen.getByText("90 clockwise");
      fireEvent.click(option90);

      // Change order
      const orderTrigger = screen.getByTestId("order-select");
      fireEvent.click(orderTrigger);
      const randomOption = screen.getByText("Random");
      fireEvent.click(randomOption);

      // Change interval
      const intervalInput = screen.getByTestId("interval-input");
      fireEvent.change(intervalInput, { target: { value: "25" } });

      // Verify all settings are in URL
      const qrCode = screen.getByTestId("qr-code");
      const title = qrCode.querySelector("title");
      expect(title?.textContent).toContain("rotation=90");
      expect(title?.textContent).toContain("order=random");
      expect(title?.textContent).toContain("interval=25");
    });
  });
});
