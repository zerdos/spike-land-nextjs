/**
 * Platform Status Grid
 *
 * Displays a grid of platform health cards showing
 * status for each connected social media platform.
 *
 * Resolves #649
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { HealthStatus } from "@/lib/social/anomaly-detection";
import { cn } from "@/lib/utils";
import type { SocialPlatform } from "@prisma/client";

interface PlatformStatus {
  platform: SocialPlatform;
  accountName: string;
  status: HealthStatus;
  followerCount: number;
  followerChange: number;
  lastUpdated: Date;
}

interface PlatformStatusGridProps {
  platforms: PlatformStatus[];
  isLoading?: boolean;
}

const platformConfig: Record<
  SocialPlatform,
  {
    name: string;
    color: string;
    bgColor: string;
  }
> = {
  LINKEDIN: {
    name: "LinkedIn",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  INSTAGRAM: {
    name: "Instagram",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
  },
  FACEBOOK: {
    name: "Facebook",
    color: "text-blue-500",
    bgColor: "bg-blue-600/10",
  },
  TWITTER: {
    name: "X/Twitter",
    color: "text-gray-300",
    bgColor: "bg-gray-500/10",
  },
  YOUTUBE: {
    name: "YouTube",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  TIKTOK: {
    name: "TikTok",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
  },
  DISCORD: {
    name: "Discord",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
  },
  PINTEREST: {
    name: "Pinterest",
    color: "text-red-600",
    bgColor: "bg-red-600/10",
  },
};

const statusConfig: Record<
  HealthStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    dotColor: string;
  }
> = {
  healthy: {
    label: "Healthy",
    variant: "default",
    dotColor: "bg-emerald-500",
  },
  warning: {
    label: "Warning",
    variant: "secondary",
    dotColor: "bg-amber-500",
  },
  critical: {
    label: "Critical",
    variant: "destructive",
    dotColor: "bg-red-500",
  },
};

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

function formatChange(change: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

function PlatformCard({ platform }: { platform: PlatformStatus; }) {
  const config = platformConfig[platform.platform];
  const status = statusConfig[platform.status];

  return (
    <Card variant="default" className="hover:border-white/20 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("text-sm font-medium", config.color)}>
            {config.name}
          </div>
          <Badge variant={status.variant} className="text-xs">
            <span
              className={cn("w-1.5 h-1.5 rounded-full mr-1.5", status.dotColor)}
            />
            {status.label}
          </Badge>
        </div>

        <div className="text-xs text-white/50 truncate mb-2">
          {platform.accountName}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold text-white">
            {formatNumber(platform.followerCount)}
          </span>
          <span
            className={cn(
              "text-sm",
              platform.followerChange >= 0
                ? "text-emerald-400"
                : "text-red-400",
            )}
          >
            {formatChange(platform.followerChange)}
          </span>
        </div>

        <div className="text-xs text-white/40 mt-2">
          Updated {formatTimeAgo(platform.lastUpdated)}
        </div>
      </CardContent>
    </Card>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

function LoadingSkeleton() {
  return (
    <Card variant="default">
      <CardContent className="p-4">
        <div className="animate-pulse">
          <div className="flex items-start justify-between mb-3">
            <div className="h-4 w-20 bg-white/10 rounded" />
            <div className="h-5 w-16 bg-white/10 rounded-full" />
          </div>
          <div className="h-3 w-32 bg-white/10 rounded mb-2" />
          <div className="h-6 w-24 bg-white/10 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PlatformStatusGrid({
  platforms,
  isLoading = false,
}: PlatformStatusGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <LoadingSkeleton key={i} />)}
      </div>
    );
  }

  if (platforms.length === 0) {
    return (
      <Card variant="default">
        <CardContent className="p-8 text-center">
          <p className="text-white/60">No social accounts connected</p>
          <p className="text-sm text-white/40 mt-1">
            Connect a social media account to see platform status
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {platforms.map((platform) => (
        <PlatformCard
          key={`${platform.platform}-${platform.accountName}`}
          platform={platform}
        />
      ))}
    </div>
  );
}
