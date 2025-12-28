/**
 * Auth Store Tests
 * Comprehensive tests for authentication state management
 */

import type { User } from "@spike-npm-land/shared";
import { act, renderHook } from "@testing-library/react-native";

import { type AuthProvider, type AuthResult, authService } from "../services/auth";
import { useAuthStore } from "./auth-store";

// Mock the auth service
jest.mock("../services/auth", () => ({
  authService: {
    getCurrentUser: jest.fn(),
    refreshSession: jest.fn(),
    signInWithProvider: jest.fn(),
    signInWithCredentials: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
  },
  AuthProvider: {},
}));

// ============================================================================
// Test Fixtures
// ============================================================================

const mockUser: User = {
  id: "test-user-id",
  name: "Test User",
  email: "test@example.com",
  emailVerified: new Date("2024-01-01T00:00:00.000Z"),
  image: "https://example.com/avatar.jpg",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  role: "USER",
  referralCode: "TEST123",
  referralCount: 5,
};

const successAuthResult: AuthResult = {
  success: true,
  user: mockUser,
};

const errorAuthResult: AuthResult = {
  success: false,
  error: "Authentication failed",
};

// ============================================================================
// Helper Functions
// ============================================================================

function resetStore() {
  const { result } = renderHook(() => useAuthStore());
  act(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      emailVerified: false,
      passwordResetLoading: false,
      verificationLoading: false,
    });
  });
  return result;
}

// ============================================================================
// Tests
// ============================================================================

