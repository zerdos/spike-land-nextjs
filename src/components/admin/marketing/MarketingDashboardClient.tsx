"use client";

/**
 * Marketing Dashboard Client Component
 *
 * Displays connected marketing accounts, campaigns, analytics overview,
 * campaign performance, and conversion funnel with tabbed navigation.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Campaign } from "@/lib/marketing";
import { AlertCircle, CheckCircle, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CampaignsTab } from "./tabs/CampaignsTab";
import { FunnelTab } from "./tabs/FunnelTab";
import { OverviewTab } from "./tabs/OverviewTab";

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

interface MarketingDashboardClientProps {
  initialData: MarketingData;
}

// Polling interval: 30 seconds
const POLLING_INTERVAL = 30000;

export function MarketingDashboardClient({
  initialData,
}: MarketingDashboardClientProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<MarketingData>(initialData);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
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
      window.history.replaceState({}, "", "/admin/marketing");
    } else if (error) {
      setNotification({ type: "error", message: error });
      window.history.replaceState({}, "", "/admin/marketing");
    }
  }, [searchParams]);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    if (data.accounts.length === 0) return;

    setCampaignsLoading(true);
    try {
      const response = await fetch("/api/admin/marketing/campaigns");
      if (response.ok) {
        const result = await response.json();
        setCampaigns(result.campaigns || []);
      }
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    } finally {
      setCampaignsLoading(false);
    }
  }, [data.accounts.length]);

  // Fetch campaigns on mount if accounts exist
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

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

  // Disconnect account
  const disconnectAccount = async (accountId: string) => {
    if (!confirm("Are you sure you want to disconnect this account?")) return;

    try {
      const response = await fetch("/api/admin/marketing/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });

      if (response.ok) {
        setNotification({
          type: "success",
          message: "Account disconnected successfully",
        });
        refreshAccounts();
      } else {
        setNotification({
          type: "error",
          message: "Failed to disconnect account",
        });
      }
    } catch {
      setNotification({ type: "error", message: "Failed to disconnect account" });
    }
  };

  const getPlatformIcon = (platform: string) => {
    return platform === "FACEBOOK" ? "FB" : "Google";
  };

  const getPlatformName = (platform: string) => {
    return platform === "FACEBOOK" ? "Facebook Ads" : "Google Ads";
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

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <CampaignsTab />
        </TabsContent>

        {/* Funnel Tab */}
        <TabsContent value="funnel">
          <FunnelTab />
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalAccounts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Facebook Ads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.summary.facebookAccounts}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Google Ads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.summary.googleAdsAccounts}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.filter((c) => c.status === "ACTIVE").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Connect Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>Connect Ad Accounts</CardTitle>
              <CardDescription>
                Link your Facebook and Google Ads accounts to view and manage campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button asChild>
                  <a href="/api/marketing/facebook/connect">
                    Connect Facebook Ads
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href="/api/marketing/google/connect">
                    Connect Google Ads
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Connected Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>
                {data.accounts.length === 0
                  ? "No accounts connected yet"
                  : `${data.accounts.length} account(s) connected`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.accounts.length === 0
                ? (
                  <p className="text-muted-foreground text-sm">
                    Connect your ad accounts above to get started.
                  </p>
                )
                : (
                  <div className="space-y-4">
                    {data.accounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="text-lg font-bold">
                            {getPlatformIcon(account.platform)}
                          </Badge>
                          <div>
                            <p className="font-medium">
                              {account.accountName || account.accountId}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {getPlatformName(account.platform)} - {account.accountId}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge
                            variant={account.tokenStatus === "valid" ? "default" : "destructive"}
                          >
                            {account.tokenStatus === "valid" ? "Connected" : "Expired"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => disconnectAccount(account.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Campaigns List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Campaigns</CardTitle>
                  <CardDescription>
                    View campaigns from all connected accounts
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchCampaigns}
                  disabled={campaignsLoading}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${campaignsLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.accounts.length === 0
                ? (
                  <p className="text-muted-foreground text-sm">
                    Connect an ad account to view campaigns.
                  </p>
                )
                : campaignsLoading
                ? <p className="text-muted-foreground text-sm">Loading campaigns...</p>
                : campaigns.length === 0
                ? (
                  <p className="text-muted-foreground text-sm">
                    No campaigns found in connected accounts.
                  </p>
                )
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left text-sm">
                          <th className="pb-2 font-medium">Campaign</th>
                          <th className="pb-2 font-medium">Platform</th>
                          <th className="pb-2 font-medium">Status</th>
                          <th className="pb-2 font-medium">Objective</th>
                          <th className="pb-2 font-medium">Budget</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.slice(0, 20).map((campaign) => (
                          <tr key={`${campaign.platform}-${campaign.id}`} className="border-b">
                            <td className="py-3">
                              <span className="font-medium">{campaign.name}</span>
                            </td>
                            <td className="py-3">
                              <Badge variant="outline">
                                {campaign.platform === "FACEBOOK" ? "FB" : "Google"}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <Badge
                                variant={campaign.status === "ACTIVE"
                                  ? "default"
                                  : campaign.status === "PAUSED"
                                  ? "secondary"
                                  : "outline"}
                              >
                                {campaign.status}
                              </Badge>
                            </td>
                            <td className="py-3 text-sm">{campaign.objective}</td>
                            <td className="py-3 text-sm">
                              {campaign.budgetAmount > 0
                                ? `${
                                  (campaign.budgetAmount / 100).toFixed(2)
                                } ${campaign.budgetCurrency}/${
                                  campaign.budgetType === "DAILY" ? "day" : "total"
                                }`
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {campaigns.length > 20 && (
                      <p className="text-muted-foreground mt-4 text-sm">
                        Showing 20 of {campaigns.length} campaigns
                      </p>
                    )}
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
