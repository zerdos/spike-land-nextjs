/**
 * Auth Service Tests
 * Tests for password reset and email verification methods
 */

import { apiClient } from "./api-client";
import { authService } from "./auth";

// Mock the api-client
jest.mock("./api-client", () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
    setAuthToken: jest.fn(),
    clearAuthToken: jest.fn(),
  },
}));

// Mock storage
jest.mock("./storage", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-auth-session
jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "spikeland://auth/callback"),
  AuthRequest: jest.fn().mockImplementation(() => ({
    promptAsync: jest.fn().mockResolvedValue({ type: "success", params: { code: "test-code" } }),
  })),
  ResponseType: {
    Code: "code",
    Token: "token",
  },
}));

// Mock expo-web-browser
jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("requestPasswordReset", () => {
    it("should successfully request password reset", async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: "Reset email sent" },
        error: null,
        status: 200,
      });

      const result = await authService.requestPasswordReset("test@example.com");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Reset email sent");
      expect(mockApiClient.post).toHaveBeenCalledWith(
        "/api/auth/forgot-password",
        { email: "test@example.com" },
      );
    });

    it("should use default message when server returns no message", async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: {},
        error: null,
        status: 200,
      });

      const result = await authService.requestPasswordReset("test@example.com");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Password reset email sent");
    });

    it("should handle API error response", async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: null,
        error: "Email not found",
        status: 404,
      });

      const result = await authService.requestPasswordReset("unknown@example.com");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email not found");
    });

    it("should handle network exception", async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error("Network error"));

      const result = await authService.requestPasswordReset("test@example.com");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("should handle non-Error exception", async () => {
      mockApiClient.post.mockRejectedValueOnce("Unknown error");

      const result = await authService.requestPasswordReset("test@example.com");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to send reset email");
    });
  });

  describe("resetPassword", () => {
    it("should successfully reset password", async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: "Password updated successfully" },
        error: null,
        status: 200,
      });

      const result = await authService.resetPassword("valid-token", "NewPassword123");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Password updated successfully");
      expect(mockApiClient.post).toHaveBeenCalledWith(
        "/api/auth/reset-password",
        { token: "valid-token", newPassword: "NewPassword123" },
      );
    });

    it("should use default message when server returns no message", async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: {},
        error: null,
        status: 200,
      });

      const result = await authService.resetPassword("valid-token", "NewPassword123");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Password reset successfully");
    });

    it("should handle invalid token error", async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: null,
        error: "Invalid or expired token",
        status: 400,
      });

      const result = await authService.resetPassword("invalid-token", "NewPassword123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid or expired token");
    });

    it("should handle network exception", async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error("Connection failed"));

      const result = await authService.resetPassword("token", "password");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Connection failed");
    });

    it("should handle non-Error exception", async () => {
      mockApiClient.post.mockRejectedValueOnce({ code: 500 });

      const result = await authService.resetPassword("token", "password");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to reset password");
    });
  });

  describe("verifyEmail", () => {
    it("should successfully verify email", async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: "Email verified" },
        error: null,
        status: 200,
      });

      const result = await authService.verifyEmail("valid-token");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Email verified");
      expect(mockApiClient.post).toHaveBeenCalledWith(
        "/api/auth/verify-email",
        { token: "valid-token" },
      );
    });

    it("should use default message when server returns no message", async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: {},
        error: null,
        status: 200,
      });

      const result = await authService.verifyEmail("valid-token");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Email verified successfully");
    });

    it("should handle invalid verification token", async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: null,
        error: "Verification link expired",
        status: 400,
      });

      const result = await authService.verifyEmail("expired-token");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Verification link expired");
    });

    it("should handle network exception", async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error("Server unavailable"));

      const result = await authService.verifyEmail("token");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Server unavailable");
    });

    it("should handle non-Error exception", async () => {
      mockApiClient.post.mockRejectedValueOnce(null);

      const result = await authService.verifyEmail("token");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to verify email");
    });
  });

  describe("resendVerification", () => {
    it("should successfully resend verification email", async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: "Verification email resent" },
        error: null,
        status: 200,
      });

      const result = await authService.resendVerification("user@example.com");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Verification email resent");
      expect(mockApiClient.post).toHaveBeenCalledWith(
        "/api/auth/resend-verification",
        { email: "user@example.com" },
      );
    });

    it("should use default message when server returns no message", async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: {},
        error: null,
        status: 200,
      });

      const result = await authService.resendVerification("user@example.com");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Verification email sent");
    });

    it("should handle email already verified error", async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: null,
        error: "Email already verified",
        status: 400,
      });

      const result = await authService.resendVerification("verified@example.com");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email already verified");
    });

    it("should handle network exception", async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error("Request timeout"));

      const result = await authService.resendVerification("user@example.com");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Request timeout");
    });

    it("should handle non-Error exception", async () => {
      mockApiClient.post.mockRejectedValueOnce(undefined);

      const result = await authService.resendVerification("user@example.com");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to send verification email");
    });
  });
});
