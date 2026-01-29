import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContentLibraryPage from "./page";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/orbit/test-workspace/content-library",
  useParams: () => ({ workspaceSlug: "test-workspace" }),
}));

// Mock hooks
vi.mock("@/hooks/use-assets", () => ({
  useAssets: () => ({ data: null, isLoading: true }),
  useAssetFolders: () => ({ data: [] }),
  useUploadAsset: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("ContentLibraryPage", () => {
  it("renders the content library page", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ContentLibraryPage />
      </QueryClientProvider>
    );

    expect(screen.getByRole("heading", { name: "Content Library", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Manage and organize your media assets")).toBeInTheDocument();
  });
});
