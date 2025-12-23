import type { BoxTier } from "@prisma/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateBoxForm } from "./create-box-form";

// Mock next-view-transitions
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next-view-transitions", () => ({
  useTransitionRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe("CreateBoxForm", () => {
  const mockTiers: BoxTier[] = [
    {
      id: "tier-1",
      name: "Basic",
      description: "Basic tier for simple tasks",
      cpu: 1,
      ram: 1024,
      storage: 10,
      pricePerHour: 5,
      pricePerMonth: 100,
      sortOrder: 0,
      isActive: true,
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    },
    {
      id: "tier-2",
      name: "Standard",
      description: "Standard tier for moderate tasks",
      cpu: 2,
      ram: 2048,
      storage: 20,
      pricePerHour: 10,
      pricePerMonth: 200,
      sortOrder: 1,
      isActive: true,
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    },
    {
      id: "tier-3",
      name: "Premium",
      description: "Premium tier for demanding tasks",
      cpu: 4,
      ram: 4096,
      storage: 50,
      pricePerHour: 20,
      pricePerMonth: 400,
      sortOrder: 2,
      isActive: true,
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  });

  describe("Rendering", () => {
    it("renders the form with all elements", () => {
      render(<CreateBoxForm tiers={mockTiers} />);

      expect(screen.getByText("1. Select a Tier")).toBeInTheDocument();
      expect(screen.getByText("2. Name your Box")).toBeInTheDocument();
      expect(screen.getByLabelText("Box Name")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create box/i }))
        .toBeInTheDocument();
    });

    it("renders all tier cards", () => {
      render(<CreateBoxForm tiers={mockTiers} />);

      expect(screen.getByText("Basic")).toBeInTheDocument();
      expect(screen.getByText("Standard")).toBeInTheDocument();
      expect(screen.getByText("Premium")).toBeInTheDocument();
    });

    it("displays tier descriptions", () => {
      render(<CreateBoxForm tiers={mockTiers} />);

      expect(screen.getByText("Basic tier for simple tasks"))
        .toBeInTheDocument();
      expect(screen.getByText("Standard tier for moderate tasks"))
        .toBeInTheDocument();
      expect(screen.getByText("Premium tier for demanding tasks"))
        .toBeInTheDocument();
    });

    it("displays tier specifications correctly", () => {
      render(<CreateBoxForm tiers={mockTiers} />);

      expect(screen.getByText("1 vCPU • 1GB RAM")).toBeInTheDocument();
      expect(screen.getByText("10GB Storage")).toBeInTheDocument();
      expect(screen.getByText("2 vCPU • 2GB RAM")).toBeInTheDocument();
      expect(screen.getByText("20GB Storage")).toBeInTheDocument();
      expect(screen.getByText("4 vCPU • 4GB RAM")).toBeInTheDocument();
      expect(screen.getByText("50GB Storage")).toBeInTheDocument();
    });

    it("displays tier prices", () => {
      render(<CreateBoxForm tiers={mockTiers} />);

      const priceElements = screen.getAllByText("tokens/hr");
      expect(priceElements).toHaveLength(3);
    });

    it("selects first tier by default", () => {
      render(<CreateBoxForm tiers={mockTiers} />);

      // The first tier should be selected and have the check icon
      const basicTierCard = screen.getByText("Basic").closest(
        "div[class*='cursor-pointer']",
      );
      expect(basicTierCard).toHaveClass("border-primary");
    });

    it("handles empty tiers array", () => {
      render(<CreateBoxForm tiers={[]} />);

      expect(screen.getByText("1. Select a Tier")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create box/i }))
        .toBeDisabled();
    });
  });

  describe("Tier Selection", () => {
    it("allows selecting a different tier", async () => {
      const user = userEvent.setup();
      render(<CreateBoxForm tiers={mockTiers} />);

      const standardTierCard = screen.getByText("Standard").closest(
        "div[class*='cursor-pointer']",
      );
      await user.click(standardTierCard!);

      // Check mark should move to Standard tier
      expect(standardTierCard).toHaveClass("border-primary");
    });

    it("shows check icon on selected tier", () => {
      render(<CreateBoxForm tiers={mockTiers} />);

      // First tier should be selected by default
      const checkIcons = document.querySelectorAll(".lucide-check");
      expect(checkIcons.length).toBe(1);
    });

    it("updates selection when clicking different tiers", async () => {
      const user = userEvent.setup();
      render(<CreateBoxForm tiers={mockTiers} />);

      // Click on Premium tier
      const premiumTierCard = screen.getByText("Premium").closest(
        "div[class*='cursor-pointer']",
      );
      await user.click(premiumTierCard!);

      // Check that Premium tier has the selection styling
      expect(premiumTierCard).toHaveClass("border-primary");
    });
  });

  describe("Name Input", () => {
    it("allows entering a box name", async () => {
      const user = userEvent.setup();
      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      await user.type(nameInput, "My Test Box");

      expect(nameInput).toHaveValue("My Test Box");
    });

    it("has correct placeholder text", () => {
      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      expect(nameInput).toHaveAttribute(
        "placeholder",
        "e.g. Chrome Research Agent",
      );
    });

    it("has required attribute", () => {
      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      expect(nameInput).toHaveAttribute("required");
    });

    it("has minLength attribute", () => {
      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      expect(nameInput).toHaveAttribute("minLength", "3");
    });

    it("has maxLength attribute", () => {
      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      expect(nameInput).toHaveAttribute("maxLength", "50");
    });
  });

  describe("Submit Button State", () => {
    it("is disabled when name is empty", () => {
      render(<CreateBoxForm tiers={mockTiers} />);

      const submitButton = screen.getByRole("button", { name: /create box/i });
      expect(submitButton).toBeDisabled();
    });

    it("is disabled when no tier is selected (empty tiers)", () => {
      render(<CreateBoxForm tiers={[]} />);

      const submitButton = screen.getByRole("button", { name: /create box/i });
      expect(submitButton).toBeDisabled();
    });

    it("is enabled when name is provided and tier is selected", async () => {
      const user = userEvent.setup();
      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      await user.type(nameInput, "Test Box");

      const submitButton = screen.getByRole("button", { name: /create box/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("Form Submission - Success", () => {
    it("submits the form successfully", async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "new-box-id", name: "Test Box" }),
      });

      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      await user.type(nameInput, "Test Box");

      const submitButton = screen.getByRole("button", { name: /create box/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/boxes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Test Box", tierId: "tier-1" }),
        });
      });
    });

    it("shows success toast on successful submission", async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "new-box-id", name: "Test Box" }),
      });

      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      await user.type(nameInput, "Test Box");

      const submitButton = screen.getByRole("button", { name: /create box/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Box created successfully!");
      });
    });

    it("navigates to /boxes on successful submission", async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "new-box-id", name: "Test Box" }),
      });

      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      await user.type(nameInput, "Test Box");

      const submitButton = screen.getByRole("button", { name: /create box/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/boxes");
      });
    });

    it("calls router.refresh after navigation", async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "new-box-id", name: "Test Box" }),
      });

      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      await user.type(nameInput, "Test Box");

      const submitButton = screen.getByRole("button", { name: /create box/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("submits with selected tier", async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "new-box-id", name: "Test Box" }),
      });

      render(<CreateBoxForm tiers={mockTiers} />);

      // Select Standard tier
      const standardTierCard = screen.getByText("Standard").closest(
        "div[class*='cursor-pointer']",
      );
      await user.click(standardTierCard!);

      const nameInput = screen.getByLabelText("Box Name");
      await user.type(nameInput, "Test Box");

      const submitButton = screen.getByRole("button", { name: /create box/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/boxes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Test Box", tierId: "tier-2" }),
        });
      });
    });
  });

  describe("Form Submission - Error Handling", () => {
    it("shows error toast when API returns non-ok response", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        text: async () => "Insufficient tokens",
      });

      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      await user.type(nameInput, "Test Box");

      const submitButton = screen.getByRole("button", { name: /create box/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to create box. Please try again.",
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it("logs error to console when API fails", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        text: async () => "Server error",
      });

      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      await user.type(nameInput, "Test Box");

      const submitButton = screen.getByRole("button", { name: /create box/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it("shows error toast when fetch throws an error", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Network error"),
      );

      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      await user.type(nameInput, "Test Box");

      const submitButton = screen.getByRole("button", { name: /create box/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to create box. Please try again.",
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it("does not navigate when API fails", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        text: async () => "Error",
      });

      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      await user.type(nameInput, "Test Box");

      const submitButton = screen.getByRole("button", { name: /create box/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(mockPush).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Loading State", () => {
    it("shows loading spinner during submission", async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(promise);

      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      await user.type(nameInput, "Test Box");

      const submitButton = screen.getByRole("button", { name: /create box/i });
      await user.click(submitButton);

      // Check for loading spinner
      await waitFor(() => {
        const spinner = document.querySelector(".animate-spin");
        expect(spinner).toBeInTheDocument();
      });

      // Resolve the promise to cleanup and wait for state to settle
      resolvePromise!({ ok: true, json: async () => ({}) });
      await waitFor(() => {
        expect(document.querySelector(".animate-spin")).not.toBeInTheDocument();
      });
    });

    it("disables submit button during submission", async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(promise);

      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      await user.type(nameInput, "Test Box");

      const submitButton = screen.getByRole("button", { name: /create box/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // Resolve the promise to cleanup and wait for state to settle
      resolvePromise!({ ok: true, json: async () => ({}) });
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
    });

    it("re-enables submit button after submission completes", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        text: async () => "Error",
      });

      render(<CreateBoxForm tiers={mockTiers} />);

      const nameInput = screen.getByLabelText("Box Name");
      await user.type(nameInput, "Test Box");

      const submitButton = screen.getByRole("button", { name: /create box/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Form Validation", () => {
    it("does not submit when name is empty", async () => {
      render(<CreateBoxForm tiers={mockTiers} />);

      // Try to submit with empty name via form submission
      const form = screen.getByRole("button", { name: /create box/i }).closest(
        "form",
      );
      fireEvent.submit(form!);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("does not submit when tierId is empty", async () => {
      const user = userEvent.setup();
      render(<CreateBoxForm tiers={[]} />);

      const nameInput = screen.getByLabelText("Box Name");
      await user.type(nameInput, "Test Box");

      const form = screen.getByRole("button", { name: /create box/i }).closest(
        "form",
      );
      fireEvent.submit(form!);

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("handles single tier correctly", () => {
      render(<CreateBoxForm tiers={[mockTiers[0]!]} />);

      expect(screen.getByText("Basic")).toBeInTheDocument();
      expect(screen.queryByText("Standard")).not.toBeInTheDocument();
    });

    it("handles tier with 0 CPU correctly", () => {
      const tierWithZeroCpu: BoxTier = {
        ...mockTiers[0]!,
        cpu: 0,
      };
      render(<CreateBoxForm tiers={[tierWithZeroCpu]} />);

      expect(screen.getByText("0 vCPU • 1GB RAM")).toBeInTheDocument();
    });

    it("handles tier with large RAM correctly", () => {
      const tierWithLargeRam: BoxTier = {
        ...mockTiers[0]!,
        ram: 16384, // 16GB
      };
      render(<CreateBoxForm tiers={[tierWithLargeRam]} />);

      expect(screen.getByText("1 vCPU • 16GB RAM")).toBeInTheDocument();
    });
  });
});
