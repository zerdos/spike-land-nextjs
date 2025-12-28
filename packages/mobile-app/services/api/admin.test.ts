/**
 * Admin API Service Tests
 * Tests for all admin-related API calls
 */

import { apiClient } from "../api-client";
import {
  adjustUserTokens,
  createVoucher,
  deleteUser,
  deleteVoucher,
  getDashboardStats,
  getJobDetails,
  getJobs,
  getTokenAnalytics,
  getUser,
  getUserAnalytics,
  getUserEnhancements,
  getUsers,
  getVouchers,
  retryJob,
  updateUserRole,
  updateVoucherStatus,
} from "./admin";

// Mock the apiClient
jest.mock("../api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("Admin API Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Dashboard API Tests
  // ============================================================================
  describe("getDashboardStats", () => {
    it("should fetch dashboard statistics", async () => {
      const mockStats = {
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
        totalTokensPurchased: 10000,
        totalTokensSpent: 5000,
        activeVouchers: 3,
        timestamp: "2025-12-28T10:00:00Z",
      };

      mockApiClient.get.mockResolvedValue({
        data: mockStats,
        error: null,
        status: 200,
      });

      const result = await getDashboardStats();

      expect(mockApiClient.get).toHaveBeenCalledWith("/api/admin/dashboard");
      expect(result.data).toEqual(mockStats);
      expect(result.error).toBeNull();
    });

    it("should handle API errors", async () => {
      mockApiClient.get.mockResolvedValue({
        data: null,
        error: "Unauthorized",
        status: 401,
      });

      const result = await getDashboardStats();

      expect(result.data).toBeNull();
      expect(result.error).toBe("Unauthorized");
    });
  });

  // ============================================================================
  // Users API Tests
  // ============================================================================
  describe("getUsers", () => {
    const mockUsers = {
      users: [
        {
          id: "user-1",
          email: "test@example.com",
          name: "Test User",
          image: null,
          role: "USER" as const,
          tokenBalance: 100,
          imageCount: 10,
          createdAt: "2025-01-01T00:00:00Z",
        },
      ],
    };

    it("should fetch all users without search", async () => {
      mockApiClient.get.mockResolvedValue({
        data: mockUsers,
        error: null,
        status: 200,
      });

      const result = await getUsers();

      expect(mockApiClient.get).toHaveBeenCalledWith("/api/admin/users");
      expect(result.data).toEqual(mockUsers);
    });

    it("should fetch users with search query", async () => {
      mockApiClient.get.mockResolvedValue({
        data: mockUsers,
        error: null,
        status: 200,
      });

      const result = await getUsers("test@example.com");

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/admin/users?search=test%40example.com",
      );
      expect(result.data).toEqual(mockUsers);
    });

    it("should handle empty results", async () => {
      mockApiClient.get.mockResolvedValue({
        data: { users: [] },
        error: null,
        status: 200,
      });

      const result = await getUsers("nonexistent");

      expect(result.data?.users).toEqual([]);
    });
  });

  describe("getUser", () => {
    it("should fetch user details by ID", async () => {
      const mockUser = {
        user: {
          id: "user-1",
          email: "test@example.com",
          name: "Test User",
          image: null,
          role: "USER" as const,
          tokenBalance: 100,
          imageCount: 10,
          createdAt: "2025-01-01T00:00:00Z",
          authProviders: ["google"],
          recentTransactions: [],
        },
      };

      mockApiClient.get.mockResolvedValue({
        data: mockUser,
        error: null,
        status: 200,
      });

      const result = await getUser("user-1");

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/admin/users?userId=user-1",
      );
      expect(result.data).toEqual(mockUser);
    });

    it("should handle user not found", async () => {
      mockApiClient.get.mockResolvedValue({
        data: null,
        error: "User not found",
        status: 404,
      });

      const result = await getUser("nonexistent");

      expect(result.data).toBeNull();
      expect(result.error).toBe("User not found");
    });
  });

  describe("updateUserRole", () => {
    it("should update user role successfully", async () => {
      mockApiClient.patch.mockResolvedValue({
        data: { success: true, role: "ADMIN" as const },
        error: null,
        status: 200,
      });

      const result = await updateUserRole("user-1", "ADMIN");

      expect(mockApiClient.patch).toHaveBeenCalledWith("/api/admin/users", {
        userId: "user-1",
        action: "setRole",
        value: "ADMIN",
      });
      expect(result.data?.success).toBe(true);
      expect(result.data?.role).toBe("ADMIN");
    });
  });

  describe("adjustUserTokens", () => {
    it("should add tokens to user balance", async () => {
      mockApiClient.patch.mockResolvedValue({
        data: { success: true, newBalance: 200 },
        error: null,
        status: 200,
      });

      const result = await adjustUserTokens("user-1", 100);

      expect(mockApiClient.patch).toHaveBeenCalledWith("/api/admin/users", {
        userId: "user-1",
        action: "adjustTokens",
        value: "100",
      });
      expect(result.data?.newBalance).toBe(200);
    });

    it("should subtract tokens from user balance", async () => {
      mockApiClient.patch.mockResolvedValue({
        data: { success: true, newBalance: 50 },
        error: null,
        status: 200,
      });

      const result = await adjustUserTokens("user-1", -50);

      expect(mockApiClient.patch).toHaveBeenCalledWith("/api/admin/users", {
        userId: "user-1",
        action: "adjustTokens",
        value: "-50",
      });
      expect(result.data?.newBalance).toBe(50);
    });
  });

  describe("deleteUser", () => {
    it("should delete user and return deleted data counts", async () => {
      const mockResponse = {
        success: true,
        deletedData: {
          albums: 5,
          images: 20,
          enhancementJobs: 15,
          tokenBalance: 100,
        },
      };

      mockApiClient.delete.mockResolvedValue({
        data: mockResponse,
        error: null,
        status: 200,
      });

      const result = await deleteUser("user-1");

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        "/api/admin/users?userId=user-1",
      );
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe("getUserEnhancements", () => {
    it("should fetch user enhancement history with pagination", async () => {
      const mockResponse = {
        enhancements: [
          {
            id: "job-1",
            status: "COMPLETED" as const,
            tier: "TIER_1K",
            createdAt: "2025-01-01T00:00:00Z",
            completedAt: "2025-01-01T00:01:00Z",
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
        },
      };

      mockApiClient.get.mockResolvedValue({
        data: mockResponse,
        error: null,
        status: 200,
      });

      const result = await getUserEnhancements("user-1", 1, 20);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/admin/users/user-1/enhancements?page=1&limit=20",
      );
      expect(result.data).toEqual(mockResponse);
    });
  });

  // ============================================================================
  // Jobs API Tests
  // ============================================================================
  describe("getJobs", () => {
    const mockJobsResponse = {
      jobs: [
        {
          id: "job-1",
          source: "enhancement" as const,
          status: "COMPLETED" as const,
          tier: "TIER_1K" as const,
          tokensCost: 2,
          prompt: "Enhance this image",
          inputUrl: "https://example.com/input.jpg",
          outputUrl: "https://example.com/output.jpg",
          outputWidth: 1024,
          outputHeight: 1024,
          outputSizeBytes: 500000,
          errorMessage: null,
          userId: "user-1",
          userEmail: "test@example.com",
          userName: "Test User",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:01:00Z",
          processingStartedAt: "2025-01-01T00:00:30Z",
          processingCompletedAt: "2025-01-01T00:01:00Z",
        },
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      },
      statusCounts: { COMPLETED: 1 },
      typeCounts: { all: 1, enhancement: 1, mcp: 0 },
    };

    it("should fetch all jobs without filters", async () => {
      mockApiClient.get.mockResolvedValue({
        data: mockJobsResponse,
        error: null,
        status: 200,
      });

      const result = await getJobs();

      expect(mockApiClient.get).toHaveBeenCalledWith("/api/admin/jobs");
      expect(result.data).toEqual(mockJobsResponse);
    });

    it("should fetch jobs with status filter", async () => {
      mockApiClient.get.mockResolvedValue({
        data: mockJobsResponse,
        error: null,
        status: 200,
      });

      const result = await getJobs({ status: "COMPLETED" });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/admin/jobs?status=COMPLETED",
      );
      expect(result.data).toEqual(mockJobsResponse);
    });

    it("should fetch jobs with type filter", async () => {
      mockApiClient.get.mockResolvedValue({
        data: mockJobsResponse,
        error: null,
        status: 200,
      });

      const result = await getJobs({ type: "enhancement" });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/admin/jobs?type=enhancement",
      );
    });

    it("should fetch jobs with multiple filters", async () => {
      mockApiClient.get.mockResolvedValue({
        data: mockJobsResponse,
        error: null,
        status: 200,
      });

      const result = await getJobs({
        status: "FAILED",
        type: "mcp",
        page: 2,
        limit: 25,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/admin/jobs?status=FAILED&type=mcp&page=2&limit=25",
      );
    });
  });

  describe("retryJob", () => {
    it("should retry a failed job", async () => {
      const mockResponse = {
        success: true,
        newJobId: "job-2",
        source: "enhancement" as const,
        tokensCost: 2,
      };

      mockApiClient.post.mockResolvedValue({
        data: mockResponse,
        error: null,
        status: 200,
      });

      const result = await retryJob("job-1");

      expect(mockApiClient.post).toHaveBeenCalledWith(
        "/api/admin/jobs/job-1/rerun",
      );
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe("getJobDetails", () => {
    it("should fetch job details by ID", async () => {
      const mockJob = {
        job: {
          id: "job-1",
          source: "enhancement" as const,
          status: "COMPLETED" as const,
          tier: "TIER_1K" as const,
          tokensCost: 2,
          prompt: "Enhance this image",
          inputUrl: "https://example.com/input.jpg",
          outputUrl: "https://example.com/output.jpg",
          outputWidth: 1024,
          outputHeight: 1024,
          outputSizeBytes: 500000,
          errorMessage: null,
          userId: "user-1",
          userEmail: "test@example.com",
          userName: "Test User",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:01:00Z",
          processingStartedAt: null,
          processingCompletedAt: null,
        },
      };

      mockApiClient.get.mockResolvedValue({
        data: mockJob,
        error: null,
        status: 200,
      });

      const result = await getJobDetails("job-1");

      expect(mockApiClient.get).toHaveBeenCalledWith("/api/admin/jobs/job-1");
      expect(result.data).toEqual(mockJob);
    });
  });

  // ============================================================================
  // Vouchers API Tests
  // ============================================================================
  describe("getVouchers", () => {
    it("should fetch all vouchers", async () => {
      const mockVouchers = {
        vouchers: [
          {
            id: "voucher-1",
            code: "WELCOME50",
            type: "FIXED" as const,
            value: 50,
            maxUses: 100,
            currentUses: 10,
            expiresAt: "2025-12-31T23:59:59Z",
            status: "ACTIVE" as const,
            createdAt: "2025-01-01T00:00:00Z",
            redemptions: 10,
          },
        ],
      };

      mockApiClient.get.mockResolvedValue({
        data: mockVouchers,
        error: null,
        status: 200,
      });

      const result = await getVouchers();

      expect(mockApiClient.get).toHaveBeenCalledWith("/api/admin/vouchers");
      expect(result.data).toEqual(mockVouchers);
    });
  });

  describe("createVoucher", () => {
    it("should create a new fixed token voucher", async () => {
      const voucherData = {
        code: "NEWVOUCHER",
        type: "FIXED" as const,
        value: 100,
        maxUses: 50,
      };

      const mockResponse = {
        voucher: {
          id: "voucher-new",
          ...voucherData,
          currentUses: 0,
          expiresAt: null,
          status: "ACTIVE" as const,
          createdAt: "2025-12-28T10:00:00Z",
          redemptions: 0,
        },
      };

      mockApiClient.post.mockResolvedValue({
        data: mockResponse,
        error: null,
        status: 201,
      });

      const result = await createVoucher(voucherData);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        "/api/admin/vouchers",
        voucherData,
      );
      expect(result.data?.voucher.code).toBe("NEWVOUCHER");
    });

    it("should create a percentage voucher", async () => {
      const voucherData = {
        code: "PERCENT20",
        type: "PERCENTAGE" as const,
        value: 20,
        expiresAt: "2025-12-31T23:59:59Z",
      };

      mockApiClient.post.mockResolvedValue({
        data: {
          voucher: {
            id: "voucher-percent",
            ...voucherData,
            maxUses: null,
            currentUses: 0,
            status: "ACTIVE" as const,
            createdAt: "2025-12-28T10:00:00Z",
            redemptions: 0,
          },
        },
        error: null,
        status: 201,
      });

      const result = await createVoucher(voucherData);

      expect(result.data?.voucher.type).toBe("PERCENTAGE");
      expect(result.data?.voucher.value).toBe(20);
    });
  });

  describe("updateVoucherStatus", () => {
    it("should disable an active voucher", async () => {
      mockApiClient.patch.mockResolvedValue({
        data: { voucher: { id: "voucher-1", status: "DISABLED" as const } },
        error: null,
        status: 200,
      });

      const result = await updateVoucherStatus("voucher-1", "DISABLED");

      expect(mockApiClient.patch).toHaveBeenCalledWith("/api/admin/vouchers", {
        id: "voucher-1",
        status: "DISABLED",
      });
      expect(result.data?.voucher.status).toBe("DISABLED");
    });

    it("should enable a disabled voucher", async () => {
      mockApiClient.patch.mockResolvedValue({
        data: { voucher: { id: "voucher-1", status: "ACTIVE" as const } },
        error: null,
        status: 200,
      });

      const result = await updateVoucherStatus("voucher-1", "ACTIVE");

      expect(result.data?.voucher.status).toBe("ACTIVE");
    });
  });

  describe("deleteVoucher", () => {
    it("should delete a voucher", async () => {
      mockApiClient.delete.mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      const result = await deleteVoucher("voucher-1");

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        "/api/admin/vouchers?id=voucher-1",
      );
      expect(result.data?.success).toBe(true);
    });
  });

  // ============================================================================
  // Analytics API Tests
  // ============================================================================
  describe("getTokenAnalytics", () => {
    it("should fetch token analytics", async () => {
      const mockAnalytics = {
        tokensByType: [
          { type: "PURCHASE", total: 10000 },
          { type: "ENHANCEMENT_SPEND", total: -5000 },
        ],
        dailyTokens: [
          { date: "2025-12-27", purchased: 500, spent: 200 },
          { date: "2025-12-28", purchased: 300, spent: 150 },
        ],
        revenue: { total: 1500 },
        circulation: { total: 5000, average: 50 },
        regenerationCount: 25,
        packageSales: [
          { name: "Starter", tokens: 100, sales: 50 },
          { name: "Pro", tokens: 500, sales: 20 },
        ],
      };

      mockApiClient.get.mockResolvedValue({
        data: mockAnalytics,
        error: null,
        status: 200,
      });

      const result = await getTokenAnalytics();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/admin/analytics/tokens",
      );
      expect(result.data).toEqual(mockAnalytics);
    });
  });

  describe("getUserAnalytics", () => {
    it("should fetch user analytics", async () => {
      const mockAnalytics = {
        totalUsers: 1000,
        newUsersLast30Days: 150,
        activeUsersLast30Days: 500,
        dailySignups: [
          { date: "2025-12-27", count: 10 },
          { date: "2025-12-28", count: 15 },
        ],
        usersByAuthProvider: [
          { provider: "google", count: 600 },
          { provider: "email", count: 400 },
        ],
      };

      mockApiClient.get.mockResolvedValue({
        data: mockAnalytics,
        error: null,
        status: 200,
      });

      const result = await getUserAnalytics();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/admin/analytics/users",
      );
      expect(result.data).toEqual(mockAnalytics);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================
  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      mockApiClient.get.mockResolvedValue({
        data: null,
        error: "Network error",
        status: 0,
      });

      const result = await getDashboardStats();

      expect(result.data).toBeNull();
      expect(result.error).toBe("Network error");
      expect(result.status).toBe(0);
    });

    it("should handle server errors", async () => {
      mockApiClient.get.mockResolvedValue({
        data: null,
        error: "Internal server error",
        status: 500,
      });

      const result = await getUsers();

      expect(result.data).toBeNull();
      expect(result.error).toBe("Internal server error");
      expect(result.status).toBe(500);
    });

    it("should handle unauthorized access", async () => {
      mockApiClient.get.mockResolvedValue({
        data: null,
        error: "Admin access required",
        status: 403,
      });

      const result = await getVouchers();

      expect(result.data).toBeNull();
      expect(result.error).toBe("Admin access required");
      expect(result.status).toBe(403);
    });
  });
});
