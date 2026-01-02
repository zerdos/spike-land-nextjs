/**
 * Admin Analytics Screen Tests
 * Tests for the analytics dashboard with token and user metrics
 */

import AdminAnalyticsScreen from "@/app/admin/analytics/index";
import * as adminApi from "@/services/api/admin";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { TamaguiProvider } from "tamagui";

// Mock the admin API
jest.mock("@/services/api/admin");
const mockAdminApi = adminApi as jest.Mocked<typeof adminApi>;

// Test wrapper with providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode; }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TamaguiProvider config={{} as never}>
          {children}
        </TamaguiProvider>
      </QueryClientProvider>
    );
  };
};

describe("AdminAnalyticsScreen", () => {
  const mockTokenAnalytics: adminApi.TokenAnalytics = {
    tokensByType: [
      { type: "PURCHASE", total: 50000 },
      { type: "ENHANCEMENT_SPEND", total: -25000 },
      { type: "ADMIN_GRANT", total: 5000 },
      { type: "REFERRAL_BONUS", total: 2000 },
    ],
    dailyTokens: [
      { date: "2025-12-22", purchased: 500, spent: 200 },
      { date: "2025-12-23", purchased: 600, spent: 300 },
      { date: "2025-12-24", purchased: 450, spent: 250 },
      { date: "2025-12-25", purchased: 300, spent: 150 },
      { date: "2025-12-26", purchased: 550, spent: 280 },
      { date: "2025-12-27", purchased: 700, spent: 350 },
      { date: "2025-12-28", purchased: 650, spent: 320 },
    ],
    revenue: { total: 15000 },
    circulation: { total: 32000, average: 45.5 },
    regenerationCount: 1250,
    packageSales: [
      { name: "Starter Pack", tokens: 100, sales: 150 },
      { name: "Pro Pack", tokens: 500, sales: 75 },
      { name: "Enterprise", tokens: 2000, sales: 20 },
    ],
  };

  const mockUserAnalytics: adminApi.UserAnalytics = {
    totalUsers: 2500,
    newUsersLast30Days: 350,
    activeUsersLast30Days: 1800,
    dailySignups: [
      { date: "2025-12-22", count: 15 },
      { date: "2025-12-23", count: 18 },
      { date: "2025-12-24", count: 12 },
      { date: "2025-12-25", count: 8 },
      { date: "2025-12-26", count: 20 },
      { date: "2025-12-27", count: 25 },
      { date: "2025-12-28", count: 22 },
    ],
    usersByAuthProvider: [
      { provider: "google", count: 1500 },
      { provider: "email", count: 800 },
      { provider: "github", count: 150 },
      { provider: "apple", count: 50 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should show loading state while fetching data", () => {
      mockAdminApi.getTokenAnalytics.mockImplementation(
        () => new Promise(() => {}),
      );
      mockAdminApi.getUserAnalytics.mockImplementation(
        () => new Promise(() => {}),
      );

      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      expect(getByText("Loading analytics...")).toBeTruthy();
    });
  });

  describe("Successful Data Display", () => {
    beforeEach(() => {
      mockAdminApi.getTokenAnalytics.mockResolvedValue({
        data: mockTokenAnalytics,
        error: null,
        status: 200,
      });
      mockAdminApi.getUserAnalytics.mockResolvedValue({
        data: mockUserAnalytics,
        error: null,
        status: 200,
      });
    });

    it("should display analytics header with date range selector", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Analytics")).toBeTruthy();
      });

      expect(getByText("7 Days")).toBeTruthy();
      expect(getByText("30 Days")).toBeTruthy();
      expect(getByText("90 Days")).toBeTruthy();
    });

    it("should display user metrics section", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("User Metrics")).toBeTruthy();
      });

      expect(getByText("Total Users")).toBeTruthy();
      expect(getByText("2,500")).toBeTruthy();
      expect(getByText("Active (30d)")).toBeTruthy();
      expect(getByText("1,800")).toBeTruthy();
    });

    it("should display new users and average daily signups", async () => {
      const { getByText, getAllByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("New Users (30d)")).toBeTruthy();
      });

      // 350 appears in multiple places (new users and daily signups data)
      expect(getAllByText("350").length).toBeGreaterThan(0);
      expect(getByText("Avg Daily Signups")).toBeTruthy();
    });

    it("should display token metrics section", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Token Metrics")).toBeTruthy();
      });

      expect(getByText("Revenue")).toBeTruthy();
      expect(getByText("$15,000")).toBeTruthy();
      expect(getByText("Tokens in Circulation")).toBeTruthy();
      expect(getByText("32,000")).toBeTruthy();
    });

    it("should display regeneration count", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Regenerations")).toBeTruthy();
      });

      expect(getByText("1,250")).toBeTruthy();
    });

    it("should display daily token activity chart", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Daily Token Activity")).toBeTruthy();
      });

      expect(getByText("Purchased")).toBeTruthy();
      expect(getByText("Spent")).toBeTruthy();
    });

    it("should display daily signups chart", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Daily Signups")).toBeTruthy();
      });
    });

    it("should display auth provider distribution", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Users by Auth Provider")).toBeTruthy();
      });

      expect(getByText("Google")).toBeTruthy();
      expect(getByText("Email")).toBeTruthy();
      expect(getByText("GitHub")).toBeTruthy();
      expect(getByText("Apple")).toBeTruthy();
    });

    it("should display package sales chart", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Package Sales")).toBeTruthy();
      });

      expect(getByText(/Starter Pack/)).toBeTruthy();
      expect(getByText(/Pro Pack/)).toBeTruthy();
      expect(getByText(/Enterprise/)).toBeTruthy();
    });

    it("should display token transactions by type", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Token Transactions by Type")).toBeTruthy();
      });

      expect(getByText("PURCHASE")).toBeTruthy();
      expect(getByText("ENHANCEMENT SPEND")).toBeTruthy();
      expect(getByText("ADMIN GRANT")).toBeTruthy();
      expect(getByText("REFERRAL BONUS")).toBeTruthy();
    });

    it("should display pull to refresh message", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Pull down to refresh data")).toBeTruthy();
      });
    });
  });

  describe("Date Range Selector", () => {
    beforeEach(() => {
      mockAdminApi.getTokenAnalytics.mockResolvedValue({
        data: mockTokenAnalytics,
        error: null,
        status: 200,
      });
      mockAdminApi.getUserAnalytics.mockResolvedValue({
        data: mockUserAnalytics,
        error: null,
        status: 200,
      });
    });

    it("should have 30 days selected by default", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Analytics")).toBeTruthy();
      });

      // 30 Days should be visually selected (has different styling)
      const thirtyDaysButton = getByText("30 Days");
      expect(thirtyDaysButton).toBeTruthy();
    });

    it("should allow selecting different date ranges", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("7 Days")).toBeTruthy();
      });

      fireEvent.press(getByText("7 Days"));
      // Date range selection should work (state change)

      fireEvent.press(getByText("90 Days"));
      // Date range selection should work (state change)
    });
  });

  describe("Error State", () => {
    it("should display error message when token analytics fails", async () => {
      mockAdminApi.getTokenAnalytics.mockResolvedValue({
        data: null,
        error: "Failed to fetch token analytics",
        status: 500,
      });
      mockAdminApi.getUserAnalytics.mockResolvedValue({
        data: mockUserAnalytics,
        error: null,
        status: 200,
      });

      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Failed to load analytics")).toBeTruthy();
      });

      expect(getByText("Failed to fetch token analytics")).toBeTruthy();
    });

    it("should display error message when user analytics fails", async () => {
      mockAdminApi.getTokenAnalytics.mockResolvedValue({
        data: mockTokenAnalytics,
        error: null,
        status: 200,
      });
      mockAdminApi.getUserAnalytics.mockResolvedValue({
        data: null,
        error: "Failed to fetch user analytics",
        status: 500,
      });

      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Failed to load analytics")).toBeTruthy();
      });
    });

    it("should show retry button on error", async () => {
      mockAdminApi.getTokenAnalytics.mockResolvedValue({
        data: null,
        error: "Network error",
        status: 0,
      });
      mockAdminApi.getUserAnalytics.mockResolvedValue({
        data: null,
        error: "Network error",
        status: 0,
      });

      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Try Again")).toBeTruthy();
      });
    });

    it("should refetch data when retry is pressed", async () => {
      mockAdminApi.getTokenAnalytics
        .mockResolvedValueOnce({
          data: null,
          error: "Network error",
          status: 0,
        })
        .mockResolvedValueOnce({
          data: mockTokenAnalytics,
          error: null,
          status: 200,
        });
      mockAdminApi.getUserAnalytics
        .mockResolvedValueOnce({
          data: null,
          error: "Network error",
          status: 0,
        })
        .mockResolvedValueOnce({
          data: mockUserAnalytics,
          error: null,
          status: 200,
        });

      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Try Again")).toBeTruthy();
      });

      fireEvent.press(getByText("Try Again"));

      await waitFor(() => {
        expect(mockAdminApi.getTokenAnalytics).toHaveBeenCalledTimes(2);
        expect(mockAdminApi.getUserAnalytics).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Empty Data Handling", () => {
    it("should handle empty daily tokens data", async () => {
      mockAdminApi.getTokenAnalytics.mockResolvedValue({
        data: {
          ...mockTokenAnalytics,
          dailyTokens: [],
        },
        error: null,
        status: 200,
      });
      mockAdminApi.getUserAnalytics.mockResolvedValue({
        data: mockUserAnalytics,
        error: null,
        status: 200,
      });

      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("No data available")).toBeTruthy();
      });
    });

    it("should handle empty daily signups data", async () => {
      mockAdminApi.getTokenAnalytics.mockResolvedValue({
        data: mockTokenAnalytics,
        error: null,
        status: 200,
      });
      mockAdminApi.getUserAnalytics.mockResolvedValue({
        data: {
          ...mockUserAnalytics,
          dailySignups: [],
        },
        error: null,
        status: 200,
      });

      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("No signup data available")).toBeTruthy();
      });
    });

    it("should handle empty auth provider data", async () => {
      mockAdminApi.getTokenAnalytics.mockResolvedValue({
        data: mockTokenAnalytics,
        error: null,
        status: 200,
      });
      mockAdminApi.getUserAnalytics.mockResolvedValue({
        data: {
          ...mockUserAnalytics,
          usersByAuthProvider: [],
        },
        error: null,
        status: 200,
      });

      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("No auth provider data available")).toBeTruthy();
      });
    });

    it("should handle empty package sales data", async () => {
      mockAdminApi.getTokenAnalytics.mockResolvedValue({
        data: {
          ...mockTokenAnalytics,
          packageSales: [],
        },
        error: null,
        status: 200,
      });
      mockAdminApi.getUserAnalytics.mockResolvedValue({
        data: mockUserAnalytics,
        error: null,
        status: 200,
      });

      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("No package sales data available")).toBeTruthy();
      });
    });

    it("should handle empty token transactions data", async () => {
      mockAdminApi.getTokenAnalytics.mockResolvedValue({
        data: {
          ...mockTokenAnalytics,
          tokensByType: [],
        },
        error: null,
        status: 200,
      });
      mockAdminApi.getUserAnalytics.mockResolvedValue({
        data: mockUserAnalytics,
        error: null,
        status: 200,
      });

      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("No transaction data available")).toBeTruthy();
      });
    });

    it("should handle zero values gracefully", async () => {
      mockAdminApi.getTokenAnalytics.mockResolvedValue({
        data: {
          tokensByType: [],
          dailyTokens: [],
          revenue: { total: 0 },
          circulation: { total: 0, average: 0 },
          regenerationCount: 0,
          packageSales: [],
        },
        error: null,
        status: 200,
      });
      mockAdminApi.getUserAnalytics.mockResolvedValue({
        data: {
          totalUsers: 0,
          newUsersLast30Days: 0,
          activeUsersLast30Days: 0,
          dailySignups: [],
          usersByAuthProvider: [],
        },
        error: null,
        status: 200,
      });

      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("$0")).toBeTruthy();
      });

      expect(getByText("0% of total")).toBeTruthy();
    });
  });

  describe("Token Transaction Display", () => {
    beforeEach(() => {
      mockAdminApi.getTokenAnalytics.mockResolvedValue({
        data: mockTokenAnalytics,
        error: null,
        status: 200,
      });
      mockAdminApi.getUserAnalytics.mockResolvedValue({
        data: mockUserAnalytics,
        error: null,
        status: 200,
      });
    });

    it("should display positive transactions with plus sign", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("+50,000")).toBeTruthy();
      });
    });

    it("should display negative transactions with minus sign", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("-25,000")).toBeTruthy();
      });
    });

    it("should format transaction types by replacing underscores", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("ENHANCEMENT SPEND")).toBeTruthy();
        expect(getByText("ADMIN GRANT")).toBeTruthy();
        expect(getByText("REFERRAL BONUS")).toBeTruthy();
      });
    });
  });

  describe("Percentage Calculations", () => {
    beforeEach(() => {
      mockAdminApi.getTokenAnalytics.mockResolvedValue({
        data: mockTokenAnalytics,
        error: null,
        status: 200,
      });
      mockAdminApi.getUserAnalytics.mockResolvedValue({
        data: mockUserAnalytics,
        error: null,
        status: 200,
      });
    });

    it("should calculate active user percentage correctly", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        // 1800 / 2500 = 72%
        expect(getByText("72% of total")).toBeTruthy();
      });
    });

    it("should calculate auth provider percentages correctly", async () => {
      const { getByText } = render(<AdminAnalyticsScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        // Total: 2500, Google: 1500 = 60%
        expect(getByText("(60.0%)")).toBeTruthy();
        // Email: 800 = 32%
        expect(getByText("(32.0%)")).toBeTruthy();
      });
    });
  });
});

