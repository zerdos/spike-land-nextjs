import { describe, expect, it, vi } from "vitest";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated", data: { user: { name: "Test" } } }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock hooks
vi.mock("@/hooks/useWorkspaceCredits", () => ({
  useWorkspaceCredits: () => ({
    remaining: 42,
    limit: 100,
    used: 58,
    tier: "BASIC",
    workspaceId: "ws-1",
    isLoading: false,
    hasFetched: true,
    error: null,
    isLowCredits: false,
    isCriticalCredits: false,
    usagePercent: 58,
    estimatedEnhancements: { tier1K: 21, tier2K: 8, tier4K: 4, suggested: 21, suggestedTier: "1K" },
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useDowngrade", () => ({
  useDowngrade: () => ({
    scheduleDowngrade: vi.fn().mockResolvedValue({ success: true }),
    cancelDowngrade: vi.fn().mockResolvedValue({ success: true }),
    scheduledDowngrade: null,
    isScheduling: false,
    isCanceling: false,
    error: null,
    clearScheduledDowngrade: vi.fn(),
  }),
}));

describe("SubscriptionPage", () => {
  it("should import without errors now that deleted dependencies are removed", async () => {
    const mod = await import("./page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});
