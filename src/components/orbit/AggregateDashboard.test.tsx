import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AggregateDashboard } from "./AggregateDashboard";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode; }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// Mock API response
function createMockResponse() {
  return {
    kpis: {
      totalWorkspaces: 5,
      totalSocialAccounts: 12,
      totalScheduledPosts: 45,
      totalPublishedPosts: 250,
      totalEngagements: 15000,
      totalFollowers: 50000,
      totalImpressions: 100000,
    },
    workspaceSummaries: [
      {
        workspaceId: "ws-1",
        workspaceName: "Marketing Team",
        workspaceSlug: "marketing-team",
        socialAccountCount: 4,
        scheduledPostCount: 15,
        publishedPostCount: 100,
        totalEngagements: 5000,
        totalFollowers: 20000,
        totalImpressions: 40000,
        lastActivityAt: null,
      },
      {
        workspaceId: "ws-2",
        workspaceName: "Sales Team",
        workspaceSlug: "sales-team",
        socialAccountCount: 3,
        scheduledPostCount: 10,
        publishedPostCount: 80,
        totalEngagements: 4000,
        totalFollowers: 15000,
        totalImpressions: 30000,
        lastActivityAt: null,
      },
    ],
    dateRange: {
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2024-01-31T23:59:59.999Z",
    },
  };
}

describe("AggregateDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("shows skeleton loaders while loading", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => createMockResponse(),
                }),
              100,
            )
          ),
      );

      render(<AggregateDashboard />, { wrapper: createWrapper() });

      // Should show loading state with title
      expect(screen.getByText("Overview")).toBeInTheDocument();
      expect(
        screen.getByText("Aggregated metrics across all your workspaces"),
      ).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("Total Workspaces")).toBeInTheDocument();
      });
    });
  });

  describe("error state", () => {
    it("shows error message when fetch fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<AggregateDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.getByText("Failed to load aggregate dashboard"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("with data", () => {
    it("displays KPI cards with correct values", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockResponse(),
      });

      render(<AggregateDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Total Workspaces")).toBeInTheDocument();
      });

      // Check KPI values
      expect(screen.getByText("5")).toBeInTheDocument(); // Total Workspaces
      expect(screen.getByText("12")).toBeInTheDocument(); // Social Accounts
      expect(screen.getByText("45")).toBeInTheDocument(); // Scheduled Posts
      expect(screen.getByText("250")).toBeInTheDocument(); // Published Posts
    });

    it("displays engagement metrics with formatted numbers", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockResponse(),
      });

      render(<AggregateDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Total Followers")).toBeInTheDocument();
      });

      // Check formatted numbers (K suffix) - use getAllByText for values that appear multiple times
      expect(screen.getByText("50.0K")).toBeInTheDocument(); // Total Followers
      expect(screen.getAllByText("15.0K").length).toBeGreaterThanOrEqual(1); // Total Engagements (also appears in breakdown)
      expect(screen.getByText("100.0K")).toBeInTheDocument(); // Total Impressions
    });

    it("displays workspace breakdown", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockResponse(),
      });

      render(<AggregateDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Workspace Breakdown")).toBeInTheDocument();
      });

      // Check workspace names
      expect(screen.getByText("Marketing Team")).toBeInTheDocument();
      expect(screen.getByText("Sales Team")).toBeInTheDocument();

      // Check account counts
      expect(screen.getByText("4 accounts")).toBeInTheDocument();
      expect(screen.getByText("3 accounts")).toBeInTheDocument();
    });

    it("shows card descriptions", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockResponse(),
      });

      render(<AggregateDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Active workspaces")).toBeInTheDocument();
      });

      expect(screen.getByText("Connected accounts")).toBeInTheDocument();
      expect(screen.getByText("Pending publication")).toBeInTheDocument();
      expect(screen.getByText("Successfully posted")).toBeInTheDocument();
      expect(screen.getByText("Across all accounts")).toBeInTheDocument();
      expect(screen.getByText("Likes, comments, shares")).toBeInTheDocument();
      expect(screen.getByText("Content views")).toBeInTheDocument();
    });
  });

  describe("empty workspace summaries", () => {
    it("does not show breakdown section when no workspaces", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ...createMockResponse(),
          workspaceSummaries: [],
        }),
      });

      render(<AggregateDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Total Workspaces")).toBeInTheDocument();
      });

      // Breakdown section should not be present
      expect(screen.queryByText("Workspace Breakdown")).not.toBeInTheDocument();
    });
  });

  describe("number formatting", () => {
    it("formats millions with M suffix", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ...createMockResponse(),
          kpis: {
            ...createMockResponse().kpis,
            totalImpressions: 2500000,
          },
        }),
      });

      render(<AggregateDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("2.5M")).toBeInTheDocument();
      });
    });

    it("shows raw numbers for values under 1000", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ...createMockResponse(),
          kpis: {
            ...createMockResponse().kpis,
            totalEngagements: 500,
          },
        }),
      });

      render(<AggregateDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("500")).toBeInTheDocument();
      });
    });
  });
});
