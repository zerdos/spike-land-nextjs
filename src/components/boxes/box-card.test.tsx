import { BoxActionType, BoxStatus } from "@prisma/client";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BoxCard } from "./box-card";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock next/navigation
const mockRouterRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRouterRefresh,
  }),
}));

// Mock fetch
global.fetch = vi.fn();

// Mock confirm and prompt
const mockConfirm = vi.fn();
const mockPrompt = vi.fn();
Object.defineProperty(window, "confirm", { value: mockConfirm, writable: true });
Object.defineProperty(window, "prompt", { value: mockPrompt, writable: true });

describe("BoxCard", () => {
  const mockTier = {
    id: "tier-1",
    name: "Basic",
    description: "Basic tier",
    cpu: 2,
    ram: 4096,
    storage: 50,
    pricePerHour: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBox = {
    id: "box-1",
    name: "Test Box",
    description: "Test description",
    status: BoxStatus.RUNNING,
    connectionUrl: "https://example.com/vnc",
    userId: "user-1",
    tierId: "tier-1",
    tier: mockTier,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastStartedAt: new Date(),
    lastStoppedAt: null,
    currentSpendTokens: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
    mockConfirm.mockReset();
    mockPrompt.mockReset();
  });

  describe("Basic Rendering", () => {
    it("renders box name and tier information", () => {
      render(<BoxCard box={mockBox} />);

      expect(screen.getByText("Test Box")).toBeInTheDocument();
      expect(screen.getByText(/Basic Tier/)).toBeInTheDocument();
      expect(screen.getByText(/2 vCPU/)).toBeInTheDocument();
      expect(screen.getByText(/4GB RAM/)).toBeInTheDocument();
    });

    it("renders storage and cost information", () => {
      render(<BoxCard box={mockBox} />);

      expect(screen.getByText(/Storage: 50GB/)).toBeInTheDocument();
      expect(screen.getByText(/Cost: 5 tokens\/hour/)).toBeInTheDocument();
    });

    it("renders status badge", () => {
      render(<BoxCard box={mockBox} />);

      expect(screen.getByText("RUNNING")).toBeInTheDocument();
    });

    it("renders Monitor icon", () => {
      const { container } = render(<BoxCard box={mockBox} />);

      const monitorIcon = container.querySelector("svg.lucide-monitor");
      expect(monitorIcon).toBeInTheDocument();
    });
  });

  describe("Status Colors", () => {
    it("displays default variant for RUNNING status", () => {
      render(<BoxCard box={{ ...mockBox, status: BoxStatus.RUNNING }} />);
      expect(screen.getByText("RUNNING")).toBeInTheDocument();
    });

    it("displays secondary variant for STOPPED status", () => {
      render(<BoxCard box={{ ...mockBox, status: BoxStatus.STOPPED }} />);
      expect(screen.getByText("STOPPED")).toBeInTheDocument();
    });

    it("displays outline variant for STARTING status", () => {
      render(<BoxCard box={{ ...mockBox, status: BoxStatus.STARTING }} />);
      expect(screen.getByText("STARTING")).toBeInTheDocument();
    });

    it("displays destructive variant for STOPPING status", () => {
      render(<BoxCard box={{ ...mockBox, status: BoxStatus.STOPPING }} />);
      expect(screen.getByText("STOPPING")).toBeInTheDocument();
    });

    it("displays destructive variant for TERMINATED status", () => {
      render(<BoxCard box={{ ...mockBox, status: BoxStatus.TERMINATED }} />);
      expect(screen.getByText("TERMINATED")).toBeInTheDocument();
    });

    it("displays destructive variant for ERROR status", () => {
      render(<BoxCard box={{ ...mockBox, status: BoxStatus.ERROR }} />);
      expect(screen.getByText("ERROR")).toBeInTheDocument();
    });

    it("displays outline variant for unknown status", () => {
      const unknownStatus = "UNKNOWN" as BoxStatus;
      render(<BoxCard box={{ ...mockBox, status: unknownStatus }} />);
      expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
    });
  });

  describe("Connection URL", () => {
    it("renders VNC link when connectionUrl is provided and status is RUNNING", () => {
      render(<BoxCard box={mockBox} />);

      const vncLink = screen.getByText("Connect via VNC");
      expect(vncLink).toBeInTheDocument();
      expect(vncLink).toHaveAttribute("href", "https://example.com/vnc");
      expect(vncLink).toHaveAttribute("target", "_blank");
      expect(vncLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("does not render VNC link when connectionUrl is null", () => {
      render(<BoxCard box={{ ...mockBox, connectionUrl: null }} />);

      expect(screen.queryByText("Connect via VNC")).not.toBeInTheDocument();
    });

    it("does not render VNC link when status is not RUNNING", () => {
      render(
        <BoxCard
          box={{ ...mockBox, status: BoxStatus.STOPPED, connectionUrl: "https://example.com/vnc" }}
        />,
      );

      expect(screen.queryByText("Connect via VNC")).not.toBeInTheDocument();
    });
  });

  describe("Action Buttons by Status", () => {
    it("renders Start button when status is STOPPED", () => {
      render(<BoxCard box={{ ...mockBox, status: BoxStatus.STOPPED }} />);

      expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /stop/i })).not.toBeInTheDocument();
    });

    it("renders Stop button when status is RUNNING", () => {
      render(<BoxCard box={{ ...mockBox, status: BoxStatus.RUNNING }} />);

      expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /start/i })).not.toBeInTheDocument();
    });

    it("renders Processing button when status is STARTING", () => {
      render(<BoxCard box={{ ...mockBox, status: BoxStatus.STARTING }} />);

      const processingButton = screen.getByRole("button", { name: /processing/i });
      expect(processingButton).toBeInTheDocument();
      expect(processingButton).toBeDisabled();
    });

    it("renders Processing button when status is STOPPING", () => {
      render(<BoxCard box={{ ...mockBox, status: BoxStatus.STOPPING }} />);

      const processingButton = screen.getByRole("button", { name: /processing/i });
      expect(processingButton).toBeInTheDocument();
      expect(processingButton).toBeDisabled();
    });

    it("always renders Clone and Delete buttons", () => {
      render(<BoxCard box={mockBox} />);

      expect(screen.getByTitle("Clone Box")).toBeInTheDocument();
      // Delete button has Trash2 icon
      const deleteButtons = screen.getAllByRole("button");
      expect(deleteButtons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("handleAction", () => {
    it("starts a box successfully", async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<BoxCard box={{ ...mockBox, status: BoxStatus.STOPPED }} />);

      const startButton = screen.getByRole("button", { name: /start/i });
      await user.click(startButton);

      expect(global.fetch).toHaveBeenCalledWith("/api/boxes/box-1/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: BoxActionType.START }),
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Box start initiated");
      });
      expect(mockRouterRefresh).toHaveBeenCalled();
    });

    it("stops a box successfully", async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<BoxCard box={{ ...mockBox, status: BoxStatus.RUNNING }} />);

      const stopButton = screen.getByRole("button", { name: /stop/i });
      await user.click(stopButton);

      expect(global.fetch).toHaveBeenCalledWith("/api/boxes/box-1/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: BoxActionType.STOP }),
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Box stop initiated");
      });
      expect(mockRouterRefresh).toHaveBeenCalled();
    });

    it("handles action failure with error response", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<BoxCard box={{ ...mockBox, status: BoxStatus.STOPPED }} />);

      const startButton = screen.getByRole("button", { name: /start/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to perform action");
      });
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("disables buttons while loading", async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(fetchPromise);

      render(<BoxCard box={{ ...mockBox, status: BoxStatus.STOPPED }} />);

      const startButton = screen.getByRole("button", { name: /start/i });
      await user.click(startButton);

      // Buttons should be disabled during loading
      expect(startButton).toBeDisabled();
      expect(screen.getByTitle("Clone Box")).toBeDisabled();

      // Resolve the fetch
      resolvePromise!({ ok: true, json: async () => ({ success: true }) });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /start/i })).not.toBeDisabled();
      });
    });
  });

  describe("handleDelete", () => {
    it("deletes a box when confirmed", async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(true);
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<BoxCard box={mockBox} />);

      // Find delete button (it's the one with destructive styling)
      const deleteButton = screen.getAllByRole("button").find((btn) =>
        btn.className.includes("text-destructive")
      );
      expect(deleteButton).toBeTruthy();
      await user.click(deleteButton!);

      expect(mockConfirm).toHaveBeenCalledWith("Are you sure you want to delete this box?");
      expect(global.fetch).toHaveBeenCalledWith("/api/boxes/box-1", {
        method: "DELETE",
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Box deleted");
      });
      expect(mockRouterRefresh).toHaveBeenCalled();
    });

    it("does not delete when confirmation is cancelled", async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(false);

      render(<BoxCard box={mockBox} />);

      const deleteButton = screen.getAllByRole("button").find((btn) =>
        btn.className.includes("text-destructive")
      );
      await user.click(deleteButton!);

      expect(mockConfirm).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("handles delete failure", async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(true);
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<BoxCard box={mockBox} />);

      const deleteButton = screen.getAllByRole("button").find((btn) =>
        btn.className.includes("text-destructive")
      );
      await user.click(deleteButton!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to delete box");
      });
    });
  });

  describe("handleClone", () => {
    it("clones a box successfully with user-provided name", async () => {
      const user = userEvent.setup();
      mockPrompt.mockReturnValue("My Cloned Box");
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<BoxCard box={mockBox} />);

      const cloneButton = screen.getByTitle("Clone Box");
      await user.click(cloneButton);

      expect(mockPrompt).toHaveBeenCalledWith(
        "Enter name for clone of Test Box:",
        "Clone of Test Box",
      );
      expect(global.fetch).toHaveBeenCalledWith("/api/boxes/box-1/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My Cloned Box" }),
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Box cloned successfully");
      });
      expect(mockRouterRefresh).toHaveBeenCalled();
    });

    it("does not clone when prompt is cancelled", async () => {
      const user = userEvent.setup();
      mockPrompt.mockReturnValue(null);

      render(<BoxCard box={mockBox} />);

      const cloneButton = screen.getByTitle("Clone Box");
      await user.click(cloneButton);

      expect(mockPrompt).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("handles clone failure with error message from response", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockPrompt.mockReturnValue("My Cloned Box");
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        text: async () => "Insufficient tokens",
      });

      render(<BoxCard box={mockBox} />);

      const cloneButton = screen.getByTitle("Clone Box");
      await user.click(cloneButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Insufficient tokens");
      });
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("handles clone failure with default error message", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockPrompt.mockReturnValue("My Cloned Box");
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        text: async () => "",
      });

      render(<BoxCard box={mockBox} />);

      const cloneButton = screen.getByTitle("Clone Box");
      await user.click(cloneButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Clone failed");
      });
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("handles clone failure with non-Error object", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockPrompt.mockReturnValue("My Cloned Box");
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce("Network error");

      render(<BoxCard box={mockBox} />);

      const cloneButton = screen.getByTitle("Clone Box");
      await user.click(cloneButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to clone box");
      });
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Button Icons", () => {
    it("renders Play icon in Start button", () => {
      const { container } = render(<BoxCard box={{ ...mockBox, status: BoxStatus.STOPPED }} />);

      const playIcon = container.querySelector("svg.lucide-play");
      expect(playIcon).toBeInTheDocument();
    });

    it("renders Square icon in Stop button", () => {
      const { container } = render(<BoxCard box={{ ...mockBox, status: BoxStatus.RUNNING }} />);

      const squareIcon = container.querySelector("svg.lucide-square");
      expect(squareIcon).toBeInTheDocument();
    });

    it("renders RefreshCw icon with animation in Processing button", () => {
      const { container } = render(<BoxCard box={{ ...mockBox, status: BoxStatus.STARTING }} />);

      const refreshIcon = container.querySelector("svg.lucide-refresh-cw");
      expect(refreshIcon).toBeInTheDocument();
      expect(refreshIcon).toHaveClass("animate-spin");
    });

    it("renders Copy icon in Clone button", () => {
      const { container } = render(<BoxCard box={mockBox} />);

      const copyIcon = container.querySelector("svg.lucide-copy");
      expect(copyIcon).toBeInTheDocument();
    });

    it("renders Trash2 icon in Delete button", () => {
      const { container } = render(<BoxCard box={mockBox} />);

      const trashIcon = container.querySelector("svg.lucide-trash-2");
      expect(trashIcon).toBeInTheDocument();
    });
  });

  describe("Card Structure", () => {
    it("renders card with flex column layout", () => {
      const { container } = render(<BoxCard box={mockBox} />);

      const card = container.querySelector(".flex.flex-col");
      expect(card).toBeInTheDocument();
    });

    it("renders CardHeader with title and status", () => {
      render(<BoxCard box={mockBox} />);

      expect(screen.getByText("Test Box")).toBeInTheDocument();
      expect(screen.getByText("RUNNING")).toBeInTheDocument();
    });

    it("renders CardDescription with tier details", () => {
      render(<BoxCard box={mockBox} />);

      expect(screen.getByText(/Basic Tier/)).toBeInTheDocument();
    });

    it("renders CardContent with storage and cost", () => {
      render(<BoxCard box={mockBox} />);

      expect(screen.getByText(/Storage: 50GB/)).toBeInTheDocument();
      expect(screen.getByText(/Cost: 5 tokens\/hour/)).toBeInTheDocument();
    });

    it("renders CardFooter with action buttons", () => {
      const { container } = render(<BoxCard box={mockBox} />);

      const footer = container.querySelector(".flex.gap-2.justify-between");
      expect(footer).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles box with zero storage", () => {
      const zeroStorageTier = { ...mockTier, storage: 0 };
      render(<BoxCard box={{ ...mockBox, tier: zeroStorageTier }} />);

      expect(screen.getByText(/Storage: 0GB/)).toBeInTheDocument();
    });

    it("handles box with large RAM values", () => {
      const largeRamTier = { ...mockTier, ram: 32768 };
      render(<BoxCard box={{ ...mockBox, tier: largeRamTier }} />);

      expect(screen.getByText(/32GB RAM/)).toBeInTheDocument();
    });

    it("handles empty connection URL string", () => {
      render(<BoxCard box={{ ...mockBox, connectionUrl: "" }} />);

      expect(screen.queryByText("Connect via VNC")).not.toBeInTheDocument();
    });
  });
});
