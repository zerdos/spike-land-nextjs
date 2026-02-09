import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock the hook used by CreditBalanceDisplay
vi.mock("@/hooks/useWorkspaceCredits", () => ({
  useWorkspaceCredits: () => ({
    remaining: 100,
    limit: 200,
    used: 100,
    tier: "pro",
    workspaceId: "ws-1",
    isLoading: false,
    hasFetched: true,
    error: null,
    isLowCredits: false,
    isCriticalCredits: false,
    usagePercent: 50,
    estimatedEnhancements: { tier1K: 50, tier2K: 20, tier4K: 10, suggested: 50, suggestedTier: "1K" },
    refetch: vi.fn(),
  }),
  LOW_CREDITS_THRESHOLD: 10,
  CRITICAL_CREDITS_THRESHOLD: 5,
}));

// Mock ResizeObserver for ImageComparisonSlider if needed (often needed for layout components)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import EnhancePage from "./page";

describe("EnhancePage", () => {
  it("renders all components", () => {
    render(<EnhancePage />);

    // Check for Section title
    expect(screen.getByText("Enhancement Components")).toBeDefined();

    // Check for component cards
    expect(screen.getByText("Image Comparison Slider")).toBeDefined();
    expect(screen.getAllByText("Enhancement Settings").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Tier Selection Checkboxes")).toBeDefined();
    expect(screen.getByText("Batch Enhance Progress")).toBeDefined();
    expect(screen.getByText("Album Card")).toBeDefined();
    expect(screen.getByText("Credit Balance Display")).toBeDefined();

    // Check specific content
    expect(screen.getByText("Vacation 2023")).toBeDefined(); // Album name
    expect(screen.getAllByText("100 credits").length).toBeGreaterThan(0); // Balance
  });
});
