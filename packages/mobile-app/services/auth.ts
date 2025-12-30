/**
 * Authentication Service
 * Handles OAuth authentication with Expo AuthSession
 */

import type { User } from "@spike-npm-land/shared";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { apiClient } from "./api-client";
import * as storage from "./storage";

// Complete any pending auth sessions
WebBrowser.maybeCompleteAuthSession();

// ============================================================================
// Configuration
// ============================================================================

const AUTH_CONFIG = {
  // Discovery documents for OAuth providers
  google: {
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    revocationEndpoint: "https://oauth2.googleapis.com/revoke",
  },
  apple: {
    authorizationEndpoint: "https://appleid.apple.com/auth/authorize",
    tokenEndpoint: "https://appleid.apple.com/auth/token",
  },
  github: {
    authorizationEndpoint: "https://github.com/login/oauth/authorize",
    tokenEndpoint: "https://github.com/login/oauth/access_token",
    revocationEndpoint: "https://api.github.com/applications/{client_id}/token",
  },
};

// Storage keys
const STORAGE_KEYS = {
  USER: "spike_user",
  SESSION: "spike_session",
} as const;

// ============================================================================
// Types
// ============================================================================

export type AuthProvider = "google" | "apple" | "github";

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface SessionInfo {
  user: User;
  expiresAt: string;
}

export interface PasswordResetResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface EmailVerificationResult {
  success: boolean;
  message?: string;
  error?: string;
}

// ============================================================================
// Auth Service
// ============================================================================

class AuthService {
  private redirectUri: string;

  constructor() {
    this.redirectUri = AuthSession.makeRedirectUri({
      scheme: "spikeland",
      path: "auth/callback",
    });
  }

  /**
   * Get Google OAuth request
   */
  private getGoogleAuthRequest() {
    return new AuthSession.AuthRequest({
      clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "",
      scopes: ["openid", "profile", "email"],
      redirectUri: this.redirectUri,
    });
  }

  /**
   * Get Apple OAuth request
   */
  private getAppleAuthRequest() {
    return new AuthSession.AuthRequest({
      clientId: process.env.EXPO_PUBLIC_APPLE_CLIENT_ID || "",
      scopes: ["name", "email"],
      redirectUri: this.redirectUri,
      responseType: AuthSession.ResponseType.Code,
    });
  }

