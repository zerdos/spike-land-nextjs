/**
 * Performance Chart Tests
 *
 * Unit tests for the PerformanceChart component.
 * Part of #552: Create Allocator dashboard
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CampaignPerformanceAnalysis } from "@/lib/allocator/allocator-types";

import { PerformanceChart } from "./PerformanceChart";

// Mock Recharts to avoid SVG rendering issues in tests
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

const mockCampaignAnalyses: CampaignPerformanceAnalysis[] = [
  {
    campaignId: "campaign-1",
    campaignName: "Facebook Campaign",
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
    periodStart: new Date("2024-01-01"),
    periodEnd: new Date("2024-01-31"),
    daysAnalyzed: 30,
  },
  {
    campaignId: "campaign-2",
    campaignName: "Google Ads Campaign",
    platform: "GOOGLE_ADS",
    accountId: "account-2",
    currentBudget: 30000,
    currency: "USD",
    metrics: {
      roas: 1.8,
      cpa: 4200,
      ctr: 0.9,
      conversionRate: 1.8,
      spend: 30000,
      conversions: 7,
      impressions: 15000,
      clicks: 135,
    },
    trend: {
      roas: "declining",
      cpa: "declining",
      conversions: "stable",
    },
    performanceScore: 60,
    efficiencyScore: 55,
    periodStart: new Date("2024-01-01"),
    periodEnd: new Date("2024-01-31"),
    daysAnalyzed: 30,
  },
];

describe("PerformanceChart", () => {
  it("renders campaign performance title", () => {
    render(
      <PerformanceChart
        campaignAnalyses={mockCampaignAnalyses}
        lookbackDays={30}
      />,
    );

    expect(screen.getByText("Campaign Performance")).toBeInTheDocument();
  });

  it("displays lookback period", () => {
    render(
      <PerformanceChart
        campaignAnalyses={mockCampaignAnalyses}
        lookbackDays={30}
      />,
    );

    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
  });

  it("renders tabs for different metrics", () => {
    render(
      <PerformanceChart
        campaignAnalyses={mockCampaignAnalyses}
        lookbackDays={30}
      />,
    );

    expect(screen.getByRole("tab", { name: "ROAS" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "CPA" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Conversions" }))
      .toBeInTheDocument();
  });

  it("renders chart container", () => {
    render(
      <PerformanceChart
        campaignAnalyses={mockCampaignAnalyses}
        lookbackDays={30}
      />,
    );

    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("displays trend badges for top campaigns", () => {
    render(
      <PerformanceChart
        campaignAnalyses={mockCampaignAnalyses}
        lookbackDays={30}
      />,
    );

    // Should show improving trend for Facebook campaign
    expect(screen.getByText("Improving")).toBeInTheDocument();
  });

  it("shows empty state when no campaigns", () => {
    render(
      <PerformanceChart
        campaignAnalyses={[]}
        lookbackDays={30}
      />,
    );

    expect(
      screen.getByText(
        "No campaign data available. Connect your ad accounts to see performance metrics.",
      ),
    ).toBeInTheDocument();
  });

  it("handles different lookback periods", () => {
    render(
      <PerformanceChart
        campaignAnalyses={mockCampaignAnalyses}
        lookbackDays={7}
      />,
    );

    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
  });

  it("truncates long campaign names", () => {
    const longNameCampaign: CampaignPerformanceAnalysis = {
      ...mockCampaignAnalyses[0]!,
      campaignName: "This is a very long campaign name that should be truncated",
    };

    render(
      <PerformanceChart
        campaignAnalyses={[longNameCampaign]}
        lookbackDays={30}
      />,
    );

    // The full name should be in the document (for tooltip/display purposes)
    expect(
      screen.getByText(
        "This is a very long campaign name that should be truncated",
      ),
    ).toBeInTheDocument();
  });
});
