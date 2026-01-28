/**
 * Tests for Scout Landing Page
 *
 * Resolves #870
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ScoutPage from "./page";

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
    scoutTopic: {
      count: vi.fn().mockResolvedValue(3),
    },
    scoutResult: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "result-1",
          content: "Test result content",
          author: "testuser",
          platform: "TWITTER",
          foundAt: new Date("2024-01-15"),
          topic: { name: "AI" },
        },
      ]),
    },
  },
}));

// Mock navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("ScoutPage", () => {
  it("renders page heading and description", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await ScoutPage({ params });
    render(Component);

    expect(screen.getByRole("heading", { name: "Scout", level: 1 }))
      .toBeInTheDocument();
    expect(
      screen.getByText(/Track competitors and monitor market intelligence/i),
    ).toBeInTheDocument();
  });

  it("renders overview cards with counts", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await ScoutPage({ params });
    render(Component);

    expect(screen.getByText("Competitors Tracked")).toBeInTheDocument();
    // Count "5" appears in overview card - use getAllByText for robustness
    expect(screen.getAllByText("5").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Topics Monitored")).toBeInTheDocument();
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Benchmark Status")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders quick actions", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await ScoutPage({ params });
    render(Component);

    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Add Competitor")).toBeInTheDocument();
    expect(screen.getByText("Add Topic")).toBeInTheDocument();
  });

  it("renders scout module navigation links", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await ScoutPage({ params });
    render(Component);

    expect(screen.getByText("Scout Modules")).toBeInTheDocument();
    expect(screen.getByText("Competitors")).toBeInTheDocument();
    expect(screen.getByText("Topics")).toBeInTheDocument();
    expect(screen.getByText("Benchmarks")).toBeInTheDocument();
  });

  it("renders recent activity feed", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await ScoutPage({ params });
    render(Component);

    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    expect(screen.getByText("Test result content")).toBeInTheDocument();
    expect(screen.getByText(/testuser/)).toBeInTheDocument();
  });
});
