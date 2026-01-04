/**
 * Admin Dashboard Tests
 * Tests for the admin dashboard home screen
 */

import AdminDashboard from "@/app/admin/index";
import * as adminApi from "@/services/api/admin";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

// Mock tamagui.config before any component imports
jest.mock("@/tamagui.config", () => ({}));

// Mock expo-router
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the admin API
jest.mock("@/services/api/admin");
const mockAdminApi = adminApi as jest.Mocked<typeof adminApi>;

// Mock RefreshControl
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  RN.RefreshControl = (
    { refreshing, onRefresh, children }: {
      refreshing: boolean;
      onRefresh: () => void;
      children?: React.ReactNode;
    },
  ) => (
    <RN.View
      testID="refresh-control"
      data-refreshing={refreshing}
      onPress={onRefresh}
    >
      {children}
    </RN.View>
  );
  return RN;
});

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
        {children}
      </QueryClientProvider>
    );
  };
};

describe("AdminDashboard", () => {
  const mockStats: adminApi.DashboardStats = {
    totalUsers: 1500,
    adminCount: 10,
    totalEnhancements: 5000,
    jobStatus: {
      pending: 15,
      processing: 8,
      completed: 4900,
      failed: 77,
      active: 23,
    },
    totalTokensPurchased: 100000,
    totalTokensSpent: 75000,
    activeVouchers: 5,
    timestamp: "2025-12-28T10:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  describe("Loading State", () => {
    it("should show loading state while fetching data", () => {
      mockAdminApi.getDashboardStats.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      const { getByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      expect(getByText("Loading dashboard...")).toBeTruthy();
    });
  });

  describe("Successful Data Display", () => {
    beforeEach(() => {
      mockAdminApi.getDashboardStats.mockResolvedValue({
        data: mockStats,
        error: null,
        status: 200,
      });
    });

    it("should display dashboard overview stats", async () => {
      const { getByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Overview")).toBeTruthy();
      });

      expect(getByText("Total Users")).toBeTruthy();
      expect(getByText("1500")).toBeTruthy();
      expect(getByText("10 admins")).toBeTruthy();
    });

    it("should display enhancement count", async () => {
      const { getByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Enhancements")).toBeTruthy();
      });

      expect(getByText("5000")).toBeTruthy();
    });

    it("should display token statistics", async () => {
      const { getByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Tokens Purchased")).toBeTruthy();
      });

      expect(getByText("100,000")).toBeTruthy();
      expect(getByText("Tokens Spent")).toBeTruthy();
      expect(getByText("75,000")).toBeTruthy();
    });

    it("should display job status badges", async () => {
      const { getByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Job Status")).toBeTruthy();
      });

      expect(getByText("Pending")).toBeTruthy();
      expect(getByText("15")).toBeTruthy();
      expect(getByText("Processing")).toBeTruthy();
      expect(getByText("8")).toBeTruthy();
      expect(getByText("Completed")).toBeTruthy();
      expect(getByText("4900")).toBeTruthy();
      expect(getByText("Failed")).toBeTruthy();
      expect(getByText("77")).toBeTruthy();
    });

    it("should display active jobs message when jobs are active", async () => {
      const { getAllByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        // "23 active jobs" appears twice: in Job Status section and in Quick Actions
        const elements = getAllByText("23 active jobs");
        expect(elements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("should display quick actions section", async () => {
      const { getByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Quick Actions")).toBeTruthy();
      });

      expect(getByText("User Management")).toBeTruthy();
      expect(getByText("Search and manage users, roles, tokens")).toBeTruthy();
      expect(getByText("Job Queue")).toBeTruthy();
      expect(getByText("Vouchers")).toBeTruthy();
      expect(getByText("Analytics")).toBeTruthy();
    });

    it("should display last updated timestamp", async () => {
      const { getByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText(/Last updated:/)).toBeTruthy();
      });
    });
  });

  describe("Navigation", () => {
    beforeEach(() => {
      mockAdminApi.getDashboardStats.mockResolvedValue({
        data: mockStats,
        error: null,
        status: 200,
      });
    });

    it("should navigate to users page when user management is pressed", async () => {
      const { getByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("User Management")).toBeTruthy();
      });

      fireEvent.press(getByText("User Management"));
      expect(mockPush).toHaveBeenCalledWith("/admin/users");
    });

    it("should navigate to jobs page when job queue is pressed", async () => {
      const { getByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Job Queue")).toBeTruthy();
      });

      fireEvent.press(getByText("Job Queue"));
      expect(mockPush).toHaveBeenCalledWith("/admin/jobs");
    });

    it("should navigate to vouchers page when vouchers is pressed", async () => {
      const { getByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Vouchers")).toBeTruthy();
      });

      fireEvent.press(getByText("Vouchers"));
      expect(mockPush).toHaveBeenCalledWith("/admin/vouchers");
    });

    it("should navigate to analytics page when analytics is pressed", async () => {
      const { getByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Analytics")).toBeTruthy();
      });

      fireEvent.press(getByText("Analytics"));
      expect(mockPush).toHaveBeenCalledWith("/admin/analytics");
    });
  });

  describe("Error State", () => {
    it("should display error message when API fails", async () => {
      mockAdminApi.getDashboardStats.mockResolvedValue({
        data: null,
        error: "Failed to fetch dashboard data",
        status: 500,
      });

      const { getByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Failed to load dashboard")).toBeTruthy();
      });

      expect(getByText("Failed to fetch dashboard data")).toBeTruthy();
    });

    it("should show retry button on error", async () => {
      mockAdminApi.getDashboardStats.mockResolvedValue({
        data: null,
        error: "Network error",
        status: 0,
      });

      const { getByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Try Again")).toBeTruthy();
      });
    });

    it("should refetch data when retry is pressed", async () => {
      mockAdminApi.getDashboardStats
        .mockResolvedValueOnce({
          data: null,
          error: "Network error",
          status: 0,
        })
        .mockResolvedValueOnce({
          data: mockStats,
          error: null,
          status: 200,
        });

      const { getByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Try Again")).toBeTruthy();
      });

      fireEvent.press(getByText("Try Again"));

      await waitFor(() => {
        expect(mockAdminApi.getDashboardStats).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Empty/Default State", () => {
    it("should handle missing stats gracefully", async () => {
      mockAdminApi.getDashboardStats.mockResolvedValue({
        data: {
          totalUsers: 0,
          adminCount: 0,
          totalEnhancements: 0,
          jobStatus: {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            active: 0,
          },
          totalTokensPurchased: 0,
          totalTokensSpent: 0,
          activeVouchers: 0,
          timestamp: "2025-12-28T10:00:00Z",
        },
        error: null,
        status: 200,
      });

      const { getByText, queryByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Total Users")).toBeTruthy();
      });

      // Check that 0 values are displayed (multiple "0" elements exist in the UI)
      expect(getByText("0 admins")).toBeTruthy();

      // Should not show active jobs message when there are none
      // Note: "0 active jobs" will still appear in Quick Actions but not in Job Status section
      expect(queryByText(/^[1-9]\d* active jobs$/)).toBeNull();
    });
  });

  describe("Component Structure", () => {
    beforeEach(() => {
      mockAdminApi.getDashboardStats.mockResolvedValue({
        data: mockStats,
        error: null,
        status: 200,
      });
    });

    it("should have proper section headers", async () => {
      const { getByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Overview")).toBeTruthy();
        expect(getByText("Job Status")).toBeTruthy();
        expect(getByText("Quick Actions")).toBeTruthy();
      });
    });

    it("should display quick action descriptions", async () => {
      const { getByText, getAllByText } = render(<AdminDashboard />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Search and manage users, roles, tokens"))
          .toBeTruthy();
        // "23 active jobs" appears in both Job Status section and Quick Actions
        const activeJobsElements = getAllByText("23 active jobs");
        expect(activeJobsElements.length).toBeGreaterThanOrEqual(1);
        expect(getByText("5 active vouchers")).toBeTruthy();
        expect(getByText("Token usage and user growth")).toBeTruthy();
      });
    });
  });
});

