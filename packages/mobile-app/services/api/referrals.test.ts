/**
 * Referrals API Service Tests
 * Tests for referral program API functionality
 */

import { apiClient } from "../api-client";
import {
  applyReferralCode,
  getReferralCode,
  getReferralStats,
  getReferredUsers,
  validateReferralCode,
} from "./referrals";

// Mock the api-client module
jest.mock("../api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
  ApiResponse: {},
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("Referrals API Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getReferralCode", () => {
    it("should fetch referral code and URL successfully", async () => {
      const mockResponse = {
        data: {
          code: "ABC123",
          url: "https://spike.land/ref/ABC123",
        },
        error: null,
        status: 200,
      };
      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await getReferralCode();

      expect(mockedApiClient.get).toHaveBeenCalledWith("/api/referral/link");
      expect(result).toEqual(mockResponse);
    });

    it("should handle error response", async () => {
      const mockResponse = {
        data: null,
        error: "Unauthorized",
        status: 401,
      };
      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await getReferralCode();

      expect(result.error).toBe("Unauthorized");
      expect(result.data).toBeNull();
    });
  });

  describe("getReferralStats", () => {
    it("should fetch referral statistics successfully", async () => {
      const mockResponse = {
        data: {
          totalReferrals: 10,
          completedReferrals: 7,
          pendingReferrals: 3,
          tokensEarned: 350,
        },
        error: null,
        status: 200,
      };
      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await getReferralStats();

      expect(mockedApiClient.get).toHaveBeenCalledWith("/api/referral/stats");
      expect(result.data?.totalReferrals).toBe(10);
      expect(result.data?.tokensEarned).toBe(350);
    });

    it("should handle network error", async () => {
      const mockResponse = {
        data: null,
        error: "Network error",
        status: 0,
      };
      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await getReferralStats();

      expect(result.error).toBe("Network error");
    });
  });

  describe("getReferredUsers", () => {
    it("should fetch referred users without pagination params", async () => {
      const mockResponse = {
        data: {
          users: [
            {
              id: "user-1",
              email: "test@example.com",
              name: "Test User",
              status: "COMPLETED",
              createdAt: "2024-01-15T10:00:00Z",
              tokensGranted: 50,
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
        error: null,
        status: 200,
      };
      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await getReferredUsers();

      expect(mockedApiClient.get).toHaveBeenCalledWith("/api/referral/users");
      expect(result.data?.users).toHaveLength(1);
    });

    it("should fetch referred users with pagination params", async () => {
      const mockResponse = {
        data: {
          users: [],
          total: 25,
          page: 2,
          limit: 10,
        },
        error: null,
        status: 200,
      };
      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await getReferredUsers({ page: 2, limit: 10 });

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        "/api/referral/users?page=2&limit=10",
      );
      expect(result.data?.page).toBe(2);
    });

    it("should fetch referred users with only page param", async () => {
      const mockResponse = {
        data: {
          users: [],
          total: 0,
          page: 3,
          limit: 20,
        },
        error: null,
        status: 200,
      };
      mockedApiClient.get.mockResolvedValue(mockResponse);

      await getReferredUsers({ page: 3 });

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        "/api/referral/users?page=3",
      );
    });

    it("should fetch referred users with only limit param", async () => {
      const mockResponse = {
        data: {
          users: [],
          total: 0,
          page: 1,
          limit: 5,
        },
        error: null,
        status: 200,
      };
      mockedApiClient.get.mockResolvedValue(mockResponse);

      await getReferredUsers({ limit: 5 });

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        "/api/referral/users?limit=5",
      );
    });

    it("should handle empty result", async () => {
      const mockResponse = {
        data: {
          users: [],
          total: 0,
          page: 1,
          limit: 20,
        },
        error: null,
        status: 200,
      };
      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await getReferredUsers();

      expect(result.data?.users).toHaveLength(0);
      expect(result.data?.total).toBe(0);
    });
  });

  describe("validateReferralCode", () => {
    it("should validate a valid referral code", async () => {
      const mockResponse = {
        data: {
          valid: true,
          referrerName: "John Doe",
          bonusTokens: 50,
        },
        error: null,
        status: 200,
      };
      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await validateReferralCode("ABC123");

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        "/api/referral/validate",
        { code: "ABC123" },
      );
      expect(result.data?.valid).toBe(true);
      expect(result.data?.referrerName).toBe("John Doe");
    });

    it("should handle invalid referral code", async () => {
      const mockResponse = {
        data: {
          valid: false,
          bonusTokens: 0,
        },
        error: null,
        status: 200,
      };
      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await validateReferralCode("INVALID");

      expect(result.data?.valid).toBe(false);
    });

    it("should handle validation error", async () => {
      const mockResponse = {
        data: null,
        error: "Invalid code format",
        status: 400,
      };
      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await validateReferralCode("!!!");

      expect(result.error).toBe("Invalid code format");
    });
  });

  describe("applyReferralCode", () => {
    it("should apply referral code successfully", async () => {
      const mockResponse = {
        data: {
          success: true,
          tokensGranted: 50,
        },
        error: null,
        status: 200,
      };
      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await applyReferralCode("ABC123");

      expect(mockedApiClient.post).toHaveBeenCalledWith("/api/referral/apply", {
        code: "ABC123",
      });
      expect(result.data?.success).toBe(true);
      expect(result.data?.tokensGranted).toBe(50);
    });

    it("should handle already used referral code", async () => {
      const mockResponse = {
        data: null,
        error: "Referral code already used",
        status: 409,
      };
      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await applyReferralCode("USED123");

      expect(result.error).toBe("Referral code already used");
      expect(result.status).toBe(409);
    });

    it("should handle expired referral code", async () => {
      const mockResponse = {
        data: null,
        error: "Referral code expired",
        status: 410,
      };
      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await applyReferralCode("EXPIRED");

      expect(result.error).toBe("Referral code expired");
    });
  });
});
