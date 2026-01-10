/**
 * Recommendation Card Tests
 *
 * Unit tests for the RecommendationCard component.
 * Part of #552: Create Allocator dashboard
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BudgetRecommendation } from "@/lib/allocator/allocator-types";

import { RecommendationCard } from "./RecommendationCard";

const mockRecommendation: BudgetRecommendation = {
  id: "rec-1",
  type: "SCALE_WINNER",
  confidence: "high",
  targetCampaign: {
    id: "campaign-1",
    name: "High Performer Campaign",
    platform: "FACEBOOK",
    currentBudget: 50000,
  },
  suggestedBudgetChange: 10000, // +$100
  suggestedNewBudget: 60000, // $600
  currency: "USD",
  projectedImpact: {
    estimatedRoasChange: 15,
    estimatedCpaChange: -8,
    estimatedConversionChange: 20,
    estimatedSpendChange: 10000,
    confidenceInterval: { low: 10, high: 25 },
  },
  reason: "Campaign showing consistent high performance with improving trends",
  supportingData: ["ROAS: 2.5x", "Performance score: 85%"],
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
};

describe("RecommendationCard", () => {
  it("renders recommendation type and label", () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText("Scale Winner")).toBeInTheDocument();
    expect(screen.getByText("High Confidence")).toBeInTheDocument();
  });

  it("displays target campaign information", () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText("High Performer Campaign")).toBeInTheDocument();
    expect(screen.getByText("FACEBOOK")).toBeInTheDocument();
  });

  it("displays budget change information", () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText("Budget Change")).toBeInTheDocument();
    expect(screen.getByText("+$100")).toBeInTheDocument();
    expect(screen.getByText("New Budget")).toBeInTheDocument();
    expect(screen.getByText("$600")).toBeInTheDocument();
  });

  it("displays projected impact metrics", () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText("Projected Impact")).toBeInTheDocument();
    expect(screen.getByText("+15.0%")).toBeInTheDocument(); // ROAS
    expect(screen.getByText("-8.0%")).toBeInTheDocument(); // CPA
    expect(screen.getByText("+20.0%")).toBeInTheDocument(); // Conversions
  });

  it("displays reason and supporting data", () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        onApply={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Campaign showing consistent high performance with improving trends"),
    ).toBeInTheDocument();
    expect(screen.getByText("ROAS: 2.5x")).toBeInTheDocument();
    expect(screen.getByText("Performance score: 85%")).toBeInTheDocument();
  });

  it("calls onApply when apply button is clicked", async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        onApply={onApply}
      />,
    );

    const applyButton = screen.getByText("Apply Recommendation");
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
  });

  it("shows loading state while applying", async () => {
    const onApply = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        onApply={onApply}
      />,
    );

    const applyButton = screen.getByText("Apply Recommendation");
    fireEvent.click(applyButton);

    expect(screen.getByText("Applying...")).toBeInTheDocument();
  });

  it("shows applied state after successful apply", async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        onApply={onApply}
      />,
    );

    const applyButton = screen.getByText("Apply Recommendation");
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText("Applied")).toBeInTheDocument();
    });
  });

  it("disables apply button for expired recommendations", () => {
    const expiredRecommendation = {
      ...mockRecommendation,
      expiresAt: new Date(Date.now() - 1000), // Expired
    };

    render(
      <RecommendationCard
        recommendation={expiredRecommendation}
        onApply={vi.fn()}
      />,
    );

    const applyButton = screen.getByRole("button");
    expect(applyButton).toBeDisabled();
    expect(screen.getByText("This recommendation has expired")).toBeInTheDocument();
  });

  it("handles reallocation recommendations with source campaign", () => {
    const reallocateRecommendation: BudgetRecommendation = {
      ...mockRecommendation,
      type: "REALLOCATE",
      sourceCampaign: {
        id: "campaign-2",
        name: "Low Performer Campaign",
        platform: "GOOGLE_ADS",
        currentBudget: 40000,
      },
      suggestedBudgetChange: -5000,
    };

    render(
      <RecommendationCard
        recommendation={reallocateRecommendation}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText("Reallocate")).toBeInTheDocument();
    expect(screen.getByText("From:")).toBeInTheDocument();
    expect(screen.getByText("Low Performer Campaign")).toBeInTheDocument();
    expect(screen.getByText("GOOGLE_ADS")).toBeInTheDocument();
    expect(screen.getByText("To:")).toBeInTheDocument();
  });

  it("displays different confidence levels correctly", () => {
    const lowConfidenceRec = {
      ...mockRecommendation,
      confidence: "low" as const,
    };

    render(
      <RecommendationCard
        recommendation={lowConfidenceRec}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText("Low Confidence")).toBeInTheDocument();
  });

  it("handles decrease budget type correctly", () => {
    const decreaseRec: BudgetRecommendation = {
      ...mockRecommendation,
      type: "DECREASE_BUDGET",
      suggestedBudgetChange: -10000,
      suggestedNewBudget: 40000,
    };

    render(
      <RecommendationCard
        recommendation={decreaseRec}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText("Decrease Budget")).toBeInTheDocument();
  });
});
