/**
 * Tests for Orbit Dashboard Page
 *
 * Resolves #649
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./page";

// Mock the PulseDashboard component since it has complex dependencies
vi.mock("@/components/orbit/pulse", () => ({
  PulseDashboard: ({ workspaceSlug }: { workspaceSlug: string; }) => (
    <div data-testid="pulse-dashboard" data-workspace={workspaceSlug}>
      Pulse Dashboard Mock
    </div>
  ),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode; }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dashboard heading and description", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const Component = await DashboardPage({ params });

    render(Component, { wrapper: createWrapper() });

    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Monitor your social media performance/i),
    ).toBeInTheDocument();
  });

  it("renders PulseDashboard with correct workspace slug", async () => {
    const params = Promise.resolve({ workspaceSlug: "my-workspace" });
    const Component = await DashboardPage({ params });

    render(Component, { wrapper: createWrapper() });

    const pulseDashboard = screen.getByTestId("pulse-dashboard");
    expect(pulseDashboard).toBeInTheDocument();
    expect(pulseDashboard).toHaveAttribute("data-workspace", "my-workspace");
  });
});
