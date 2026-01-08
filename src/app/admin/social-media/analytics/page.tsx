"use client";

/**
 * Social Media Analytics Page
 *
 * View analytics and metrics across all social media platforms.
 */

import {
  PLATFORM_CONFIG,
  useSocialMediaData,
} from "@/components/admin/social-media/SocialMediaLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  Calendar,
  Eye,
  Heart,
  MessageCircle,
  Share,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

export default function SocialMediaAnalyticsPage() {
  const { data } = useSocialMediaData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Analytics Overview</h2>
          <p className="text-sm text-muted-foreground">
            Track performance metrics across all platforms
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <Calendar className="mr-2 h-4 w-4" />
            Last 30 Days
          </Button>
          <Button variant="outline" size="sm" disabled>
            Export Report
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>Connect APIs to see data</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagements</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>Likes, comments, shares</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>This period</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Engagement Rate
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-red-500" />
              <span>Average across platforms</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Performance</CardTitle>
          <CardDescription>
            Metrics breakdown by platform (data syncing coming soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.accounts.map((account) => {
              const config = PLATFORM_CONFIG[account.platform];
              return (
                <div
                  key={account.id}
                  className="flex items-center gap-4 p-4 rounded-lg border"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${config.color}`}
                  >
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{config.name}</span>
                      <Badge variant="outline">{account.handle}</Badge>
                    </div>
                    <div className="flex gap-6 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {account.followers !== null
                          ? account.followers.toLocaleString()
                          : "—"} followers
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        — likes
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        — comments
                      </span>
                      <span className="flex items-center gap-1">
                        <Share className="h-3 w-3" />
                        — shares
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">—%</div>
                    <p className="text-xs text-muted-foreground">engagement</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Features */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Features</CardTitle>
          <CardDescription>
            Advanced analytics capabilities coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
              <h4 className="font-medium mb-2">Follower Growth Chart</h4>
              <p className="text-sm text-muted-foreground">
                Track follower growth over time with interactive charts
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
              <h4 className="font-medium mb-2">Best Performing Content</h4>
              <p className="text-sm text-muted-foreground">
                Identify your top posts across all platforms
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
              <h4 className="font-medium mb-2">Audience Demographics</h4>
              <p className="text-sm text-muted-foreground">
                Understand your audience with demographic insights
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
              <h4 className="font-medium mb-2">Competitor Analysis</h4>
              <p className="text-sm text-muted-foreground">
                Compare your performance against competitors
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