  /**
   * Get GitHub OAuth request
   */
  private getGitHubAuthRequest() {
    return new AuthSession.AuthRequest({
      clientId: process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || "",
      scopes: ["read:user", "user:email"],
      redirectUri: this.redirectUri,
    });
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithProvider(provider: AuthProvider): Promise<AuthResult> {
    try {
      let request: AuthSession.AuthRequest;
      let discovery: AuthSession.DiscoveryDocument;

      switch (provider) {
        case "google":
          request = this.getGoogleAuthRequest();
          discovery = AUTH_CONFIG.google;
          break;
        case "apple":
          request = this.getAppleAuthRequest();
          discovery = AUTH_CONFIG.apple;
          break;
        case "github":
          request = this.getGitHubAuthRequest();
          discovery = AUTH_CONFIG.github;
          break;
        default:
          return { success: false, error: "Unknown provider" };
      }

      const result = await request.promptAsync(discovery);

      if (result.type !== "success") {
        return {
          success: false,
          error: result.type === "cancel"
            ? "Authentication cancelled"
            : "Authentication failed",
        };
      }

      // Exchange code for token with our backend
      const response = await apiClient.post<{
        user: User;
        token: string;
        expiresAt: string;
      }>("/api/auth/mobile/callback", {
        provider,
        code: result.params.code,
        redirectUri: this.redirectUri,
      });

      if (response.error || !response.data) {
        return {
          success: false,
          error: response.error || "Authentication failed",
        };
      }

      // Store session
      await this.setSession({
        user: response.data.user,
        expiresAt: response.data.expiresAt,
      });
      await apiClient.setAuthToken(response.data.token);

      return { success: true, user: response.data.user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      };
    }
  }

  /**
   * Sign in with email and password
   */
  async signInWithCredentials(
    email: string,
    password: string,
  ): Promise<AuthResult> {
    try {
      const response = await apiClient.post<{
        user: User;
        token: string;
        expiresAt: string;
      }>("/api/auth/mobile/signin", {
        email,
        password,
      });

      if (response.error || !response.data) {
        return { success: false, error: response.error || "Sign in failed" };
      }

      await this.setSession({
        user: response.data.user,
        expiresAt: response.data.expiresAt,
      });
      await apiClient.setAuthToken(response.data.token);

      return { success: true, user: response.data.user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Sign in failed",
      };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(
    email: string,
    password: string,
    name?: string,
    referralCode?: string,
  ): Promise<AuthResult> {
    try {
      const response = await apiClient.post<{
        user: User;
        token: string;
        expiresAt: string;
      }>("/api/auth/signup", {
        email,
        password,
        name,
        referralCode,
      });

      if (response.error || !response.data) {
        return { success: false, error: response.error || "Sign up failed" };
      }

      await this.setSession({
        user: response.data.user,
        expiresAt: response.data.expiresAt,
      });
      await apiClient.setAuthToken(response.data.token);

      return { success: true, user: response.data.user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Sign up failed",
      };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    await apiClient.clearAuthToken();
    await storage.deleteItemAsync(STORAGE_KEYS.USER);
    await storage.deleteItemAsync(STORAGE_KEYS.SESSION);
  }

  /**
   * Get current session
   */
  async getSession(): Promise<SessionInfo | null> {
    try {
      const sessionStr = await storage.getItemAsync(STORAGE_KEYS.SESSION);
      if (!sessionStr) return null;

      const session = JSON.parse(sessionStr) as SessionInfo;

      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        await this.signOut();
        return null;
      }

      return session;
    } catch {
      return null;
    }
  }

  /**
   * Set current session
   */
  private async setSession(session: SessionInfo): Promise<void> {
    await storage.setItemAsync(
      STORAGE_KEYS.SESSION,
      JSON.stringify(session),
    );
    await storage.setItemAsync(
      STORAGE_KEYS.USER,
      JSON.stringify(session.user),
    );
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    const session = await this.getSession();
    return session?.user || null;
  }

  /**
   * Refresh session from server
   */
  async refreshSession(): Promise<AuthResult> {
    try {
      const response = await apiClient.get<{
        user: User;
        token: string;
        expiresAt: string;
      }>("/api/auth/session");

      if (response.error || !response.data) {
        await this.signOut();
        return { success: false, error: "Session expired" };
      }

      await this.setSession({
        user: response.data.user,
        expiresAt: response.data.expiresAt,
      });

      if (response.data.token) {
        await apiClient.setAuthToken(response.data.token);
      }

      return { success: true, user: response.data.user };
    } catch (_error) {
      await this.signOut();
      return { success: false, error: "Session expired" };
    }
  }

  /**
   * Check if email exists
   */
  async checkEmail(email: string): Promise<{
    exists: boolean;
    hasPassword: boolean;
    providers: string[];
  }> {
    const response = await apiClient.post<{
      exists: boolean;
      hasPassword: boolean;
      providers: string[];
    }>("/api/auth/check-email", { email });

    if (response.error || !response.data) {
      return { exists: false, hasPassword: false, providers: [] };
    }

    return {
      ...response.data,
      providers: response.data.providers || [],
    };
  }

  /**
   * Request password reset email
   */
  async requestPasswordReset(email: string): Promise<PasswordResetResult> {
    try {
      const response = await apiClient.post<{
        message: string;
      }>("/api/auth/forgot-password", { email });

      if (response.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        message: response.data?.message || "Password reset email sent",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to send reset email",
      };
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<PasswordResetResult> {
    try {
      const response = await apiClient.post<{
        message: string;
      }>("/api/auth/reset-password", { token, newPassword });

      if (response.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        message: response.data?.message || "Password reset successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to reset password",
      };
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<EmailVerificationResult> {
    try {
      const response = await apiClient.post<{
        message: string;
      }>("/api/auth/verify-email", { token });

      if (response.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        message: response.data?.message || "Email verified successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to verify email",
      };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<EmailVerificationResult> {
    try {
      const response = await apiClient.post<{
        message: string;
      }>("/api/auth/resend-verification", { email });

      if (response.error) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        message: response.data?.message || "Verification email sent",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to send verification email",
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