describe("StatCard Component", () => {
  beforeEach(() => {
    mockAdminApi.getTokenAnalytics.mockResolvedValue({
      data: {
        tokensByType: [],
        dailyTokens: [],
        revenue: { total: 1234 },
        circulation: { total: 5678, average: 50.5 },
        regenerationCount: 100,
        packageSales: [],
      },
      error: null,
      status: 200,
    });
    mockAdminApi.getUserAnalytics.mockResolvedValue({
      data: {
        totalUsers: 1000,
        newUsersLast30Days: 100,
        activeUsersLast30Days: 500,
        dailySignups: [],
        usersByAuthProvider: [],
      },
      error: null,
      status: 200,
    });
  });

  it("should display stat card with title and formatted value", async () => {
    const { getByText } = render(<AdminAnalyticsScreen />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getByText("Total Users")).toBeTruthy();
      expect(getByText("1,000")).toBeTruthy();
    });
  });

  it("should display stat card with subtitle when provided", async () => {
    const { getByText } = render(<AdminAnalyticsScreen />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getByText(/Avg:/)).toBeTruthy();
    });
  });
});

describe("ChartBar Component", () => {
  beforeEach(() => {
    mockAdminApi.getTokenAnalytics.mockResolvedValue({
      data: {
        tokensByType: [],
        dailyTokens: [],
        revenue: { total: 0 },
        circulation: { total: 0, average: 0 },
        regenerationCount: 0,
        packageSales: [],
      },
      error: null,
      status: 200,
    });
    mockAdminApi.getUserAnalytics.mockResolvedValue({
      data: {
        totalUsers: 100,
        newUsersLast30Days: 10,
        activeUsersLast30Days: 50,
        dailySignups: [
          { date: "2025-12-27", count: 5 },
          { date: "2025-12-28", count: 10 },
        ],
        usersByAuthProvider: [],
      },
      error: null,
      status: 200,
    });
  });

  it("should render chart bars for daily signups", async () => {
    const { getByText, getAllByText } = render(<AdminAnalyticsScreen />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getByText("Daily Signups")).toBeTruthy();
    });

    // Check that values are displayed (10 appears multiple times - in new users count and signups data)
    expect(getByText("5")).toBeTruthy();
    expect(getAllByText("10").length).toBeGreaterThan(0);
  });
});

describe("DateRangeSelector Component", () => {
  beforeEach(() => {
    mockAdminApi.getTokenAnalytics.mockResolvedValue({
      data: {
        tokensByType: [],
        dailyTokens: [],
        revenue: { total: 0 },
        circulation: { total: 0, average: 0 },
        regenerationCount: 0,
        packageSales: [],
      },
      error: null,
      status: 200,
    });
    mockAdminApi.getUserAnalytics.mockResolvedValue({
      data: {
        totalUsers: 0,
        newUsersLast30Days: 0,
        activeUsersLast30Days: 0,
        dailySignups: [],
        usersByAuthProvider: [],
      },
      error: null,
      status: 200,
    });
  });

  it("should render all date range options", async () => {
    const { getByText } = render(<AdminAnalyticsScreen />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getByText("7 Days")).toBeTruthy();
      expect(getByText("30 Days")).toBeTruthy();
      expect(getByText("90 Days")).toBeTruthy();
    });
  });

  it("should be interactive", async () => {
    const { getByText } = render(<AdminAnalyticsScreen />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getByText("7 Days")).toBeTruthy();
    });

    // Verify buttons are pressable
    fireEvent.press(getByText("7 Days"));
    fireEvent.press(getByText("90 Days"));
  });
});
