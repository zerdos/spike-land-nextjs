import { render, screen } from "@testing-library/react";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock next/navigation - redirect throws to simulate actual redirect behavior
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  usePathname: () => "/orbit/test-workspace/dashboard",
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ workspaceSlug: "test-workspace" }),
}));

// Mock QueryProvider
vi.mock("@/components/providers/QueryProvider", () => ({
  QueryProvider: ({ children }: { children: React.ReactNode; }) => (
    <div data-testid="query-provider">{children}</div>
  ),
}));

// Mock WorkspaceProvider
vi.mock("@/components/orbit/WorkspaceContext", () => ({
  WorkspaceProvider: ({ children }: { children: React.ReactNode; }) => (
    <div data-testid="workspace-provider">{children}</div>
  ),
  useWorkspace: () => ({
    workspace: {
      id: "1",
      name: "Test",
      slug: "test-workspace",
      isPersonal: true,
      role: "OWNER",
    },
    workspaces: [],
    isLoading: false,
    error: null,
    switchWorkspace: vi.fn(),
    refetch: vi.fn(),
  }),
}));

// Mock OrbitSidebar
vi.mock("./OrbitSidebar", () => ({
  OrbitSidebar: (
    { userEmail, userName, workspaceSlug }: {
      userEmail?: string | null;
      userName?: string | null;
      workspaceSlug: string;
    },
  ) => (
    <div data-testid="orbit-sidebar" data-workspace-slug={workspaceSlug}>
      Sidebar for {userName} ({userEmail})
    </div>
  ),
}));

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OrbitWorkspaceLayout from "./layout";

describe("OrbitWorkspaceLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to signin when not authenticated", async () => {
    (auth as Mock).mockResolvedValue(null);

    await expect(
      OrbitWorkspaceLayout({
        children: <div>Content</div>,
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("redirects to signin when session has no user id", async () => {
    (auth as Mock).mockResolvedValue({
      user: { email: "test@example.com" },
    });

    await expect(
      OrbitWorkspaceLayout({
        children: <div>Content</div>,
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("renders layout with providers when authenticated", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "user_123", email: "test@example.com", name: "Test User" },
    });

    const layout = await OrbitWorkspaceLayout({
      children: <div data-testid="content">Content</div>,
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    render(layout);

    expect(screen.getByTestId("query-provider")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-provider")).toBeInTheDocument();
    expect(screen.getByTestId("orbit-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("passes user info to OrbitSidebar", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "user_123", email: "test@example.com", name: "Test User" },
    });

    const layout = await OrbitWorkspaceLayout({
      children: <div>Content</div>,
      params: Promise.resolve({ workspaceSlug: "my-workspace" }),
    });

    render(layout);

    const sidebar = screen.getByTestId("orbit-sidebar");
    expect(sidebar).toHaveAttribute("data-workspace-slug", "my-workspace");
    expect(sidebar).toHaveTextContent("Test User");
    expect(sidebar).toHaveTextContent("test@example.com");
  });
});
