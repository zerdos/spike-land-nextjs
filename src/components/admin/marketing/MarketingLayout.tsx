"use client";

/**
 * Marketing Layout Client Component
 *
 * Provides the header with refresh/polling controls and tab navigation
 * for all marketing admin pages.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ReactNode, useCallback, useEffect, useState } from "react";

interface ConnectedAccount {
  id: string;
  platform: "FACEBOOK" | "GOOGLE_ADS";
  accountId: string;
  accountName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  tokenStatus: "valid" | "expired";
}

interface MarketingData {
  accounts: ConnectedAccount[];
  summary: {
    totalAccounts: number;
    facebookAccounts: number;
    googleAdsAccounts: number;
    expiredTokens: number;
  };
}

interface MarketingLayoutProps {
  initialData: MarketingData;
  children: ReactNode;
}

// Polling interval: 30 seconds
const POLLING_INTERVAL = 30000;

const TABS = [
  { href: "/admin/marketing", label: "Overview", exact: true },
  { href: "/admin/marketing/campaigns", label: "Campaigns", exact: false },
  { href: "/admin/marketing/funnel", label: "Funnel", exact: false },
  { href: "/admin/marketing/accounts", label: "Accounts", exact: false },
];

export function MarketingLayout({ initialData, children }: MarketingLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState<MarketingData>(initialData);
  const [loading, setLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [notification, setNotification] = useState<
    {
      type: "success" | "error";
      message: string;
    } | null
  >(null);

  // Handle URL params for success/error messages
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      setNotification({ type: "success", message: success });
      // Clear URL params
      window.history.replaceState({}, "", pathname);
    } else if (error) {
      setNotification({ type: "error", message: error });
      window.history.replaceState({}, "", pathname);
    }
  }, [searchParams, pathname]);

  // Refresh accounts
  const refreshAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/marketing/accounts");
      if (response.ok) {
        const result = await response.json();
        setData({
          accounts: result.accounts,
          summary: {
            totalAccounts: result.accounts.length,
            facebookAccounts: result.accounts.filter(
              (a: ConnectedAccount) => a.platform === "FACEBOOK",
            ).length,
            googleAdsAccounts: result.accounts.filter(
              (a: ConnectedAccount) => a.platform === "GOOGLE_ADS",
            ).length,
            expiredTokens: result.accounts.filter(
              (a: ConnectedAccount) => a.tokenStatus === "expired",
            ).length,
          },
        });
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to refresh accounts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Track page visibility to pause polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setIsVisible(visible);
      // Refresh immediately when tab becomes visible again
      if (visible && isPolling) {
        refreshAccounts();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPolling, refreshAccounts]);

  // Only poll when tab is visible AND polling is enabled
  useEffect(() => {
    if (!isPolling || !isVisible) return;

    const intervalId = setInterval(refreshAccounts, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isPolling, isVisible, refreshAccounts]);

  const isActiveTab = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing</h1>
          <p className="text-muted-foreground">
            Manage your marketing campaigns and analytics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPolling(!isPolling)}
              aria-label={isPolling ? "Pause auto-refresh" : "Resume auto-refresh"}
            >
              {isPolling ? "Pause" : "Resume"}
            </Button>
            <Button
              onClick={refreshAccounts}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Last updated: {lastUpdated.toLocaleTimeString()}</p>
            {isPolling && (
              <span className="text-xs block">
                <Badge variant="secondary" className="text-xs">Live</Badge>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-4 ${
            notification.type === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
          }`}
        >
          {notification.type === "success"
            ? <CheckCircle className="h-5 w-5" />
            : <AlertCircle className="h-5 w-5" />}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-auto text-lg"
          >
            x
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium",
                isActiveTab(tab.href, tab.exact)
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Page Content */}
      <MarketingDataContext.Provider value={{ data, refreshAccounts }}>
        {children}
      </MarketingDataContext.Provider>
    </div>
  );
}

// Context for sharing marketing data with child pages
import { createContext, useContext } from "react";

interface MarketingDataContextType {
  data: MarketingData;
  refreshAccounts: () => Promise<void>;
}

const MarketingDataContext = createContext<MarketingDataContextType | null>(null);

export function useMarketingData() {
  const context = useContext(MarketingDataContext);
  if (!context) {
    throw new Error("useMarketingData must be used within MarketingLayout");
  }
  return context;
}

export type { ConnectedAccount, MarketingData };
