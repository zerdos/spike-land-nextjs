/**
 * Tests for Scout TopicsClient Component
 *
 * Resolves #870
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TopicsClient } from "./TopicsClient";

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

describe("TopicsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<TopicsClient workspaceSlug="test-workspace" />);

    // Check for skeleton loading indicators (animate-pulse class from Skeleton component)
    expect(document.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();
  });

  it("renders empty state when no topics", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<TopicsClient workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(screen.getByText("No topics found")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Create your first topic to start monitoring/i),
    ).toBeInTheDocument();
  });

  it("renders topic list when data exists", async () => {
    const mockTopics = [
      {
        id: "topic-1",
        name: "AI Healthcare",
        keywords: {
          and: ["ai", "healthcare"],
          or: ["diagnosis"],
          not: ["crypto"],
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        _count: { results: 42 },
      },
      {
        id: "topic-2",
        name: "Machine Learning",
        keywords: {
          and: ["ml"],
          or: [],
          not: [],
        },
        isActive: false,
        createdAt: new Date().toISOString(),
        _count: { results: 10 },
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTopics),
    });

    render(<TopicsClient workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(screen.getByText("AI Healthcare")).toBeInTheDocument();
    });

    expect(screen.getByText("Machine Learning")).toBeInTheDocument();
    expect(screen.getByText("+ai")).toBeInTheDocument();
    expect(screen.getByText("+healthcare")).toBeInTheDocument();
    expect(screen.getByText("diagnosis")).toBeInTheDocument();
    expect(screen.getByText("-crypto")).toBeInTheDocument();
    expect(screen.getByText("42 results")).toBeInTheDocument();
    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  it("renders add topic button", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<TopicsClient workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Add Topic/i })).toBeInTheDocument();
    });
  });

  it("opens create dialog when add topic button clicked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<TopicsClient workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Add Topic/i })).toBeInTheDocument();
    });

    const addButton = screen.getByRole("button", { name: /Add Topic/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Dialog title and button both have "Create Topic"
    expect(screen.getAllByText("Create Topic")).toHaveLength(2);
    expect(screen.getByLabelText("Topic Name")).toBeInTheDocument();
  });

  it("filters topics by search query", async () => {
    const mockTopics = [
      {
        id: "topic-1",
        name: "AI Healthcare",
        keywords: { and: ["ai"], or: [], not: [] },
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "topic-2",
        name: "Blockchain Trends",
        keywords: { and: ["blockchain"], or: [], not: [] },
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTopics),
    });

    render(<TopicsClient workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(screen.getByText("AI Healthcare")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search topics...");
    fireEvent.change(searchInput, { target: { value: "blockchain" } });

    expect(screen.queryByText("AI Healthcare")).not.toBeInTheDocument();
    expect(screen.getByText("Blockchain Trends")).toBeInTheDocument();
  });

  it("handles error state", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    render(<TopicsClient workspaceSlug="test-workspace" />);

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });
});
