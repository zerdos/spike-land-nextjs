import type { InsightType, SocialPlatform } from "@prisma/client";

export interface AnalyticsData {
  overview: EngagementOverview;
  growth: GrowthData[];
  topPosts: TopPost[];
  insights: AIInsight[];
  platformBreakdown: PlatformMetrics[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface EngagementOverview {
  totalEngagements: number;
  engagementChange: number; // percentage
  totalReach: number;
  reachChange: number;
  totalImpressions: number;
  impressionsChange: number;
  averageEngagementRate: number;
  engagementRateChange: number;
}

export interface GrowthData {
  date: string;
  followers: number;
  engagements: number;
  impressions: number;
  reach: number;
}

export interface TopPost {
  id: string;
  platform: SocialPlatform;
  content: string;
  publishedAt: string;
  engagements: number;
  reach: number;
  impressions: number;
  engagementRate: number;
}

export interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  recommendation: string | null;
  metrics: Record<string, unknown>;
  confidence: number;
  isRead: boolean;
  createdAt: string;
}

export interface PlatformMetrics {
  platform: SocialPlatform;
  followers: number;
  engagements: number;
  posts: number;
  averageEngagementRate: number;
}
