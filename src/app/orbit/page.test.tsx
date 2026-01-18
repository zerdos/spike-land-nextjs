import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrbitPage from "./page";

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
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

describe("OrbitPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it("renders loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<OrbitPage />);

    expect(screen.getByRole("heading", { name: "Orbit" })).toBeInTheDocument();
    expect(screen.getByText("Loading your workspace...")).toBeInTheDocument();
  });

  it("redirects to stored workspace if it exists in fetched list", async () => {
    localStorageMock.getItem.mockReturnValue("my-workspace");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        workspaces: [
          { id: "1", slug: "my-workspace", name: "My Workspace" },
          { id: "2", slug: "other-workspace", name: "Other Workspace" },
        ],
      }),
    });

    render(<OrbitPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/orbit/my-workspace/dashboard");
    });
  });

  it("fetches workspaces and redirects to first one when no localStorage", async () => {
    localStorageMock.getItem.mockReturnValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        workspaces: [
          { id: "1", slug: "first-workspace", name: "First Workspace" },
          { id: "2", slug: "second-workspace", name: "Second Workspace" },
        ],
      }),
    });

    render(<OrbitPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/workspaces");
      expect(mockReplace).toHaveBeenCalledWith(
        "/orbit/first-workspace/dashboard",
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "orbit-last-workspace-slug",
        "first-workspace",
      );
    });
  });

  it("redirects to first workspace when stored workspace not in list", async () => {
    localStorageMock.getItem.mockReturnValue("deleted-workspace");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        workspaces: [
          { id: "1", slug: "new-workspace", name: "New Workspace" },
        ],
      }),
    });

    render(<OrbitPage />);

    await waitFor(() => {
      // Should redirect to the first available workspace, not the stale one
      expect(mockReplace).toHaveBeenCalledWith("/orbit/new-workspace/dashboard");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "orbit-last-workspace-slug",
        "new-workspace",
      );
    });
  });

  it("shows welcome state when no workspaces exist", async () => {
    localStorageMock.getItem.mockReturnValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ workspaces: [] }),
    });

    render(<OrbitPage />);

    await waitFor(() => {
      expect(screen.getByText("Welcome to Orbit")).toBeInTheDocument();
      expect(
        screen.getByText("Get started by creating your first workspace"),
      ).toBeInTheDocument();
      expect(screen.getByText("Create Workspace (Coming Soon)")).toBeInTheDocument();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("shows error state when fetch fails", async () => {
    localStorageMock.getItem.mockReturnValue(null);
    mockFetch.mockRejectedValue(new Error("Network error"));

    render(<OrbitPage />);

    await waitFor(() => {
      expect(screen.getByText("Error Loading Orbit")).toBeInTheDocument();
      expect(screen.getByText("Network error")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("shows error when API returns not ok", async () => {
    localStorageMock.getItem.mockReturnValue(null);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<OrbitPage />);

    await waitFor(() => {
      expect(screen.getByText("Error Loading Orbit")).toBeInTheDocument();
      expect(screen.getByText("Failed to fetch workspaces")).toBeInTheDocument();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders branding in all states", async () => {
    localStorageMock.getItem.mockReturnValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ workspaces: [] }),
    });

    render(<OrbitPage />);

    // Initially shows loading
    expect(screen.getByRole("heading", { name: "Orbit" })).toBeInTheDocument();

    // After fetch completes, still shows branding
    await waitFor(() => {
      expect(screen.getByText("Your Social Command Center")).toBeInTheDocument();
    });
  });
});
