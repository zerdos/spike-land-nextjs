/**
 * useReferralStats Hook
 * Fetches and manages referral program data
 */

import { useCallback, useEffect, useState } from "react";
import {
  getReferralCode,
  getReferralStats,
  getReferredUsers,
  ReferralStatsResponse,
  ReferredUser,
} from "../services/api/referrals";

// ============================================================================
// Types
// ============================================================================

interface UseReferralStatsOptions {
  autoFetch?: boolean;
}

interface UseReferralStatsReturn {
  referralCode: string | null;
  referralUrl: string | null;
  stats: ReferralStatsResponse | null;
  referredUsers: ReferredUser[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  loadMoreUsers: () => Promise<void>;
  hasMoreUsers: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useReferralStats(
  options: UseReferralStatsOptions = {},
): UseReferralStatsReturn {
  const { autoFetch = true } = options;

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStatsResponse | null>(null);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const USERS_PER_PAGE = 20;

  // Fetch all referral data
  const fetchReferralData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch referral code and stats in parallel
      const [codeResponse, statsResponse, usersResponse] = await Promise.all([
        getReferralCode(),
        getReferralStats(),
        getReferredUsers({ page: 1, limit: USERS_PER_PAGE }),
      ]);

      if (codeResponse.error) {
        throw new Error(codeResponse.error);
      }

      if (codeResponse.data) {
        setReferralCode(codeResponse.data.code);
        setReferralUrl(codeResponse.data.url);
      }

      if (statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (usersResponse.data) {
        setReferredUsers(usersResponse.data.users);
        setTotalUsers(usersResponse.data.total);
        setCurrentPage(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load referral data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load more referred users
  const loadMoreUsers = useCallback(async () => {
    if (referredUsers.length >= totalUsers) return;

    try {
      const nextPage = currentPage + 1;
      const response = await getReferredUsers({
        page: nextPage,
        limit: USERS_PER_PAGE,
      });

      if (response.data) {
        setReferredUsers((prev) => [...prev, ...response.data!.users]);
        setCurrentPage(nextPage);
      }
    } catch (err) {
      console.error("Failed to load more users:", err);
    }
  }, [currentPage, referredUsers.length, totalUsers]);

  // Check if there are more users to load
  const hasMoreUsers = referredUsers.length < totalUsers;

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchReferralData();
    }
  }, [autoFetch, fetchReferralData]);

  return {
    referralCode,
    referralUrl,
    stats,
    referredUsers,
    isLoading,
    error,
    refetch: fetchReferralData,
    loadMoreUsers,
    hasMoreUsers,
  };
}

export default useReferralStats;
