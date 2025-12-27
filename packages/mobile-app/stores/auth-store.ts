/**
 * Authentication Store
 * Manages auth state with Zustand
 */

import type { User } from "@spike-land/shared";
import { create } from "zustand";
import { AuthProvider, authService } from "../services/auth";

// ============================================================================
// Types
// ============================================================================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signInWithProvider: (provider: AuthProvider) => Promise<boolean>;
  signInWithCredentials: (email: string, password: string) => Promise<boolean>;
  signUp: (
    email: string,
    password: string,
    name?: string,
    referralCode?: string,
  ) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

// ============================================================================
// Store
// ============================================================================

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Actions
  initialize: async () => {
    set({ isLoading: true });
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        // Validate session with server
        const result = await authService.refreshSession();
        set({
          user: result.user || null,
          isAuthenticated: result.success,
          isLoading: false,
          error: null,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to initialize",
      });
    }
  },

  signInWithProvider: async (provider) => {
    set({ isLoading: true, error: null });
    const result = await authService.signInWithProvider(provider);
    set({
      user: result.user || null,
      isAuthenticated: result.success,
      isLoading: false,
      error: result.error || null,
    });
    return result.success;
  },

  signInWithCredentials: async (email, password) => {
    set({ isLoading: true, error: null });
    const result = await authService.signInWithCredentials(email, password);
    set({
      user: result.user || null,
      isAuthenticated: result.success,
      isLoading: false,
      error: result.error || null,
    });
    return result.success;
  },

  signUp: async (email, password, name, referralCode) => {
    set({ isLoading: true, error: null });
    const result = await authService.signUp(email, password, name, referralCode);
    set({
      user: result.user || null,
      isAuthenticated: result.success,
      isLoading: false,
      error: result.error || null,
    });
    return result.success;
  },

  signOut: async () => {
    set({ isLoading: true });
    await authService.signOut();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  refreshSession: async () => {
    const result = await authService.refreshSession();
    if (result.success && result.user) {
      set({ user: result.user, isAuthenticated: true });
    } else {
      set({ user: null, isAuthenticated: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
