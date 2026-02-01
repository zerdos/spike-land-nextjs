import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "./page";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe("Rendering", () => {
    it("renders welcome heading", () => {
      render(<OnboardingPage />);
      expect(screen.getByRole("heading", { name: "Welcome to Orbit" })).toBeInTheDocument();
    });

    it("renders workspace name input", () => {
      render(<OnboardingPage />);
      expect(screen.getByLabelText("Workspace Name")).toBeInTheDocument();
    });

    it("renders description textarea", () => {
      render(<OnboardingPage />);
      expect(screen.getByLabelText("Description (optional)")).toBeInTheDocument();
    });

    it("renders create workspace button", () => {
      render(<OnboardingPage />);
      expect(screen.getByRole("button", { name: "Create Workspace" })).toBeInTheDocument();
    });

    it("button is initially disabled when name is empty", () => {
      render(<OnboardingPage />);
      expect(screen.getByRole("button", { name: "Create Workspace" })).toBeDisabled();
    });
  });

  describe("Validation", () => {
    it("shows error when name is empty on submit attempt", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Type only spaces
      const nameInput = screen.getByLabelText("Workspace Name");
      await user.type(nameInput, "   ");

      // Button should still be disabled because trimmed name is empty
      expect(screen.getByRole("button", { name: "Create Workspace" })).toBeDisabled();
    });

    it("enables button when name has content", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      const nameInput = screen.getByLabelText("Workspace Name");
      await user.type(nameInput, "My Workspace");

      expect(screen.getByRole("button", { name: "Create Workspace" })).toBeEnabled();
    });

    it("disables inputs during submission", async () => {
      const user = userEvent.setup();
      // Never resolving promise to keep loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<OnboardingPage />);

      const nameInput = screen.getByLabelText("Workspace Name");
      await user.type(nameInput, "My Workspace");
      await user.click(screen.getByRole("button", { name: "Create Workspace" }));

      await waitFor(() => {
        expect(nameInput).toBeDisabled();
        expect(screen.getByLabelText("Description (optional)")).toBeDisabled();
      });
    });
  });

  describe("Submission", () => {
    it("posts to /api/workspaces with trimmed name and description", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          workspace: { slug: "my-workspace" },
        }),
      });

      render(<OnboardingPage />);

      await user.type(screen.getByLabelText("Workspace Name"), "  My Workspace  ");
      await user.type(screen.getByLabelText("Description (optional)"), "  A test workspace  ");
      await user.click(screen.getByRole("button", { name: "Create Workspace" }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "My Workspace",
            description: "A test workspace",
          }),
        });
      });
    });

    it("saves slug to localStorage on success", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          workspace: { slug: "my-workspace" },
        }),
      });

      render(<OnboardingPage />);

      await user.type(screen.getByLabelText("Workspace Name"), "My Workspace");
      await user.click(screen.getByRole("button", { name: "Create Workspace" }));

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "orbit-last-workspace-slug",
          "my-workspace",
        );
      });
    });

    it("redirects to dashboard on success", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          workspace: { slug: "my-workspace" },
        }),
      });

      render(<OnboardingPage />);

      await user.type(screen.getByLabelText("Workspace Name"), "My Workspace");
      await user.click(screen.getByRole("button", { name: "Create Workspace" }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/orbit/my-workspace/dashboard");
      });
    });

    it("shows error message from API on failure", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          error: "Workspace name already exists",
        }),
      });

      render(<OnboardingPage />);

      await user.type(screen.getByLabelText("Workspace Name"), "My Workspace");
      await user.click(screen.getByRole("button", { name: "Create Workspace" }));

      await waitFor(() => {
        expect(screen.getByText("Workspace name already exists")).toBeInTheDocument();
      });
    });

    it("shows generic error on network failure", async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(<OnboardingPage />);

      await user.type(screen.getByLabelText("Workspace Name"), "My Workspace");
      await user.click(screen.getByRole("button", { name: "Create Workspace" }));

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("shows Creating Workspace text during submission", async () => {
      const user = userEvent.setup();
      // Never resolving promise to keep loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<OnboardingPage />);

      await user.type(screen.getByLabelText("Workspace Name"), "My Workspace");
      await user.click(screen.getByRole("button", { name: "Create Workspace" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Creating Workspace..." })).toBeInTheDocument();
      });
    });

    it("omits description when empty", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          workspace: { slug: "my-workspace" },
        }),
      });

      render(<OnboardingPage />);

      await user.type(screen.getByLabelText("Workspace Name"), "My Workspace");
      await user.click(screen.getByRole("button", { name: "Create Workspace" }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "My Workspace",
            description: undefined,
          }),
        });
      });
    });
  });
});
