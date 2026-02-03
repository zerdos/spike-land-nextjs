import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock next/dynamic to render the OrbitSidebar directly
vi.mock("next/dynamic", () => ({
  default: () => {
    // Return a mock component for testing
    return function MockOrbitSidebar({
      userEmail,
      userName,
      workspaceSlug,
    }: {
      userEmail?: string | null;
      userName?: string | null;
      workspaceSlug: string;
    }) {
      return (
        <div data-testid="orbit-sidebar" data-workspace-slug={workspaceSlug}>
          Sidebar for {userName} ({userEmail})
        </div>
      );
    };
  },
}));

// Mock the Skeleton component
vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string; }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

import { OrbitSidebarClient } from "./OrbitSidebarClient";

describe("OrbitSidebarClient", () => {
  it("renders OrbitSidebar with correct props", () => {
    render(
      <OrbitSidebarClient
        userEmail="test@example.com"
        userName="Test User"
        workspaceSlug="my-workspace"
      />,
    );

    const sidebar = screen.getByTestId("orbit-sidebar");
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveAttribute("data-workspace-slug", "my-workspace");
    expect(sidebar).toHaveTextContent("Test User");
    expect(sidebar).toHaveTextContent("test@example.com");
  });

  it("handles null user props", () => {
    render(
      <OrbitSidebarClient
        userEmail={null}
        userName={null}
        workspaceSlug="test-workspace"
      />,
    );

    const sidebar = screen.getByTestId("orbit-sidebar");
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveAttribute("data-workspace-slug", "test-workspace");
  });
});
