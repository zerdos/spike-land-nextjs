import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EnhancePage from "./page";

// Mock the hook used in TokenBalanceDisplay
vi.mock("@/hooks/useTokenBalance", () => ({
  useTokenBalance: () => ({
    balance: 100,
    isLoading: false,
    isLowBalance: false,
    isCriticalBalance: false,
    estimatedEnhancements: { tier1K: 50, tier2K: 20, tier4K: 10 },
    stats: { totalSpent: 50, totalEarned: 150, totalRefunded: 0 },
    refetch: vi.fn(),
  }),
  LOW_BALANCE_THRESHOLD: 10,
}));

// Mock ResizeObserver for ImageComparisonSlider if needed (often needed for layout components)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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
    expect(screen.getByText("Token Balance Display")).toBeDefined();

    // Check specific content
    expect(screen.getByText("Vacation 2023")).toBeDefined(); // Album name
    expect(screen.getAllByText("100 tokens").length).toBeGreaterThan(0); // Balance
  });
});
