import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AiAgentsPage from "./page";

// Mock the AllocatorDashboard component
vi.mock("@/components/orbit/allocator", () => ({
  AllocatorDashboard: ({ workspaceSlug }: { workspaceSlug: string; }) => (
    <div data-testid="allocator-dashboard">
      Allocator Dashboard for {workspaceSlug}
    </div>
  ),
}));

describe("AiAgentsPage", () => {
  it("renders page with AllocatorDashboard", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await AiAgentsPage({ params });
    render(Component);

    expect(screen.getByRole("heading", { name: "AI Agents" }))
      .toBeInTheDocument();
    expect(screen.getByTestId("allocator-dashboard")).toBeInTheDocument();
    expect(screen.getByText(/test-workspace/)).toBeInTheDocument();
  });
});
