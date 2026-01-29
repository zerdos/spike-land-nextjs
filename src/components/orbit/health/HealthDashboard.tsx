/**
 * Health Dashboard
 *
 * Overview of all social account health statuses with aggregated metrics.
 * Resolves #522 (ORB-066): Account Health Monitor UI
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AccountHealthCard } from "./AccountHealthCard";

interface HealthDashboardProps {
  workspaceSlug: string;
}

interface AccountHealth {
  accountId: string;
  accountName: string;
  platform: string;
  healthScore: number;
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "CRITICAL";
  issues: string[];
  lastChecked: string;
}

interface DashboardData {
  accounts: AccountHealth[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    critical: number;
  };
}

export function HealthDashboard({ workspaceSlug }: HealthDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/accounts/health`,
      );
      if (!response.ok) throw new Error("Failed to fetch health data");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch health:", error);
      toast.error("Failed to load account health");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (isLoading) {
    return <div className="text-center py-8">Loading health data...</div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-muted-foreground">No health data available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.summary.healthy}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Degraded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data.summary.degraded}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unhealthy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{data.summary.unhealthy}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.summary.critical}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Account Health Status</h2>
        {data.accounts.length === 0
          ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No connected accounts
              </CardContent>
            </Card>
          )
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.accounts.map((account) => (
                <AccountHealthCard
                  key={account.accountId}
                  account={account}
                  workspaceSlug={workspaceSlug}
                  onRefresh={fetchHealth}
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
