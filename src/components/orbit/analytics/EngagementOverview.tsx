"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EngagementOverview as EngagementOverviewType } from "@/types/analytics";
import { TrendingUp, TrendingDown, Eye, Heart, BarChart3, Zap } from "lucide-react";

interface EngagementOverviewProps {
  data: EngagementOverviewType;
}

export function EngagementOverview({ data }: EngagementOverviewProps) {
  const metrics = [
    {
      title: "Total Engagements",
      value: data.totalEngagements.toLocaleString(),
      change: data.engagementChange,
      icon: Heart,
    },
    {
      title: "Total Reach",
      value: data.totalReach.toLocaleString(),
      change: data.reachChange,
      icon: Eye,
    },
    {
      title: "Total Impressions",
      value: data.totalImpressions.toLocaleString(),
      change: data.impressionsChange,
      icon: BarChart3,
    },
    {
      title: "Avg Engagement Rate",
      value: `${data.averageEngagementRate.toFixed(2)}%`,
      change: data.engagementRateChange,
      icon: Zap,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const isPositive = metric.change >= 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendIcon
                  className={`mr-1 h-4 w-4 ${
                    isPositive ? "text-green-500" : "text-red-500"
                  }`}
                />
                <span className={isPositive ? "text-green-500" : "text-red-500"}>
                  {Math.abs(metric.change).toFixed(1)}%
                </span>
                <span className="ml-1">from last period</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
