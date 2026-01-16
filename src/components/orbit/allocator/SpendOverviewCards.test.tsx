/**
 * Spend Overview Cards Tests
 *
 * Unit tests for the SpendOverviewCards component.
 * Part of #552: Create Allocator dashboard
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  AllocatorRecommendationsResponse,
  CampaignPerformanceAnalysis,
} from "@/lib/allocator/allocator-types";

import { SpendOverviewCards } from "./SpendOverviewCards";

const mockCampaignAnalyses: CampaignPerformanceAnalysis[] = [
  {
    campaignId: "campaign-1",
    campaignName: "Facebook Campaign",
    platform: "FACEBOOK",
    accountId: "account-1",
    currentBudget: 50000, // $500
    currency: "USD",
    metrics: {
      roas: 2.5,
      cpa: 3500, // $35
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
    currentBudget: 30000, // $300
    currency: "USD",
    metrics: {
      roas: 1.8,
      cpa: 4200, // $42
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

const mockSummary: AllocatorRecommendationsResponse["summary"] = {
  totalCampaignsAnalyzed: 2,
  totalCurrentSpend: 80000, // $800
  currency: "USD",
  averageRoas: 2.15,
  averageCpa: 3850, // $38.50
  projectedTotalImpact: {
    estimatedRoasImprovement: 15,
    estimatedCpaSavings: -10,
    estimatedConversionIncrease: 20,
  },
};

describe("SpendOverviewCards", () => {
  it("renders total spend correctly", () => {
    render(
      <SpendOverviewCards
        summary={mockSummary}
        campaignAnalyses={mockCampaignAnalyses}
        dataQualityScore={85}
      />,
    );

    expect(screen.getByText("Total Spend")).toBeInTheDocument();
    expect(screen.getByText("$800")).toBeInTheDocument();
    expect(screen.getByText("2 campaigns analyzed")).toBeInTheDocument();
  });

  it("displays platform breakdown", () => {
    render(
      <SpendOverviewCards
        summary={mockSummary}
        campaignAnalyses={mockCampaignAnalyses}
        dataQualityScore={85}
      />,
    );

    expect(screen.getByText("FACEBOOK")).toBeInTheDocument();
    expect(screen.getByText("GOOGLE_ADS")).toBeInTheDocument();
    expect(screen.getByText("$500")).toBeInTheDocument();
    expect(screen.getByText("$300")).toBeInTheDocument();
  });

  it("displays average ROAS", () => {
    render(
      <SpendOverviewCards
        summary={mockSummary}
        campaignAnalyses={mockCampaignAnalyses}
        dataQualityScore={85}
      />,
    );

    expect(screen.getByText("Average ROAS")).toBeInTheDocument();
    expect(screen.getByText("2.15x")).toBeInTheDocument();
    expect(screen.getByText("+15.0%")).toBeInTheDocument();
  });

  it("displays average CPA", () => {
    render(
      <SpendOverviewCards
        summary={mockSummary}
        campaignAnalyses={mockCampaignAnalyses}
        dataQualityScore={85}
      />,
    );

    expect(screen.getByText("Average CPA")).toBeInTheDocument();
    expect(screen.getByText("$39")).toBeInTheDocument();
    expect(screen.getByText("-10.0%")).toBeInTheDocument();
  });

  it("displays data quality score", () => {
    render(
      <SpendOverviewCards
        summary={mockSummary}
        campaignAnalyses={mockCampaignAnalyses}
        dataQualityScore={85}
      />,
    );

    expect(screen.getByText("Data Quality")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("Excellent data for accurate recommendations"))
      .toBeInTheDocument();
  });

  it("shows appropriate message for moderate data quality", () => {
    render(
      <SpendOverviewCards
        summary={mockSummary}
        campaignAnalyses={mockCampaignAnalyses}
        dataQualityScore={60}
      />,
    );

    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("Good data, recommendations may vary"))
      .toBeInTheDocument();
  });

  it("shows appropriate message for low data quality", () => {
    render(
      <SpendOverviewCards
        summary={mockSummary}
        campaignAnalyses={mockCampaignAnalyses}
        dataQualityScore={30}
      />,
    );

    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getByText("Limited data, connect more accounts"))
      .toBeInTheDocument();
  });

  it("handles empty campaign analyses", () => {
    render(
      <SpendOverviewCards
        summary={{ ...mockSummary, totalCurrentSpend: 0 }}
        campaignAnalyses={[]}
        dataQualityScore={0}
      />,
    );

    expect(screen.getByText("$0")).toBeInTheDocument();
  });
});
