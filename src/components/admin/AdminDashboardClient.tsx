/**
 * Admin Dashboard Client Component
 *
 * Client-side dashboard with real-time polling for job status updates.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { useCallback, useEffect, useState } from "react";

interface DashboardMetrics {
  totalUsers: number;
  adminCount: number;
  totalEnhancements: number;
  jobStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    active: number;
  };
  totalTokensPurchased: number;
  totalTokensSpent: number;
  activeVouchers: number;
  timestamp: string;
}

interface AdminDashboardClientProps {
  initialMetrics: DashboardMetrics;
}

// Increased polling interval from 10s to 30s for reduced database load
const POLLING_INTERVAL = 30000;

export function AdminDashboardClient(
  { initialMetrics }: AdminDashboardClientProps,
) {
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [isPolling, setIsPolling] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Set initial time on mount to avoid SSR hydration mismatch
  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch metrics");
      }
      const data = await response.json();
      setMetrics(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchMetrics();
    setIsRefreshing(false);
  }, [fetchMetrics]);

  // Track page visibility to pause polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setIsVisible(visible);
      // Refresh immediately when tab becomes visible again
      if (visible && isPolling) {
        fetchMetrics();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPolling, fetchMetrics]);

  // Only poll when tab is visible AND polling is enabled
  useEffect(() => {
    if (!isPolling || !isVisible) return;

    const intervalId = setInterval(fetchMetrics, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isPolling, isVisible, fetchMetrics]);

  const quickLinks = [
    {
      title: "User Analytics1",
      description: "View user growth, retention, and engagement metrics",
      href: "/admin/analytics",
      icon: "chart-line",
    },
    {
      title: "Token Economics",
      description: "Monitor token purchases, spending, and revenue",
      href: "/admin/tokens",
      icon: "coins",
    },
    {
      title: "System Health",
      description: "Check enhancement jobs, processing times, and errors",
      href: "/admin/system",
      icon: "activity",
    },
    {
      title: "Voucher Management",
      description: "Create and manage promotional vouchers",
      href: "/admin/vouchers",
      icon: "ticket",
    },
    {
      title: "User Management",
      description: "Search users, adjust roles, and manage tokens",
      href: "/admin/users",
      icon: "users",
    },
    {
      title: "Photo Gallery",
      description: "View all uploaded photos and enhancement history",
      href: "/admin/photos",
      icon: "image",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Platform overview and quick actions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPolling(!isPolling)}
              aria-label={isPolling
                ? "Pause auto-refresh"
                : "Resume auto-refresh"}
            >
              {isPolling ? "Pause" : "Resume"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh data"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
          <div className="text-right text-sm text-neutral-500">
            <p>
              Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
            </p>
            {isPolling && (
              <span className="text-xs block">
                <Badge variant="secondary" className="text-xs">Live</Badge>
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        </Card>
      )}

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Total Users
              </p>
              <p className="mt-2 text-3xl font-bold">{metrics.totalUsers}</p>
            </div>
            <div className="text-4xl" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-neutral-400"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {metrics.adminCount} admin{metrics.adminCount !== 1 ? "s" : ""}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Enhancements
              </p>
              <p className="mt-2 text-3xl font-bold">
                {metrics.totalEnhancements}
              </p>
            </div>
            <div className="text-4xl" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-neutral-400"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {metrics.jobStatus.active} active job{metrics.jobStatus.active !== 1 ? "s" : ""}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Tokens Purchased
              </p>
              <p className="mt-2 text-3xl font-bold">
                {metrics.totalTokensPurchased.toLocaleString()}
              </p>
            </div>
            <div className="text-4xl" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-neutral-400"
              >
                <circle cx="8" cy="8" r="6" />
                <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                <path d="M7 6h1v4" />
                <path d="m16.71 13.88.7.71-2.82 2.82" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {metrics.totalTokensSpent.toLocaleString()} spent
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Active Vouchers
              </p>
              <p className="mt-2 text-3xl font-bold">
                {metrics.activeVouchers}
              </p>
            </div>
            <div className="text-4xl" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-neutral-400"
              >
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                <path d="M13 5v2" />
                <path d="M13 17v2" />
                <path d="M13 11v2" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Promotional campaigns
          </p>
        </Card>
      </div>

      {/* Real-time Job Status */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Real-time Job Status</h2>
          {isPolling && (
            <Badge variant="default" className="animate-pulse">
              Live
            </Badge>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Pending
            </p>
            <p className="mt-1 text-2xl font-bold text-yellow-900 dark:text-yellow-100">
              {metrics.jobStatus.pending}
            </p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Processing
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-100">
              {metrics.jobStatus.processing}
            </p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Completed
            </p>
            <p className="mt-1 text-2xl font-bold text-green-900 dark:text-green-100">
              {metrics.jobStatus.completed}
            </p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Failed
            </p>
            <p className="mt-1 text-2xl font-bold text-red-900 dark:text-red-100">
              {metrics.jobStatus.failed}
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Links */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Quick Links</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="h-full p-6 transition-shadow hover:shadow-md">
                <div className="mb-3">
                  <QuickLinkIcon icon={link.icon} />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{link.title}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {link.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/** @internal Exported for testing */
export function QuickLinkIcon({ icon }: { icon: string; }) {
  const iconClass = "h-10 w-10 text-neutral-400";

  switch (icon) {
    case "chart-line":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}
          aria-hidden="true"
        >
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      );
    case "coins":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6" />
          <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
          <path d="M7 6h1v4" />
          <path d="m16.71 13.88.7.71-2.82 2.82" />
        </svg>
      );
    case "activity":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}
          aria-hidden="true"
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
    case "ticket":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}
          aria-hidden="true"
        >
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          <path d="M13 5v2" />
          <path d="M13 17v2" />
          <path d="M13 11v2" />
        </svg>
      );
    case "users":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "image":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}
          aria-hidden="true"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      );
    default:
      return null;
  }
}
