import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContentLibraryPage from "./page";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/orbit/test-workspace/content-library",
  useParams: () => ({ workspaceSlug: "test-workspace" }),
}));

// Mock fetch for workspace API
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ workspace: { id: "test-workspace-id" } }),
} as Response);

// Mock hooks
vi.mock("@/hooks/use-assets", () => ({
  useAssets: () => ({
    data: {
      assets: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false },
    },
    isLoading: false,
  }),
  useAssetFolders: () => ({ data: [] }),
  useUploadAsset: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("ContentLibraryPage", () => {
  it("renders the content library page", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ContentLibraryPage />
      </QueryClientProvider>,
    );

    // Wait for the workspace ID to be fetched
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Content Library", level: 1 }))
        .toBeInTheDocument();
    });

    expect(screen.getByText("Manage and organize your media assets")).toBeInTheDocument();
  });
});
