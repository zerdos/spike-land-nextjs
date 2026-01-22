/**
 * Allocator Dashboard Tests
 *
 * Unit tests for the AllocatorDashboard component.
 * Part of #552: Create Allocator dashboard
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AllocatorDashboard } from "./AllocatorDashboard";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock useAutopilotConfig hook
vi.mock("@/hooks/useAutopilotConfig", () => ({
  useAutopilotConfig: () => ({
    config: null,
    isLoading: false,
    error: null,
    updateConfig: vi.fn(),
    toggleAutopilot: vi.fn(),
    refreshConfig: vi.fn(),
  }),
}));

import { toast } from "sonner";

// Mock Recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode; }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode; }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

const mockApiResponse = {
  campaignAnalyses: [
    {
      campaignId: "campaign-1",
      campaignName: "Test Campaign",
      platform: "FACEBOOK",
      accountId: "account-1",
      currentBudget: 50000,
      currency: "USD",
      metrics: {
        roas: 2.5,
        cpa: 3500,
        ctr: 1.2,
        conversionRate: 2.5,
        spend: 50000,
        conversions: 14,
        impressions: 10000,
        clicks: 120,
      },
      trend: {
        roas: "improving",
        cpa: "stable",
        conversions: "improving",
      },
      performanceScore: 85,
      efficiencyScore: 80,
      periodStart: "2024-01-01T00:00:00.000Z",
      periodEnd: "2024-01-31T00:00:00.000Z",
      daysAnalyzed: 30,
    },
  ],
  recommendations: [
    {
      id: "rec-1",
      type: "SCALE_WINNER",
      confidence: "high",
      targetCampaign: {
        id: "campaign-1",
        name: "Test Campaign",
        platform: "FACEBOOK",
        currentBudget: 50000,
      },
      suggestedBudgetChange: 10000,
      suggestedNewBudget: 60000,
      currency: "USD",
      projectedImpact: {
        estimatedRoasChange: 15,
        estimatedCpaChange: -8,
        estimatedConversionChange: 20,
        estimatedSpendChange: 10000,
        confidenceInterval: { low: 10, high: 25 },
      },
      reason: "High performer with improving metrics",
      supportingData: ["ROAS: 2.5x"],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  summary: {
    totalCampaignsAnalyzed: 1,
    totalCurrentSpend: 50000,
    currency: "USD",
    averageRoas: 2.5,
    averageCpa: 3500,
    projectedTotalImpact: {
      estimatedRoasImprovement: 15,
      estimatedCpaSavings: -8,
      estimatedConversionIncrease: 20,
    },
  },
  hasEnoughData: true,
  dataQualityScore: 85,
  workspaceName: "Test Workspace",
  analysisRange: {
    start: "2024-01-01T00:00:00.000Z",
    end: "2024-01-31T00:00:00.000Z",
  },
};

describe("AllocatorDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("shows loading state initially", () => {
    vi.mocked(global.fetch).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<AllocatorDashboard workspaceSlug="test-workspace" />);

    // Should show skeleton loaders
    expect(screen.getAllByRole("generic")).toBeDefined();
  });

  it("renders dashboard with data after loading", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    } as Response);

    render(<AllocatorDashboard workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(screen.getByText("Total Spend")).toBeInTheDocument();
    });

    expect(screen.getAllByText("$500").length).toBeGreaterThan(0);
    expect(screen.getByText("Campaign Performance")).toBeInTheDocument();
    expect(screen.getByText("Recommendations")).toBeInTheDocument();
  });

  it("displays error state on fetch failure", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Failed to fetch data" }),
    } as Response);

    render(<AllocatorDashboard workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch data")).toBeInTheDocument();
    });
  });

  it("shows warning when insufficient data", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...mockApiResponse, hasEnoughData: false }),
    } as Response);

    render(<AllocatorDashboard workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(
        screen.getByText(/Limited data available for analysis/i),
      ).toBeInTheDocument();
    });
  });

  it("displays no recommendations message when empty", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...mockApiResponse, recommendations: [] }),
    } as Response);

    render(<AllocatorDashboard workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(
        screen.getByText(/No recommendations at this time/i),
      ).toBeInTheDocument();
    });
  });

  it("fetches data with correct parameters", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    } as Response);

    render(<AllocatorDashboard workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/orbit/test-workspace/allocator"),
      );
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("lookbackDays=30"),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("riskTolerance=moderate"),
    );
  });

  it("refetches data when period changes", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    } as Response);

    render(<AllocatorDashboard workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(screen.getByText("Total Spend")).toBeInTheDocument();
    });

    // Change period
    const periodSelect = screen.getAllByRole("combobox")[0];
    await user.click(periodSelect!);
    const option = await screen.findByRole("option", { name: "7 days" });
    await user.click(option);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("lookbackDays=7"),
      );
    });
  });

  it("refetches data when risk tolerance changes", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    } as Response);

    render(<AllocatorDashboard workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(screen.getByText("Total Spend")).toBeInTheDocument();
    });

    // Change risk tolerance
    const riskSelect = screen.getAllByRole("combobox")[1];
    await user.click(riskSelect!);
    const option = await screen.findByRole("option", { name: "Aggressive" });
    await user.click(option);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("riskTolerance=aggressive"),
      );
    });
  });

  it("displays recommendation cards", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    } as Response);

    render(<AllocatorDashboard workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(screen.getByText("Scale Winner")).toBeInTheDocument();
    });

    expect(screen.getByText("High Confidence")).toBeInTheDocument();
    expect(screen.getByText("High performer with improving metrics"))
      .toBeInTheDocument();
  });

  describe("Apply Recommendation", () => {
    it("calls apply API when recommendation is applied", async () => {
      const user = userEvent.setup();

      // First call returns dashboard data, subsequent calls are for apply and refresh
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              result: { status: "COMPLETED", budgetChange: 10000, newBudget: 60000 },
              message: "Recommendation applied successfully",
            }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponse),
        } as Response);

      render(<AllocatorDashboard workspaceSlug="test-workspace" />);

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText("Scale Winner")).toBeInTheDocument();
      });

      // Find and click the Apply button
      const applyButton = screen.getByRole("button", {
        name: "Apply Recommendation",
      });
      await user.click(applyButton);

      // Verify API was called with correct parameters
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/orbit/test-workspace/allocator/recommendations/apply",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }),
        );
      });

      // Verify success toast was shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Recommendation applied successfully",
        );
      });
    });

    it("shows error toast when apply fails", async () => {
      const user = userEvent.setup();

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: () =>
            Promise.resolve({
              error: "Campaign not found in this workspace",
            }),
        } as Response);

      render(<AllocatorDashboard workspaceSlug="test-workspace" />);

      await waitFor(() => {
        expect(screen.getByText("Scale Winner")).toBeInTheDocument();
      });

      const applyButton = screen.getByRole("button", {
        name: "Apply Recommendation",
      });
      await user.click(applyButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("Failed to apply recommendation"),
        );
      });
    });

    it("shows warning toast when recommendation is skipped", async () => {
      const user = userEvent.setup();

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              result: { status: "SKIPPED", budgetChange: 0, newBudget: 50000 },
              message: "Recommendation skipped: Daily budget limit reached",
            }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponse),
        } as Response);

      render(<AllocatorDashboard workspaceSlug="test-workspace" />);

      await waitFor(() => {
        expect(screen.getByText("Scale Winner")).toBeInTheDocument();
      });

      const applyButton = screen.getByRole("button", {
        name: "Apply Recommendation",
      });
      await user.click(applyButton);

      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalledWith(
          expect.stringContaining("skipped"),
        );
      });
    });

    it("sends correct recommendation data to API", async () => {
      const user = userEvent.setup();
      let capturedBody: string | undefined;

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponse),
        } as Response)
        .mockImplementationOnce(async (_url, options) => {
          capturedBody = options?.body as string;
          return {
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                result: { status: "COMPLETED" },
                message: "Applied",
              }),
          } as Response;
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponse),
        } as Response);

      render(<AllocatorDashboard workspaceSlug="test-workspace" />);

      await waitFor(() => {
        expect(screen.getByText("Scale Winner")).toBeInTheDocument();
      });

      const applyButton = screen.getByRole("button", {
        name: "Apply Recommendation",
      });
      await user.click(applyButton);

      await waitFor(() => {
        expect(capturedBody).toBeDefined();
      });

      const parsedBody = JSON.parse(capturedBody!);
      expect(parsedBody).toEqual(
        expect.objectContaining({
          recommendationId: "rec-1",
          campaignId: "campaign-1",
          currentBudget: 50000,
          suggestedNewBudget: 60000,
          type: "SCALE_WINNER",
          reason: "High performer with improving metrics",
          confidence: "high",
        }),
      );
    });

    it("handles case when recommendation data structure is correct", async () => {
      // This test verifies that recommendations are properly rendered
      // Testing the "recommendation not found" edge case would require manipulating
      // internal component state which is an anti-pattern in React Testing Library

      const responseWithMatchingRec = {
        ...mockApiResponse,
        recommendations: [
          {
            ...mockApiResponse.recommendations[0],
            id: "rec-1", // Matching ID
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseWithMatchingRec),
      } as Response);

      render(<AllocatorDashboard workspaceSlug="test-workspace" />);

      await waitFor(() => {
        expect(screen.getByText("Scale Winner")).toBeInTheDocument();
      });

      // Verify the recommendation is properly displayed with apply button
      expect(
        screen.getByRole("button", { name: "Apply Recommendation" }),
      ).toBeInTheDocument();
    });

    it("refreshes data after successful application", async () => {
      const user = userEvent.setup();

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              result: { status: "COMPLETED" },
              message: "Applied",
            }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockApiResponse,
              recommendations: [], // No more recommendations after apply
            }),
        } as Response);

      render(<AllocatorDashboard workspaceSlug="test-workspace" />);

      await waitFor(() => {
        expect(screen.getByText("Scale Winner")).toBeInTheDocument();
      });

      const applyButton = screen.getByRole("button", {
        name: "Apply Recommendation",
      });
      await user.click(applyButton);

      // After refresh, should show no recommendations message
      await waitFor(() => {
        expect(
          screen.getByText(/No recommendations at this time/i),
        ).toBeInTheDocument();
      });
    });
  });
});
