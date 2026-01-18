import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContentLibraryPage from "./page";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/orbit/test-workspace/content-library",
  useParams: () => ({ workspaceSlug: "test-workspace" }),
}));

describe("ContentLibraryPage", () => {
  it("renders the coming soon placeholder", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const page = await ContentLibraryPage({ params });
    render(page);

    expect(screen.getByRole("heading", { name: "Content Library" })).toBeInTheDocument();
    expect(screen.getByText("Manage and organize your media assets")).toBeInTheDocument();
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    expect(screen.getByText(/Store, organize, and reuse your media assets/)).toBeInTheDocument();
  });
});
