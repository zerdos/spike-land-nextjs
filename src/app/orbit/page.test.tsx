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

  it("redirects to last workspace from localStorage", async () => {
    localStorageMock.getItem.mockReturnValue("my-workspace");

    render(<OrbitPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/orbit/my-workspace/dashboard");
    });
  });

  it("fetches workspaces and redirects to first one", async () => {
    localStorageMock.getItem.mockReturnValue(null);
    mockFetch.mockResolvedValue({
      json: async () => ({
        workspaces: [
          { slug: "first-workspace", name: "First Workspace" },
          { slug: "second-workspace", name: "Second Workspace" },
        ],
      }),
    });

    render(<OrbitPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/workspaces");
      expect(mockReplace).toHaveBeenCalledWith("/orbit/first-workspace/dashboard");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "orbit-last-workspace-slug",
        "first-workspace",
      );
    });
  });

  it("shows empty state when no workspaces exist", async () => {
    localStorageMock.getItem.mockReturnValue(null);
    mockFetch.mockResolvedValue({
      json: async () => ({ workspaces: [] }),
    });

    render(<OrbitPage />);

    await waitFor(() => {
      expect(screen.getByText("No workspaces found. Create your first workspace to get started."))
        .toBeInTheDocument();
      expect(screen.getByText("Create Workspace (Coming Soon)")).toBeInTheDocument();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("shows empty state when fetch fails", async () => {
    localStorageMock.getItem.mockReturnValue(null);
    mockFetch.mockRejectedValue(new Error("Network error"));

    render(<OrbitPage />);

    await waitFor(() => {
      expect(screen.getByText("No workspaces found. Create your first workspace to get started."))
        .toBeInTheDocument();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders branding in all states", async () => {
    localStorageMock.getItem.mockReturnValue(null);
    mockFetch.mockResolvedValue({
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
