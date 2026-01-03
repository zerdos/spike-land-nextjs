"use client";

/**
 * Social Media Overview Page
 *
 * Dashboard showing overview of all social media accounts and metrics.
 */

import {
  PLATFORM_CONFIG,
  useSocialMediaData,
} from "@/components/admin/social-media/SocialMediaLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ExternalLink, Share2, TrendingUp, Users } from "lucide-react";

export default function SocialMediaOverviewPage() {
  const { data } = useSocialMediaData();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalAccounts}</div>
            <p className="text-xs text-muted-foreground">
              Across all platforms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.activeAccounts}</div>
            <p className="text-xs text-muted-foreground">
              Currently connected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.totalFollowers > 0 ? data.summary.totalFollowers.toLocaleString() : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined audience
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.avgEngagement > 0 ? `${data.summary.avgEngagement.toFixed(1)}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all platforms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Connected Platforms</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.accounts.map((account) => {
            const config = PLATFORM_CONFIG[account.platform];
            return (
              <Card key={account.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${config.color}`}
                  >
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{config.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {account.handle}
                    </CardDescription>
                  </div>
                  <Badge variant={account.isActive ? "default" : "secondary"}>
                    {account.isActive ? "Active" : "Inactive"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {account.followers !== null
                        ? <span>{account.followers.toLocaleString()} followers</span>
                        : <span>Followers: —</span>}
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={account.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        Visit <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                  {account.lastSynced && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last synced: {new Date(account.lastSynced).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for managing your social media presence
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <a href="/social" target="_blank" rel="noopener noreferrer">
              View Public Social Page <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" disabled>
            Schedule Post (Coming Soon)
          </Button>
          <Button variant="outline" disabled>
            Sync All Accounts (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
