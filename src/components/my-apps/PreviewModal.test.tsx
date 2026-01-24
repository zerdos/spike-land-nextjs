import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewModal } from "./PreviewModal";

// Mock framer-motion to avoid animation-related issues in tests
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode; }) => children,
    motion: {
      div: ({
        children,
        onClick,
        className,
        role,
        tabIndex,
        onKeyDown,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & { tabIndex?: number; }) => (
        <div
          onClick={onClick}
          onKeyDown={onKeyDown}
          className={className}
          role={role}
          tabIndex={tabIndex}
          {...props}
        >
          {children}
        </div>
      ),
    },
  };
});

describe("PreviewModal", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    codespaceUrl: "https://testing.spike.land/live/test-app/",
    versionLabel: "Version 1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset body overflow style
    document.body.style.overflow = "";
  });

  describe("Rendering", () => {
    it("should render when open is true", () => {
      render(<PreviewModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should not render when open is false", () => {
      render(<PreviewModal {...defaultProps} open={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render version label", () => {
      render(<PreviewModal {...defaultProps} />);
      expect(screen.getByText("Version 1")).toBeInTheDocument();
    });

    it("should not render version label when undefined", () => {
      render(<PreviewModal {...defaultProps} versionLabel={undefined} />);
      expect(screen.queryByText("Version 1")).not.toBeInTheDocument();
    });

    it("should render URL in the address bar", () => {
      render(<PreviewModal {...defaultProps} />);
      expect(
        screen.getByText("https://testing.spike.land/live/test-app/"),
      ).toBeInTheDocument();
    });

    it("should render browser chrome with traffic lights", () => {
      render(<PreviewModal {...defaultProps} />);
      // Should have close, minimize, maximize buttons (traffic lights)
      const closeButton = screen.getAllByRole("button").find((btn) =>
        btn.classList.contains("bg-[#FF5F56]")
      );
      expect(closeButton).toBeInTheDocument();
    });

    it("should render action buttons (refresh, external link, close)", () => {
      render(<PreviewModal {...defaultProps} />);
      expect(screen.getByLabelText("Refresh preview")).toBeInTheDocument();
      expect(screen.getByLabelText("Open in new tab")).toBeInTheDocument();
      expect(screen.getByLabelText("Close modal")).toBeInTheDocument();
    });

    it("should render keyboard hint in footer", () => {
      render(<PreviewModal {...defaultProps} />);
      expect(screen.getByText("Esc")).toBeInTheDocument();
      expect(screen.getByText(/click backdrop to close/)).toBeInTheDocument();
    });

    it("should render iframe with correct src", () => {
      render(<PreviewModal {...defaultProps} />);
      const iframe = screen.getByTitle("App Preview - Full Size");
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute(
        "src",
        "https://testing.spike.land/live/test-app/",
      );
    });
  });

  describe("Accessibility", () => {
    it("should have correct ARIA attributes", () => {
      render(<PreviewModal {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-label", "App preview");
    });

    it("should have tabIndex for focus", () => {
      render(<PreviewModal {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("tabIndex", "-1");
    });
  });

  describe("Closing behavior", () => {
    it("should call onClose when Escape key is pressed", () => {
      const onClose = vi.fn();
      render(<PreviewModal {...defaultProps} onClose={onClose} />);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when close button (X) is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<PreviewModal {...defaultProps} onClose={onClose} />);
      await user.click(screen.getByLabelText("Close modal"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when traffic light close button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<PreviewModal {...defaultProps} onClose={onClose} />);
      const closeButton = screen.getByLabelText("Close");
      await user.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when clicking backdrop", async () => {
      const onClose = vi.fn();
      render(<PreviewModal {...defaultProps} onClose={onClose} />);
      const dialog = screen.getByRole("dialog");
      // Click on the dialog (backdrop) itself, not its children
      fireEvent.click(dialog);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should not call onClose when clicking modal content", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<PreviewModal {...defaultProps} onClose={onClose} />);
      // Click on the URL text (inside modal content)
      await user.click(
        screen.getByText("https://testing.spike.land/live/test-app/"),
      );
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("Body scroll lock", () => {
    it("should set body overflow to hidden when open", () => {
      render(<PreviewModal {...defaultProps} open={true} />);
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("should restore body overflow when closed", () => {
      const { rerender } = render(<PreviewModal {...defaultProps} open={true} />);
      expect(document.body.style.overflow).toBe("hidden");

      rerender(<PreviewModal {...defaultProps} open={false} />);
      // After closing, overflow should be restored
      expect(document.body.style.overflow).not.toBe("hidden");
    });

    it("should restore body overflow on unmount", () => {
      const { unmount } = render(<PreviewModal {...defaultProps} open={true} />);
      expect(document.body.style.overflow).toBe("hidden");

      unmount();
      expect(document.body.style.overflow).not.toBe("hidden");
    });
  });

  describe("Refresh functionality", () => {
    it("should show loading indicator when refresh is clicked", async () => {
      const user = userEvent.setup();
      render(<PreviewModal {...defaultProps} />);

      // Initially, there might be a loading state
      const refreshButton = screen.getByLabelText("Refresh preview");
      await user.click(refreshButton);

      // The refresh icon should have animate-spin class
      await waitFor(() => {
        const refreshIcon = refreshButton.querySelector("svg");
        expect(refreshIcon).toHaveClass("animate-spin");
      });
    });
  });

  describe("Open in new tab", () => {
    it("should open URL in new tab when external link is clicked", async () => {
      const user = userEvent.setup();
      const windowOpen = vi.spyOn(window, "open").mockImplementation(() => null);

      render(<PreviewModal {...defaultProps} />);
      await user.click(screen.getByLabelText("Open in new tab"));

      expect(windowOpen).toHaveBeenCalledWith(
        "https://testing.spike.land/live/test-app/",
        "_blank",
        "noopener,noreferrer",
      );

      windowOpen.mockRestore();
    });
  });

  describe("Loading state", () => {
    it("should show loading overlay initially", () => {
      render(<PreviewModal {...defaultProps} />);
      expect(screen.getByText("Loading preview...")).toBeInTheDocument();
    });

    it("should reset loading state when URL changes", async () => {
      const { rerender } = render(<PreviewModal {...defaultProps} />);

      // Simulate iframe load
      const iframe = screen.getByTitle("App Preview - Full Size");
      fireEvent.load(iframe);

      // Loading should be hidden
      await waitFor(() => {
        expect(screen.queryByText("Loading preview...")).not.toBeInTheDocument();
      });

      // Change URL - loading should reappear
      rerender(
        <PreviewModal
          {...defaultProps}
          codespaceUrl="https://testing.spike.land/live/other-app/"
        />,
      );

      expect(screen.getByText("Loading preview...")).toBeInTheDocument();
    });

    it("should hide loading overlay after iframe loads", async () => {
      render(<PreviewModal {...defaultProps} />);

      const iframe = screen.getByTitle("App Preview - Full Size");
      fireEvent.load(iframe);

      await waitFor(() => {
        expect(screen.queryByText("Loading preview...")).not.toBeInTheDocument();
      });
    });
  });
});
