"use client";

/**
 * Social Media Layout Client Component
 *
 * Provides the header with refresh controls and tab navigation
 * for all social media admin pages.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

// Social media platform types
export type SocialPlatform =
  | "TWITTER"
  | "LINKEDIN"
  | "FACEBOOK"
  | "INSTAGRAM"
  | "YOUTUBE"
  | "TIKTOK"
  | "DISCORD"
  | "PINTEREST"
  | "REDDIT"
  | "DEVTO"
  | "HACKERNEWS"
  | "GITHUB";

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  handle: string;
  url: string;
  displayName: string | null;
  followers: number | null;
  isActive: boolean;
  lastSynced: Date | null;
}

export interface SocialMetrics {
  platform: SocialPlatform;
  followers: number;
  following: number;
  posts: number;
  engagement: number;
  impressions: number;
  date: Date;
}

export interface SocialMediaData {
  accounts: SocialAccount[];
  metrics: SocialMetrics[];
  summary: {
    totalAccounts: number;
    totalFollowers: number;
    activeAccounts: number;
    avgEngagement: number;
  };
}

interface SocialMediaLayoutProps {
  initialData: SocialMediaData;
  children: ReactNode;
}

const TABS = [
  { href: "/admin/social-media", label: "Overview", exact: true },
  { href: "/admin/social-media/accounts", label: "Accounts", exact: false },
  { href: "/admin/social-media/analytics", label: "Analytics", exact: false },
  { href: "/admin/social-media/posts", label: "Posts", exact: false },
];

// Platform configurations for display
export const PLATFORM_CONFIG: Record<
  SocialPlatform,
  { name: string; icon: string; color: string; }
> = {
  TWITTER: { name: "X (Twitter)", icon: "𝕏", color: "bg-black text-white" },
  LINKEDIN: { name: "LinkedIn", icon: "in", color: "bg-[#0A66C2] text-white" },
  FACEBOOK: { name: "Facebook", icon: "f", color: "bg-[#1877F2] text-white" },
  INSTAGRAM: {
    name: "Instagram",
    icon: "📷",
    color: "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white",
  },
  YOUTUBE: { name: "YouTube", icon: "▶", color: "bg-[#FF0000] text-white" },
  TIKTOK: { name: "TikTok", icon: "♪", color: "bg-black text-white" },
  DISCORD: { name: "Discord", icon: "💬", color: "bg-[#5865F2] text-white" },
  PINTEREST: {
    name: "Pinterest",
    icon: "📌",
    color: "bg-[#E60023] text-white",
  },
  REDDIT: { name: "Reddit", icon: "🔴", color: "bg-[#FF4500] text-white" },
  DEVTO: { name: "Dev.to", icon: "DEV", color: "bg-black text-white" },
  HACKERNEWS: {
    name: "Hacker News",
    icon: "Y",
    color: "bg-[#FF6600] text-white",
  },
  GITHUB: { name: "GitHub", icon: "🐙", color: "bg-[#24292e] text-white" },
};

export function SocialMediaLayout(
  { initialData, children }: SocialMediaLayoutProps,
) {
  const pathname = usePathname();
  const [data, setData] = useState<SocialMediaData>(initialData);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Initialize lastUpdated after mount to avoid hydration mismatch
  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/social-media/accounts");
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to refresh social media data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

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
          <h1 className="text-2xl font-bold">Social Media</h1>
          <p className="text-muted-foreground">
            Manage your social media presence across all platforms
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={refreshData}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <div className="text-right text-sm text-muted-foreground">
            <p>Last updated: {lastUpdated?.toLocaleTimeString() ?? "—"}</p>
            <Badge variant="secondary" className="text-xs">
              {data.summary.totalAccounts} accounts
            </Badge>
          </div>
        </div>
      </div>

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
      <SocialMediaDataContext.Provider value={{ data, refreshData }}>
        {children}
      </SocialMediaDataContext.Provider>
    </div>
  );
}

// Context for sharing social media data with child pages
interface SocialMediaDataContextType {
  data: SocialMediaData;
  refreshData: () => Promise<void>;
}

const SocialMediaDataContext = createContext<SocialMediaDataContextType | null>(
  null,
);

export function useSocialMediaData() {
  const context = useContext(SocialMediaDataContext);
  if (!context) {
    throw new Error("useSocialMediaData must be used within SocialMediaLayout");
  }
  return context;
}
