/**
 * Tests for Scout Benchmarks Page
 *
 * Resolves #870
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BenchmarksPage from "./page";

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
    scoutCompetitor: {
      count: vi.fn().mockResolvedValue(5),
    },
  },
}));

// Mock navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock the client component
vi.mock("./BenchmarksClient", () => ({
  BenchmarksClient: ({
    workspaceSlug,
    competitorCount,
  }: {
    workspaceSlug: string;
    competitorCount: number;
  }) => (
    <div
      data-testid="benchmarks-client"
      data-workspace={workspaceSlug}
      data-competitor-count={competitorCount}
    >
      Benchmarks Client Mock
    </div>
  ),
}));

describe("BenchmarksPage", () => {
  it("renders page heading and description", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await BenchmarksPage({ params });
    render(Component);

    expect(screen.getByRole("heading", { name: "Benchmarks", level: 1 }))
      .toBeInTheDocument();
    expect(
      screen.getByText(
        /Compare your performance against competitors and industry standards/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders BenchmarksClient with correct props", async () => {
    const params = Promise.resolve({ workspaceSlug: "my-workspace" });
    const Component = await BenchmarksPage({ params });
    render(Component);

    const client = screen.getByTestId("benchmarks-client");
    expect(client).toBeInTheDocument();
    expect(client).toHaveAttribute("data-workspace", "my-workspace");
    expect(client).toHaveAttribute("data-competitor-count", "5");
  });
});
