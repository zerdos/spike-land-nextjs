/**
 * Tests for Scout CompetitorsClient Component
 *
 * Resolves #870
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompetitorsClient } from "./CompetitorsClient";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Create a mock fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CompetitorsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<CompetitorsClient workspaceSlug="test-workspace" />);

    // Check for skeleton loading indicators (animate-pulse class from Skeleton component)
    expect(document.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();
  });

  it("renders empty state when no competitors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<CompetitorsClient workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(screen.getByText("No competitors found")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Add your first competitor to start tracking/i),
    ).toBeInTheDocument();
  });

  it("renders competitor list when data exists", async () => {
    const mockCompetitors = [
      {
        id: "comp-1",
        platform: "TWITTER",
        handle: "competitor1",
        name: "Competitor One",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "comp-2",
        platform: "INSTAGRAM",
        handle: "competitor2",
        name: null,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockCompetitors),
    });

    render(<CompetitorsClient workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(screen.getByText("Competitor One")).toBeInTheDocument();
    });

    expect(screen.getByText("@competitor1")).toBeInTheDocument();
    expect(screen.getByText("@competitor2")).toBeInTheDocument();
    // Platform labels appear multiple times (in select options and badges)
    expect(screen.getAllByText("Twitter/X").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Instagram").length).toBeGreaterThanOrEqual(1);
  });

  it("renders add competitor form", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<CompetitorsClient workspaceSlug="test-workspace" />);

    await waitFor(() => {
      // "Add Competitor" appears in card title and button
      expect(screen.getAllByText("Add Competitor")).toHaveLength(2);
    });

    expect(
      screen.getByPlaceholderText(/Enter handle/i),
    ).toBeInTheDocument();
  });

  it("renders filter controls", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<CompetitorsClient workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(screen.getByText("Filters")).toBeInTheDocument();
    });

    expect(
      screen.getByPlaceholderText("Search competitors..."),
    ).toBeInTheDocument();
  });

  it("filters competitors by search query", async () => {
    const mockCompetitors = [
      {
        id: "comp-1",
        platform: "TWITTER",
        handle: "acmecompany",
        name: "ACME Corp",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "comp-2",
        platform: "INSTAGRAM",
        handle: "competitor2",
        name: "Other Company",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockCompetitors),
    });

    render(<CompetitorsClient workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(screen.getByText("ACME Corp")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search competitors...");
    fireEvent.change(searchInput, { target: { value: "acme" } });

    expect(screen.getByText("ACME Corp")).toBeInTheDocument();
    expect(screen.queryByText("Other Company")).not.toBeInTheDocument();
  });

  it("handles error state", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    render(<CompetitorsClient workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });
});
