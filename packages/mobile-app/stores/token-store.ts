/**
 * Token Balance Store
 * Manages token balance and regeneration with Zustand
 */

import { calculateRegeneratedTokens, getTimeUntilNextRegen } from "@spike-land/shared";
import type { SubscriptionTier } from "@spike-land/shared";
import { create } from "zustand";
import { getTokenBalance, TokenBalanceResponse } from "../services/api/tokens";

// ============================================================================
// Types
// ============================================================================

interface TokenState {
  balance: number;
  tier: SubscriptionTier;
  lastRegeneration: Date | null;
  maxBalance: number;
  timeUntilNextRegen: number;
  isLoading: boolean;
  error: string | null;
}

interface TokenActions {
  fetchBalance: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  deductTokens: (amount: number) => void;
  addTokens: (amount: number) => void;
  startRegenTimer: () => void;
  stopRegenTimer: () => void;
}

type TokenStore = TokenState & TokenActions;

// ============================================================================
// Store
// ============================================================================

let regenInterval: ReturnType<typeof setInterval> | null = null;

export const useTokenStore = create<TokenStore>((set, get) => ({
  // Initial state
  balance: 0,
  tier: "FREE",
  lastRegeneration: null,
  maxBalance: 10,
  timeUntilNextRegen: 0,
  isLoading: false,
  error: null,

  // Actions
  fetchBalance: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await getTokenBalance();
      if (response.error || !response.data) {
        set({
          isLoading: false,
          error: response.error || "Failed to fetch balance",
        });
        return;
      }

      const data = response.data;
      set({
        balance: data.balance,
        tier: data.tier,
        lastRegeneration: new Date(data.lastRegeneration),
        maxBalance: data.maxBalance,
        timeUntilNextRegen: data.timeUntilNextRegen,
        isLoading: false,
        error: null,
      });

      // Start regen timer if needed
      if (data.balance < data.maxBalance) {
        get().startRegenTimer();
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch balance",
      });
    }
  },

  updateBalance: (newBalance) => {
    set({ balance: newBalance });
  },

  deductTokens: (amount) => {
    set((state) => ({
      balance: Math.max(0, state.balance - amount),
    }));
  },

  addTokens: (amount) => {
    set((state) => ({
      balance: Math.min(state.maxBalance, state.balance + amount),
    }));
  },

  startRegenTimer: () => {
    // Clear existing interval
    if (regenInterval) {
      clearInterval(regenInterval);
    }

    // Update timer every second
    regenInterval = setInterval(() => {
      const state = get();
      if (!state.lastRegeneration) return;

      const timeUntil = getTimeUntilNextRegen(state.lastRegeneration);
      set({ timeUntilNextRegen: timeUntil });

      // Check if we should regenerate
      const tokensToAdd = calculateRegeneratedTokens(
        state.lastRegeneration,
        state.balance,
        state.maxBalance,
      );

      if (tokensToAdd > 0) {
        set((s) => ({
          balance: Math.min(s.maxBalance, s.balance + tokensToAdd),
          lastRegeneration: new Date(),
        }));
      }

      // Stop timer if at max
      if (state.balance >= state.maxBalance) {
        get().stopRegenTimer();
      }
    }, 1000);
  },

  stopRegenTimer: () => {
    if (regenInterval) {
      clearInterval(regenInterval);
      regenInterval = null;
    }
  },
}));