describe("useAuthStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe("initialize", () => {
    it("should set authenticated state when user exists and session is valid", async () => {
      (authService.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (authService.refreshSession as jest.Mock).mockResolvedValue(successAuthResult);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(authService.getCurrentUser).toHaveBeenCalled();
      expect(authService.refreshSession).toHaveBeenCalled();
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should set unauthenticated state when no user exists", async () => {
      (authService.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(authService.getCurrentUser).toHaveBeenCalled();
      expect(authService.refreshSession).not.toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should set unauthenticated state when session refresh fails", async () => {
      (authService.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (authService.refreshSession as jest.Mock).mockResolvedValue(errorAuthResult);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle initialization error", async () => {
      const error = new Error("Network error");
      (authService.getCurrentUser as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe("Network error");
    });

    it("should handle non-Error objects in initialization catch block", async () => {
      (authService.getCurrentUser as jest.Mock).mockRejectedValue("String error");

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.error).toBe("Failed to initialize");
    });
  });

  describe("signInWithProvider", () => {
    it("should sign in successfully with Google provider", async () => {
      (authService.signInWithProvider as jest.Mock).mockResolvedValue(successAuthResult);

      const { result } = renderHook(() => useAuthStore());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.signInWithProvider("google" as AuthProvider);
      });

      expect(success).toBe(true);
      expect(authService.signInWithProvider).toHaveBeenCalledWith("google");
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should sign in successfully with Apple provider", async () => {
      (authService.signInWithProvider as jest.Mock).mockResolvedValue(successAuthResult);

      const { result } = renderHook(() => useAuthStore());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.signInWithProvider("apple" as AuthProvider);
      });

      expect(success).toBe(true);
      expect(authService.signInWithProvider).toHaveBeenCalledWith("apple");
    });

    it("should sign in successfully with GitHub provider", async () => {
      (authService.signInWithProvider as jest.Mock).mockResolvedValue(successAuthResult);

      const { result } = renderHook(() => useAuthStore());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.signInWithProvider("github" as AuthProvider);
      });

      expect(success).toBe(true);
      expect(authService.signInWithProvider).toHaveBeenCalledWith("github");
    });

    it("should handle sign in failure", async () => {
      (authService.signInWithProvider as jest.Mock).mockResolvedValue(errorAuthResult);

      const { result } = renderHook(() => useAuthStore());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.signInWithProvider("google" as AuthProvider);
      });

      expect(success).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe("Authentication failed");
    });

    it("should set loading state during sign in", async () => {
      let resolveSignIn: ((value: AuthResult) => void) | undefined;
      (authService.signInWithProvider as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSignIn = resolve;
          }),
      );

      const { result } = renderHook(() => useAuthStore());

      // Start sign in (don't await)
      let signInPromise: Promise<boolean>;
      act(() => {
        signInPromise = result.current.signInWithProvider("google" as AuthProvider);
      });

      // Check loading state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();

      // Resolve and complete
      await act(async () => {
        resolveSignIn!(successAuthResult);
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signInWithCredentials", () => {
    it("should sign in successfully with email and password", async () => {
      (authService.signInWithCredentials as jest.Mock).mockResolvedValue(successAuthResult);

      const { result } = renderHook(() => useAuthStore());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.signInWithCredentials("test@example.com", "password123");
      });

      expect(success).toBe(true);
      expect(authService.signInWithCredentials).toHaveBeenCalledWith(
        "test@example.com",
        "password123",
      );
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("should handle credentials sign in failure", async () => {
      (authService.signInWithCredentials as jest.Mock).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuthStore());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.signInWithCredentials("wrong@example.com", "wrongpass");
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe("Invalid credentials");
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should clear previous error before sign in attempt", async () => {
      // Set initial error state
      act(() => {
        useAuthStore.setState({ error: "Previous error" });
      });

      (authService.signInWithCredentials as jest.Mock).mockResolvedValue(successAuthResult);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signInWithCredentials("test@example.com", "password123");
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("signUp", () => {
    it("should sign up successfully with basic details", async () => {
      (authService.signUp as jest.Mock).mockResolvedValue(successAuthResult);

      const { result } = renderHook(() => useAuthStore());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.signUp("new@example.com", "password123");
      });

      expect(success).toBe(true);
      expect(authService.signUp).toHaveBeenCalledWith(
        "new@example.com",
        "password123",
        undefined,
        undefined,
      );
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("should sign up successfully with name", async () => {
      (authService.signUp as jest.Mock).mockResolvedValue(successAuthResult);

      const { result } = renderHook(() => useAuthStore());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.signUp("new@example.com", "password123", "John Doe");
      });

      expect(success).toBe(true);
      expect(authService.signUp).toHaveBeenCalledWith(
        "new@example.com",
        "password123",
        "John Doe",
        undefined,
      );
    });

    it("should sign up successfully with referral code", async () => {
      (authService.signUp as jest.Mock).mockResolvedValue(successAuthResult);

      const { result } = renderHook(() => useAuthStore());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.signUp("new@example.com", "password123", "John", "REF123");
      });

      expect(success).toBe(true);
      expect(authService.signUp).toHaveBeenCalledWith(
        "new@example.com",
        "password123",
        "John",
        "REF123",
      );
    });

    it("should handle sign up failure", async () => {
      (authService.signUp as jest.Mock).mockResolvedValue({
        success: false,
        error: "Email already exists",
      });

      const { result } = renderHook(() => useAuthStore());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.signUp("existing@example.com", "password123");
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe("Email already exists");
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should set loading state during sign up", async () => {
      let resolveSignUp: ((value: AuthResult) => void) | undefined;
      (authService.signUp as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSignUp = resolve;
          }),
      );

      const { result } = renderHook(() => useAuthStore());

      let signUpPromise: Promise<boolean>;
      act(() => {
        signUpPromise = result.current.signUp("new@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp!(successAuthResult);
        await signUpPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signOut", () => {
    it("should sign out successfully", async () => {
      // Set authenticated state first
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      });

      (authService.signOut as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      expect(authService.signOut).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should set loading state during sign out", async () => {
      let resolveSignOut: (() => void) | undefined;
      (authService.signOut as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSignOut = resolve;
          }),
      );

      // Set authenticated state first
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
          isLoading: false,
        });
      });

      const { result } = renderHook(() => useAuthStore());

      let signOutPromise: Promise<void>;
      act(() => {
        signOutPromise = result.current.signOut();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignOut!();
        await signOutPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("refreshSession", () => {
    it("should refresh session successfully", async () => {
      (authService.refreshSession as jest.Mock).mockResolvedValue(successAuthResult);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.refreshSession();
      });

      expect(authService.refreshSession).toHaveBeenCalled();
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("should handle refresh session failure", async () => {
      (authService.refreshSession as jest.Mock).mockResolvedValue(errorAuthResult);

      // Set initial authenticated state
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
        });
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.refreshSession();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should handle refresh with null user in result", async () => {
      (authService.refreshSession as jest.Mock).mockResolvedValue({
        success: true,
        user: undefined,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.refreshSession();
      });

      // Even with success=true but no user, should be unauthenticated
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      // Set error state first
      act(() => {
        useAuthStore.setState({ error: "Some error" });
      });

      const { result } = renderHook(() => useAuthStore());

      expect(result.current.error).toBe("Some error");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it("should not affect other state when clearing error", () => {
      // Set state with user and error
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
          error: "Some error",
        });
      });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle multiple rapid sign in attempts", async () => {
      (authService.signInWithProvider as jest.Mock)
        .mockResolvedValueOnce(errorAuthResult)
        .mockResolvedValueOnce(successAuthResult);

      const { result } = renderHook(() => useAuthStore());

      // First attempt fails
      let success1: boolean;
      await act(async () => {
        success1 = await result.current.signInWithProvider("google" as AuthProvider);
      });
      expect(success1!).toBe(false);

      // Second attempt succeeds
      let success2: boolean;
      await act(async () => {
        success2 = await result.current.signInWithProvider("google" as AuthProvider);
      });
      expect(success2!).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("should handle result with null user on signInWithProvider", async () => {
      (authService.signInWithProvider as jest.Mock).mockResolvedValue({
        success: true,
        // user is undefined
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signInWithProvider("google" as AuthProvider);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("should handle result with null error on failure", async () => {
      (authService.signInWithCredentials as jest.Mock).mockResolvedValue({
        success: false,
        // error is undefined
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signInWithCredentials("test@example.com", "pass");
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("requestPasswordReset", () => {
    it("should request password reset successfully", async () => {
      (authService.requestPasswordReset as jest.Mock).mockResolvedValue({
        success: true,
        message: "Email sent",
      });

      const { result } = renderHook(() => useAuthStore());

      let response: { success: boolean; error?: string; };
      await act(async () => {
        response = await result.current.requestPasswordReset("test@example.com");
      });

      expect(response!.success).toBe(true);
      expect(authService.requestPasswordReset).toHaveBeenCalledWith("test@example.com");
      expect(result.current.passwordResetLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle password reset request failure", async () => {
      (authService.requestPasswordReset as jest.Mock).mockResolvedValue({
        success: false,
        error: "Email not found",
      });

      const { result } = renderHook(() => useAuthStore());

      let response: { success: boolean; error?: string; };
      await act(async () => {
        response = await result.current.requestPasswordReset("unknown@example.com");
      });

      expect(response!.success).toBe(false);
      expect(response!.error).toBe("Email not found");
      expect(result.current.error).toBe("Email not found");
    });

    it("should set loading state during password reset request", async () => {
      let resolveReset: ((value: { success: boolean; }) => void) | undefined;
      (authService.requestPasswordReset as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveReset = resolve;
          }),
      );

      const { result } = renderHook(() => useAuthStore());

      let resetPromise: Promise<{ success: boolean; error?: string; }>;
      act(() => {
        resetPromise = result.current.requestPasswordReset("test@example.com");
      });

      expect(result.current.passwordResetLoading).toBe(true);
      expect(result.current.error).toBeNull();

      await act(async () => {
        resolveReset!({ success: true });
        await resetPromise;
      });

      expect(result.current.passwordResetLoading).toBe(false);
    });
  });

  describe("resetPassword", () => {
    it("should reset password successfully", async () => {
      (authService.resetPassword as jest.Mock).mockResolvedValue({
        success: true,
        message: "Password updated",
      });

      const { result } = renderHook(() => useAuthStore());

      let response: { success: boolean; error?: string; };
      await act(async () => {
        response = await result.current.resetPassword("valid-token", "NewPass123");
      });

      expect(response!.success).toBe(true);
      expect(authService.resetPassword).toHaveBeenCalledWith("valid-token", "NewPass123");
      expect(result.current.passwordResetLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle reset password failure", async () => {
      (authService.resetPassword as jest.Mock).mockResolvedValue({
        success: false,
        error: "Token expired",
      });

      const { result } = renderHook(() => useAuthStore());

      let response: { success: boolean; error?: string; };
      await act(async () => {
        response = await result.current.resetPassword("expired-token", "NewPass123");
      });

      expect(response!.success).toBe(false);
      expect(response!.error).toBe("Token expired");
      expect(result.current.error).toBe("Token expired");
    });

    it("should set loading state during password reset", async () => {
      let resolveReset: ((value: { success: boolean; }) => void) | undefined;
      (authService.resetPassword as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveReset = resolve;
          }),
      );

      const { result } = renderHook(() => useAuthStore());

      let resetPromise: Promise<{ success: boolean; error?: string; }>;
      act(() => {
        resetPromise = result.current.resetPassword("token", "password");
      });

      expect(result.current.passwordResetLoading).toBe(true);

      await act(async () => {
        resolveReset!({ success: true });
        await resetPromise;
      });

      expect(result.current.passwordResetLoading).toBe(false);
    });
  });

  describe("verifyEmail", () => {
    it("should verify email successfully", async () => {
      (authService.verifyEmail as jest.Mock).mockResolvedValue({
        success: true,
        message: "Email verified",
      });

      const { result } = renderHook(() => useAuthStore());

      let response: { success: boolean; error?: string; };
      await act(async () => {
        response = await result.current.verifyEmail("valid-token");
      });

      expect(response!.success).toBe(true);
      expect(authService.verifyEmail).toHaveBeenCalledWith("valid-token");
      expect(result.current.emailVerified).toBe(true);
      expect(result.current.verificationLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle email verification failure", async () => {
      (authService.verifyEmail as jest.Mock).mockResolvedValue({
        success: false,
        error: "Invalid token",
      });

      const { result } = renderHook(() => useAuthStore());

      let response: { success: boolean; error?: string; };
      await act(async () => {
        response = await result.current.verifyEmail("invalid-token");
      });

      expect(response!.success).toBe(false);
      expect(response!.error).toBe("Invalid token");
      expect(result.current.emailVerified).toBe(false);
      expect(result.current.error).toBe("Invalid token");
    });

    it("should set loading state during verification", async () => {
      let resolveVerify: ((value: { success: boolean; }) => void) | undefined;
      (authService.verifyEmail as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveVerify = resolve;
          }),
      );

      const { result } = renderHook(() => useAuthStore());

      let verifyPromise: Promise<{ success: boolean; error?: string; }>;
      act(() => {
        verifyPromise = result.current.verifyEmail("token");
      });

      expect(result.current.verificationLoading).toBe(true);

      await act(async () => {
        resolveVerify!({ success: true });
        await verifyPromise;
      });

      expect(result.current.verificationLoading).toBe(false);
    });
  });

  describe("resendVerification", () => {
    it("should resend verification successfully", async () => {
      (authService.resendVerification as jest.Mock).mockResolvedValue({
        success: true,
        message: "Email sent",
      });

      const { result } = renderHook(() => useAuthStore());

      let response: { success: boolean; error?: string; };
      await act(async () => {
        response = await result.current.resendVerification("user@example.com");
      });

      expect(response!.success).toBe(true);
      expect(authService.resendVerification).toHaveBeenCalledWith("user@example.com");
      expect(result.current.verificationLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle resend verification failure", async () => {
      (authService.resendVerification as jest.Mock).mockResolvedValue({
        success: false,
        error: "Too many requests",
      });

      const { result } = renderHook(() => useAuthStore());

      let response: { success: boolean; error?: string; };
      await act(async () => {
        response = await result.current.resendVerification("user@example.com");
      });

      expect(response!.success).toBe(false);
      expect(response!.error).toBe("Too many requests");
      expect(result.current.error).toBe("Too many requests");
    });

    it("should set loading state during resend", async () => {
      let resolveResend: ((value: { success: boolean; }) => void) | undefined;
      (authService.resendVerification as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveResend = resolve;
          }),
      );

      const { result } = renderHook(() => useAuthStore());

      let resendPromise: Promise<{ success: boolean; error?: string; }>;
      act(() => {
        resendPromise = result.current.resendVerification("user@example.com");
      });

      expect(result.current.verificationLoading).toBe(true);

      await act(async () => {
        resolveResend!({ success: true });
        await resendPromise;
      });

      expect(result.current.verificationLoading).toBe(false);
    });
  });

  describe("initial state with new fields", () => {
    it("should have correct initial state for new auth fields", () => {
      const { result } = renderHook(() => useAuthStore());

      // Reset to ensure we get the initial values
      act(() => {
        useAuthStore.setState({
          emailVerified: false,
          passwordResetLoading: false,
          verificationLoading: false,
        });
      });

      expect(result.current.emailVerified).toBe(false);
      expect(result.current.passwordResetLoading).toBe(false);
      expect(result.current.verificationLoading).toBe(false);
    });
  });
});
