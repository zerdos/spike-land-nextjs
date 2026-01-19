/**
 * User Stats Card Component
 *
 * Displays personal statistics for the user's apps.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Activity, ChevronDown, ChevronUp, MessageSquare, Package, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface UserStats {
  overview: {
    totalApps: number;
    activeApps: number;
    archivedApps: number;
    totalMessages: number;
    myMessages: number;
    agentReplies: number;
    responseRate: number;
  };
  statusBreakdown: Record<string, number>;
  recentApps: Array<{
    id: string;
    name: string;
    status: string;
    messageCount: number;
    lastActivity: string | null;
  }>;
  activityTrend: Array<{ date: string; count: number; }>;
  generatedAt: string;
}

interface UserStatsCardProps {
  initialExpanded?: boolean;
}

export function UserStatsCard({ initialExpanded = false }: UserStatsCardProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/my-apps/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoading) {
    return (
      <Card className="mb-6 p-4">
        <div className="flex items-center justify-center py-4">
          <div className="animate-pulse text-muted-foreground">Loading stats...</div>
        </div>
      </Card>
    );
  }

  if (error || !stats) {
    return null; // Silently hide if stats fail to load
  }

  const { overview } = stats;

  return (
    <Card className="mb-6 overflow-hidden">
      {/* Collapsed View - Always Visible Summary */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">{overview.totalApps} apps</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">{overview.totalMessages} messages</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">{overview.responseRate}% response rate</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs hidden sm:inline">Your activity</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded View */}
      {isExpanded && (
        <div className="border-t p-4 bg-muted/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Apps */}
            <div className="text-center p-3 bg-background rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{overview.totalApps}</div>
              <div className="text-xs text-muted-foreground">Total Apps</div>
            </div>

            {/* Active Apps */}
            <div className="text-center p-3 bg-background rounded-lg">
              <div className="text-2xl font-bold text-green-600">{overview.activeApps}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>

            {/* Your Messages */}
            <div className="text-center p-3 bg-background rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{overview.myMessages}</div>
              <div className="text-xs text-muted-foreground">Your Messages</div>
            </div>

            {/* Agent Replies */}
            <div className="text-center p-3 bg-background rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{overview.agentReplies}</div>
              <div className="text-xs text-muted-foreground">Agent Replies</div>
            </div>
          </div>

          {/* Status Breakdown */}
          {Object.keys(stats.statusBreakdown).length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-xs text-muted-foreground mb-2">Status breakdown</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                  <Badge key={status} variant="secondary" className="text-xs">
                    {status}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Activity Trend Mini-Chart */}
          {stats.activityTrend.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Messages this week
              </div>
              <div className="flex items-end gap-1 h-12">
                {stats.activityTrend.map((day, i) => {
                  const maxCount = Math.max(...stats.activityTrend.map((d) => d.count), 1);
                  const height = (day.count / maxCount) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                      style={{ height: `${Math.max(height, 4)}%` }}
                      title={`${day.count} messages`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
