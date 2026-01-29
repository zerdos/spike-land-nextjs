/**
 * Tests for Analytics Page
 * Resolves #842
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AnalyticsPage from "./page";

// Mock the AnalyticsDashboard component
vi.mock("@/components/orbit/analytics/AnalyticsDashboard", () => ({
  AnalyticsDashboard: ({ workspaceSlug }: { workspaceSlug: string }) => (
    <div data-testid="analytics-dashboard">Dashboard for {workspaceSlug}</div>
  ),
}));

describe("AnalyticsPage", () => {
  it("renders page title and description", async () => {
    const params = Promise.resolve({ workspaceSlug: "test-workspace" });
    const page = await AnalyticsPage({ params });
    
    const { container } = render(page);
    
    expect(container.textContent).toContain("Analytics");
    expect(container.textContent).toContain("AI-powered insights and performance metrics");
  });

  it("passes workspace slug to AnalyticsDashboard", async () => {
    const params = Promise.resolve({ workspaceSlug: "my-workspace" });
    const page = await AnalyticsPage({ params });
    
    const { container } = render(page);
    
    expect(screen.getByTestId("analytics-dashboard")).toBeInTheDocument();
    expect(container.textContent).toContain("Dashboard for my-workspace");
  });
});
