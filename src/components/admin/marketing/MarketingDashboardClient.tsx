"use client";

/**
 * Marketing Dashboard Client Component
 *
 * Displays connected marketing accounts, campaigns, and provides
 * options to connect new accounts.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Campaign } from "@/lib/marketing";
import { AlertCircle, CheckCircle, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

export function MarketingDashboardClient({
  initialData,
}: MarketingDashboardClientProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<MarketingData>(initialData);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
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
  const refreshAccounts = async () => {
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
      }
    } catch (error) {
      console.error("Failed to refresh accounts:", error);
    } finally {
      setLoading(false);
    }
  };

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
    return platform === "FACEBOOK" ? "📘" : "📊";
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
            Manage your Facebook and Google Ads integrations
          </p>
        </div>
        <Button onClick={refreshAccounts} disabled={loading} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-4 ${
            notification.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
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
            ×
          </button>
        </div>
      )}

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
              📘 Facebook Ads
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
            <CardTitle className="text-sm font-medium">📊 Google Ads</CardTitle>
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
                📘 Connect Facebook Ads
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/api/marketing/google/connect">
                📊 Connect Google Ads
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
                      <span className="text-2xl">
                        {getPlatformIcon(account.platform)}
                      </span>
                      <div>
                        <p className="font-medium">
                          {account.accountName || account.accountId}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {getPlatformName(account.platform)} • {account.accountId}
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

      {/* Campaigns */}
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
                            {getPlatformIcon(campaign.platform)}{" "}
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
    </div>
  );
}
