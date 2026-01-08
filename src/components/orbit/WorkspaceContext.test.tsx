import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspace, WorkspaceProvider } from "./WorkspaceContext";

// Mock next/navigation
const mockPush = vi.fn();
const mockParams: { workspaceSlug?: string; } = {};
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => mockParams,
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

// Test component that uses the hook
function TestConsumer({
  onMount,
}: {
  onMount?: (ctx: ReturnType<typeof useWorkspace>) => void;
}) {
  const ctx = useWorkspace();

  if (onMount) {
    onMount(ctx);
  }

  return (
    <div data-testid="test-consumer">
      <span data-testid="workspace-name">{ctx.workspace?.name ?? "none"}</span>
      <span data-testid="workspace-count">{ctx.workspaces.length}</span>
      <span data-testid="is-loading">{String(ctx.isLoading)}</span>
      <span data-testid="has-error">{String(ctx.error !== null)}</span>
      <button
        data-testid="switch-workspace"
        onClick={() => ctx.switchWorkspace("other-workspace")}
      >
        Switch
      </button>
      <button data-testid="refetch" onClick={() => ctx.refetch()}>
        Refetch
      </button>
    </div>
  );
}

// Wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode; }) {
    return (
      <QueryClientProvider client={queryClient}>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </QueryClientProvider>
    );
  };
}

describe("WorkspaceContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockParams.workspaceSlug = undefined;
  });

  describe("WorkspaceProvider", () => {
    it("renders children correctly", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ workspaces: [] }),
      });

      render(
        <div data-testid="child">Child Content</div>,
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(screen.getByTestId("child")).toBeInTheDocument();
      });
    });

    it("fetches workspaces on mount", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ workspaces: [] }),
      });

      render(<TestConsumer />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/workspaces");
      });
    });

    it("provides workspaces data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          workspaces: [
            {
              id: "1",
              name: "Workspace 1",
              slug: "ws-1",
              isPersonal: true,
              role: "OWNER",
            },
            {
              id: "2",
              name: "Workspace 2",
              slug: "ws-2",
              isPersonal: false,
              role: "MEMBER",
            },
          ],
        }),
      });

      render(<TestConsumer />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("workspace-count")).toHaveTextContent("2");
      });
    });

    it("auto-selects first workspace when none selected", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          workspaces: [
            {
              id: "1",
              name: "First Workspace",
              slug: "first-ws",
              isPersonal: true,
              role: "OWNER",
            },
          ],
        }),
      });

      render(<TestConsumer />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("workspace-name")).toHaveTextContent(
          "First Workspace",
        );
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "orbit-last-workspace-slug",
        "first-ws",
      );
    });

    it("loads workspace from URL params", async () => {
      mockParams.workspaceSlug = "url-workspace";

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          workspaces: [
            {
              id: "1",
              name: "URL Workspace",
              slug: "url-workspace",
              isPersonal: false,
              role: "MEMBER",
            },
          ],
        }),
      });

      render(<TestConsumer />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("workspace-name")).toHaveTextContent(
          "URL Workspace",
        );
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "orbit-last-workspace-slug",
        "url-workspace",
      );
    });

    it("loads workspace from localStorage when no URL param", async () => {
      localStorageMock.getItem.mockReturnValue("stored-workspace");

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          workspaces: [
            {
              id: "1",
              name: "Stored Workspace",
              slug: "stored-workspace",
              isPersonal: false,
              role: "OWNER",
            },
          ],
        }),
      });

      render(<TestConsumer />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("workspace-name")).toHaveTextContent(
          "Stored Workspace",
        );
      });
    });

    it("handles fetch error", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<TestConsumer />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("has-error")).toHaveTextContent("true");
      });

      consoleError.mockRestore();
    });

    it("shows loading state initially", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ workspaces: [] }),
                }),
              100,
            )
          ),
      );

      render(<TestConsumer />, { wrapper: createWrapper() });

      expect(screen.getByTestId("is-loading")).toHaveTextContent("true");

      await waitFor(() => {
        expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
      });
    });
  });

  describe("switchWorkspace", () => {
    it("updates current workspace and navigates", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          workspaces: [
            {
              id: "1",
              name: "Workspace 1",
              slug: "ws-1",
              isPersonal: true,
              role: "OWNER",
            },
            {
              id: "2",
              name: "Other Workspace",
              slug: "other-workspace",
              isPersonal: false,
              role: "MEMBER",
            },
          ],
        }),
      });

      render(<TestConsumer />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("workspace-count")).toHaveTextContent("2");
      });

      const switchButton = screen.getByTestId("switch-workspace");
      await act(async () => {
        switchButton.click();
      });

      expect(mockPush).toHaveBeenCalledWith("/orbit/other-workspace/dashboard");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "orbit-last-workspace-slug",
        "other-workspace",
      );
    });
  });

  describe("refetch", () => {
    it("refetches workspaces when called", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          workspaces: [
            {
              id: "1",
              name: "Workspace 1",
              slug: "ws-1",
              isPersonal: true,
              role: "OWNER",
            },
          ],
        }),
      });

      render(<TestConsumer />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("workspace-count")).toHaveTextContent("1");
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const refetchButton = screen.getByTestId("refetch");
      await act(async () => {
        refetchButton.click();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("useWorkspace", () => {
    it("throws error when used outside provider", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      expect(() => {
        render(<TestConsumer />);
      }).toThrow("useWorkspace must be used within WorkspaceProvider");

      consoleError.mockRestore();
    });
  });

  describe("cross-tab sync", () => {
    it("registers storage event listener on mount", async () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ workspaces: [] }),
      });

      render(<TestConsumer />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(addEventListenerSpy).toHaveBeenCalledWith(
          "storage",
          expect.any(Function),
        );
      });

      addEventListenerSpy.mockRestore();
    });

    it("removes storage event listener on unmount", async () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ workspaces: [] }),
      });

      const { unmount } = render(<TestConsumer />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByTestId("test-consumer")).toBeInTheDocument();
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "storage",
        expect.any(Function),
      );

      removeEventListenerSpy.mockRestore();
    });
  });
});
