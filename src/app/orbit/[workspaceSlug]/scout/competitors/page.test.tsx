/**
 * Tests for Scout Competitors Page
 *
 * Resolves #870
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CompetitorsPage from "./page";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", email: "test@example.com" },
  }),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findFirst: vi.fn().mockResolvedValue({
        id: "ws-1",
        name: "Test Workspace",
      }),
    },
  },
}));

// Mock navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock the client component
vi.mock("./CompetitorsClient", () => ({
  CompetitorsClient: ({ workspaceSlug }: { workspaceSlug: string; }) => (
    <div data-testid="competitors-client" data-workspace={workspaceSlug}>
      Competitors Client Mock
    </div>
  ),
}));

describe("CompetitorsPage", () => {
  it("renders page heading and description", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await CompetitorsPage({ params });
    render(Component);

    expect(screen.getByRole("heading", { name: "Competitors", level: 1 }))
      .toBeInTheDocument();
    expect(
      screen.getByText(/Track and analyze competitor social media accounts/i),
    ).toBeInTheDocument();
  });

  it("renders CompetitorsClient with correct workspace slug", async () => {
    const params = Promise.resolve({ workspaceSlug: "my-workspace" });
    const Component = await CompetitorsPage({ params });
    render(Component);

    const client = screen.getByTestId("competitors-client");
    expect(client).toBeInTheDocument();
    expect(client).toHaveAttribute("data-workspace", "my-workspace");
  });
});
