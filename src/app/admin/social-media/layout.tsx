/**
 * Admin Social Media Layout
 *
 * Shared layout for all social media admin pages with authentication
 * and navigation tabs.
 */

import { auth } from "@/auth";
import { SocialMediaLayout } from "@/components/admin/social-media/SocialMediaLayout";
import type { SocialMediaData } from "@/components/admin/social-media/SocialMediaLayout";
import { isAdminByUserId } from "@/lib/auth/admin-middleware";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

// Static social media accounts data (will be replaced with database queries later)
function getSocialMediaData(): SocialMediaData {
  const accounts = [
    {
      id: "1",
      platform: "TWITTER" as const,
      handle: "@ai_spike_land",
      url: "https://x.com/ai_spike_land",
      displayName: "Spike Land",
      followers: null,
      isActive: true,
      lastSynced: null,
    },
    {
      id: "2",
      platform: "LINKEDIN" as const,
      handle: "spike-land",
      url: "https://linkedin.com/company/spike-land",
      displayName: "Spike Land",
      followers: null,
      isActive: true,
      lastSynced: null,
    },
    {
      id: "3",
      platform: "FACEBOOK" as const,
      handle: "Spike Land",
      url: "https://www.facebook.com/profile.php?id=61585082436509",
      displayName: "Spike Land",
      followers: null,
      isActive: true,
      lastSynced: null,
    },
    {
      id: "4",
      platform: "INSTAGRAM" as const,
      handle: "@spike.land",
      url: "https://www.instagram.com/spike.land/",
      displayName: "Spike Land",
      followers: null,
      isActive: true,
      lastSynced: null,
    },
    {
      id: "5",
      platform: "YOUTUBE" as const,
      handle: "@spike_land",
      url: "https://www.youtube.com/@spike_land",
      displayName: "Spike Land",
      followers: null,
      isActive: true,
      lastSynced: null,
    },
    {
      id: "6",
      platform: "TIKTOK" as const,
      handle: "@spikeland_uk",
      url: "https://tiktok.com/@spikeland_uk",
      displayName: "Spike Land",
      followers: null,
      isActive: true,
      lastSynced: null,
    },
    {
      id: "7",
      platform: "DISCORD" as const,
      handle: "spike.land",
      url: "https://discord.gg/5bnH9stj",
      displayName: "Spike Land",
      followers: null,
      isActive: true,
      lastSynced: null,
    },
    {
      id: "8",
      platform: "REDDIT" as const,
      handle: "u/spike_land",
      url: "https://www.reddit.com/user/spike_land",
      displayName: "Spike Land",
      followers: null,
      isActive: true,
      lastSynced: null,
    },
    {
      id: "9",
      platform: "DEVTO" as const,
      handle: "@spike_land",
      url: "https://dev.to/spike_land",
      displayName: "Spike Land",
      followers: null,
      isActive: true,
      lastSynced: null,
    },
    {
      id: "10",
      platform: "HACKERNEWS" as const,
      handle: "spike_land",
      url: "https://news.ycombinator.com/user?id=spike_land",
      displayName: "Spike Land",
      followers: null,
      isActive: true,
      lastSynced: null,
    },
    {
      id: "11",
      platform: "GITHUB" as const,
      handle: "zerdos",
      url: "https://github.com/zerdos",
      displayName: "Zoltan Erdos",
      followers: null,
      isActive: true,
      lastSynced: null,
    },
  ];

  return {
    accounts,
    metrics: [],
    summary: {
      totalAccounts: accounts.length,
      totalFollowers: 0,
      activeAccounts: accounts.filter((a) => a.isActive).length,
      avgEngagement: 0,
    },
  };
}

interface LayoutProps {
  children: ReactNode;
}

export default async function AdminSocialMediaLayout({ children }: LayoutProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const isAdmin = await isAdminByUserId(session.user.id);
  if (!isAdmin) {
    redirect("/");
  }

  const data = getSocialMediaData();

  return <SocialMediaLayout initialData={data}>{children}</SocialMediaLayout>;
}
