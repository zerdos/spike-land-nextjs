/**
 * Tests for Scout Topics Page
 *
 * Resolves #870
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TopicsPage from "./page";

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
vi.mock("./TopicsClient", () => ({
  TopicsClient: ({ workspaceSlug }: { workspaceSlug: string; }) => (
    <div data-testid="topics-client" data-workspace={workspaceSlug}>
      Topics Client Mock
    </div>
  ),
}));

describe("TopicsPage", () => {
  it("renders page heading and description", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await TopicsPage({ params });
    render(Component);

    expect(screen.getByRole("heading", { name: "Topics", level: 1 }))
      .toBeInTheDocument();
    expect(
      screen.getByText(/Monitor keywords and trending topics in your industry/i),
    ).toBeInTheDocument();
  });

  it("renders TopicsClient with correct workspace slug", async () => {
    const params = Promise.resolve({ workspaceSlug: "my-workspace" });
    const Component = await TopicsPage({ params });
    render(Component);

    const client = screen.getByTestId("topics-client");
    expect(client).toBeInTheDocument();
    expect(client).toHaveAttribute("data-workspace", "my-workspace");
  });
});
