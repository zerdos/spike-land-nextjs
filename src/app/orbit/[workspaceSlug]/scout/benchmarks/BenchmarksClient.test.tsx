/**
 * Tests for Scout BenchmarksClient Component
 *
 * Resolves #870
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BenchmarksClient } from "./BenchmarksClient";

// Create a mock fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("BenchmarksClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders empty state when no competitors", () => {
    render(
      <BenchmarksClient workspaceSlug="test-workspace" competitorCount={0} />,
    );

    expect(screen.getByText("No competitors tracked")).toBeInTheDocument();
    expect(
      screen.getByText(/Add competitors to your Scout to start benchmarking/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Add Competitors")).toBeInTheDocument();
  });

  it("renders loading state initially when competitors exist", () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(
      <BenchmarksClient workspaceSlug="test-workspace" competitorCount={5} />,
    );

    // Check for skeleton loading indicators (animate-pulse class from Skeleton component)
    expect(document.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();
  });

  it("renders benchmark data when available", async () => {
    const mockReport = {
      ownMetrics: {
        averageLikes: 150,
        averageComments: 25,
        averageShares: 10,
        totalPosts: 50,
      },
      competitorMetrics: {
        averageLikes: 100,
        averageComments: 20,
        averageShares: 8,
        totalPosts: 40,
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockReport),
    });

    render(
      <BenchmarksClient workspaceSlug="test-workspace" competitorCount={5} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Overall Performance")).toBeInTheDocument();
    });

    expect(screen.getByText("Above Average")).toBeInTheDocument();
    expect(screen.getByText("Detailed Comparison")).toBeInTheDocument();
    // Multiple occurrences of metric names (cards + table)
    expect(screen.getAllByText("Avg. Likes")).toHaveLength(2);
    expect(screen.getAllByText("Avg. Comments")).toHaveLength(2);
    expect(screen.getAllByText("Avg. Shares")).toHaveLength(2);
  });

  it("renders empty data message when no benchmark data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(null),
    });

    render(
      <BenchmarksClient workspaceSlug="test-workspace" competitorCount={5} />,
    );

    await waitFor(() => {
      expect(screen.getByText("No benchmark data")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Benchmark data will appear once we have enough data/i),
    ).toBeInTheDocument();
  });

  it("renders data notice when own metrics are empty", async () => {
    const mockReport = {
      ownMetrics: {
        averageLikes: 0,
        averageComments: 0,
        averageShares: 0,
        totalPosts: 0,
      },
      competitorMetrics: {
        averageLikes: 100,
        averageComments: 20,
        averageShares: 8,
        totalPosts: 40,
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockReport),
    });

    render(
      <BenchmarksClient workspaceSlug="test-workspace" competitorCount={5} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/No social metrics data available yet/i),
      ).toBeInTheDocument();
    });
  });

  it("handles error state", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(
      <BenchmarksClient workspaceSlug="test-workspace" competitorCount={5} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Failed to fetch benchmark data"),
      ).toBeInTheDocument();
    });
  });

  it("renders industry insights for below average metrics", async () => {
    const mockReport = {
      ownMetrics: {
        averageLikes: 50,
        averageComments: 10,
        averageShares: 3,
        totalPosts: 20,
      },
      competitorMetrics: {
        averageLikes: 100,
        averageComments: 20,
        averageShares: 8,
        totalPosts: 40,
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockReport),
    });

    render(
      <BenchmarksClient workspaceSlug="test-workspace" competitorCount={5} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Industry Insights")).toBeInTheDocument();
    });

    expect(screen.getByText("Improve Engagement")).toBeInTheDocument();
    expect(screen.getByText("Boost Conversations")).toBeInTheDocument();
    expect(screen.getByText("Create Shareable Content")).toBeInTheDocument();
  });

  it("renders great performance message when all metrics are above average", async () => {
    const mockReport = {
      ownMetrics: {
        averageLikes: 200,
        averageComments: 40,
        averageShares: 20,
        totalPosts: 100,
      },
      competitorMetrics: {
        averageLikes: 100,
        averageComments: 20,
        averageShares: 8,
        totalPosts: 40,
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockReport),
    });

    render(
      <BenchmarksClient workspaceSlug="test-workspace" competitorCount={5} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Great Performance!")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/outperforming your competitors across all/i),
    ).toBeInTheDocument();
  });
});