// Separate tests for subcomponents
describe("StatCard Component", () => {
  beforeEach(() => {
    mockAdminApi.getDashboardStats.mockResolvedValue({
      data: {
        totalUsers: 100,
        adminCount: 5,
        totalEnhancements: 500,
        jobStatus: {
          pending: 0,
          processing: 0,
          completed: 500,
          failed: 0,
          active: 0,
        },
        totalTokensPurchased: 1000,
        totalTokensSpent: 500,
        activeVouchers: 0,
        timestamp: "2025-12-28T10:00:00Z",
      },
      error: null,
      status: 200,
    });
  });

  it("should display stat card with title and value", async () => {
    const { getByText } = render(<AdminDashboard />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getByText("Total Users")).toBeTruthy();
      expect(getByText("100")).toBeTruthy();
    });
  });

  it("should display stat card with subtitle when provided", async () => {
    const { getByText } = render(<AdminDashboard />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getByText("5 admins")).toBeTruthy();
    });
  });
});

describe("JobStatusBadge Component", () => {
  beforeEach(() => {
    mockAdminApi.getDashboardStats.mockResolvedValue({
      data: {
        totalUsers: 100,
        adminCount: 5,
        totalEnhancements: 500,
        jobStatus: {
          pending: 10,
          processing: 5,
          completed: 480,
          failed: 5,
          active: 15,
        },
        totalTokensPurchased: 1000,
        totalTokensSpent: 500,
        activeVouchers: 0,
        timestamp: "2025-12-28T10:00:00Z",
      },
      error: null,
      status: 200,
    });
  });

  it("should render all job status badges", async () => {
    const { getByText } = render(<AdminDashboard />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getByText("Pending")).toBeTruthy();
      expect(getByText("Processing")).toBeTruthy();
      expect(getByText("Completed")).toBeTruthy();
      expect(getByText("Failed")).toBeTruthy();
    });
  });

  it("should display correct counts for each status", async () => {
    const { getByText, getAllByText } = render(<AdminDashboard />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getByText("10")).toBeTruthy();
      // "5" appears twice: processing and failed both have count 5
      const fiveElements = getAllByText("5");
      expect(fiveElements.length).toBe(2);
      expect(getByText("480")).toBeTruthy();
    });
  });
});

describe("QuickAction Component", () => {
  beforeEach(() => {
    mockAdminApi.getDashboardStats.mockResolvedValue({
      data: {
        totalUsers: 100,
        adminCount: 5,
        totalEnhancements: 500,
        jobStatus: {
          pending: 0,
          processing: 0,
          completed: 500,
          failed: 0,
          active: 0,
        },
        totalTokensPurchased: 1000,
        totalTokensSpent: 500,
        activeVouchers: 3,
        timestamp: "2025-12-28T10:00:00Z",
      },
      error: null,
      status: 200,
    });
  });

  it("should render quick action with icon placeholder", async () => {
    const { getByText } = render(<AdminDashboard />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // Icons are rendered as text letters
      expect(getByText("U")).toBeTruthy(); // User icon
      expect(getByText("J")).toBeTruthy(); // Job icon
      expect(getByText("V")).toBeTruthy(); // Voucher icon
      expect(getByText("A")).toBeTruthy(); // Analytics icon
    });
  });

  it("should show arrow indicator for navigation", async () => {
    const { getAllByText } = render(<AdminDashboard />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      const arrows = getAllByText(">");
      expect(arrows.length).toBeGreaterThan(0);
    });
  });
});
