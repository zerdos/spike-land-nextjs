import { InsightType } from "@prisma/client";
import type { AIInsight } from "@/types/analytics";

interface MetricsData {
  currentPeriod: {
    engagements: number;
    reach: number;
    impressions: number;
    posts: number;
    avgEngagementRate: number;
  };
  previousPeriod: {
    engagements: number;
    reach: number;
    impressions: number;
    posts: number;
    avgEngagementRate: number;
  };
  topPerformingPosts: Array<{
    engagementRate: number;
    platform: string;
  }>;
  platformBreakdown: Array<{
    platform: string;
    engagements: number;
    posts: number;
    avgEngagementRate: number;
  }>;
}

/**
 * Generate AI insights from workspace analytics data
 */
export async function generateAIInsights(
  _workspaceId: string,
  metricsData: MetricsData
): Promise<Omit<AIInsight, "id" | "isRead" | "createdAt">[]> {
  const insights: Omit<AIInsight, "id" | "isRead" | "createdAt">[]  = [];

  // Detect opportunities
  insights.push(...detectOpportunities(metricsData));

  // Detect warnings
  insights.push(...detectWarnings(metricsData));

  // Detect achievements
  insights.push(...detectAchievements(metricsData));

  // Detect trends
  insights.push(...detectTrends(metricsData));

  return insights.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
}

/**
 * Detect growth opportunities from metrics data
 */
export function detectOpportunities(
  data: MetricsData
): Omit<AIInsight, "id" | "isRead" | "createdAt">[] {
  const opportunities: Omit<AIInsight, "id" | "isRead" | "createdAt">[] = [];

  // Find underperforming platforms with potential
  const avgEngagementRate =
    data.platformBreakdown.reduce(
      (sum, p) => sum + p.avgEngagementRate,
      0
    ) / (data.platformBreakdown.length || 1);

  data.platformBreakdown.forEach((platform) => {
    if (
      platform.avgEngagementRate < avgEngagementRate * 0.7 &&
      platform.posts > 5
    ) {
      opportunities.push({
        type: InsightType.OPPORTUNITY,
        title: `Improve ${platform.platform} Engagement`,
        description: `Your ${platform.platform} engagement rate (${platform.avgEngagementRate.toFixed(
          2
        )}%) is below average. This platform has potential for growth.`,
        recommendation: `Try experimenting with different content formats, posting times, and engagement tactics on ${platform.platform}. Consider A/B testing your posts to identify what resonates best with your audience.`,
        metrics: {
          platform: platform.platform,
          currentRate: platform.avgEngagementRate,
          averageRate: avgEngagementRate,
          posts: platform.posts,
        },
        confidence: 0.75,
      });
    }
  });

  // Identify high-engagement patterns
  const topPosts = data.topPerformingPosts.slice(0, 3);
  if (topPosts.length > 0) {
    const platformCounts = topPosts.reduce(
      (acc, post) => {
        acc[post.platform] = (acc[post.platform] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const topPlatform = Object.entries(platformCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    if (topPlatform && topPlatform[1] >= 2) {
      opportunities.push({
        type: InsightType.OPPORTUNITY,
        title: `Double Down on ${topPlatform[0]}`,
        description: `${topPlatform[1]} of your top 3 performing posts are on ${topPlatform[0]}. This platform is working well for you.`,
        recommendation: `Consider increasing your posting frequency on ${topPlatform[0]} and replicating the content style that's performing well. Analyze what makes these posts successful and apply those insights to future content.`,
        metrics: {
          platform: topPlatform[0],
          topPostsCount: topPlatform[1],
          totalTopPosts: topPosts.length,
        },
        confidence: 0.85,
      });
    }
  }

  return opportunities;
}

/**
 * Detect potential issues or declining trends
 */
export function detectWarnings(
  data: MetricsData
): Omit<AIInsight, "id" | "isRead" | "createdAt">[] {
  const warnings: Omit<AIInsight, "id" | "isRead" | "createdAt">[] = [];

  // Check for declining engagement
  const engagementChange =
    ((data.currentPeriod.engagements - data.previousPeriod.engagements) /
      (data.previousPeriod.engagements || 1)) *
    100;

  if (engagementChange < -15) {
    warnings.push({
      type: InsightType.WARNING,
      title: "Declining Engagement",
      description: `Your total engagements have dropped by ${Math.abs(
        engagementChange
      ).toFixed(1)}% compared to the previous period.`,
      recommendation: `Review your recent content strategy. Consider re-engaging your audience with interactive content, polls, or questions. Analyze which types of content historically performed well and create more of that.`,
      metrics: {
        currentEngagements: data.currentPeriod.engagements,
        previousEngagements: data.previousPeriod.engagements,
        changePercent: engagementChange,
      },
      confidence: 0.9,
    });
  }

  // Check for low posting frequency
  const postingChange =
    ((data.currentPeriod.posts - data.previousPeriod.posts) /
      (data.previousPeriod.posts || 1)) *
    100;

  if (postingChange < -30) {
    warnings.push({
      type: InsightType.WARNING,
      title: "Reduced Posting Frequency",
      description: `You've posted ${Math.abs(postingChange).toFixed(
        1
      )}% less content this period. Consistency is key for audience growth.`,
      recommendation: `Establish a regular posting schedule. Use a content calendar to plan ahead and ensure consistent output. Consider batching content creation to maintain momentum.`,
      metrics: {
        currentPosts: data.currentPeriod.posts,
        previousPosts: data.previousPeriod.posts,
        changePercent: postingChange,
      },
      confidence: 0.8,
    });
  }

  // Check for declining reach
  const reachChange =
    ((data.currentPeriod.reach - data.previousPeriod.reach) /
      (data.previousPeriod.reach || 1)) *
    100;

  if (reachChange < -20) {
    warnings.push({
      type: InsightType.WARNING,
      title: "Declining Reach",
      description: `Your reach has decreased by ${Math.abs(reachChange).toFixed(
        1
      )}%. Fewer people are seeing your content.`,
      recommendation: `Engage more with your audience through comments and shares. Use relevant hashtags and trending topics to increase visibility. Consider cross-promoting your best content across platforms.`,
      metrics: {
        currentReach: data.currentPeriod.reach,
        previousReach: data.previousPeriod.reach,
        changePercent: reachChange,
      },
      confidence: 0.85,
    });
  }

  return warnings;
}

/**
 * Detect and celebrate achievements
 */
export function detectAchievements(
  data: MetricsData
): Omit<AIInsight, "id" | "isRead" | "createdAt">[] {
  const achievements: Omit<AIInsight, "id" | "isRead" | "createdAt">[] = [];

  // Strong engagement growth
  const engagementChange =
    ((data.currentPeriod.engagements - data.previousPeriod.engagements) /
      (data.previousPeriod.engagements || 1)) *
    100;

  if (engagementChange > 25) {
    achievements.push({
      type: InsightType.ACHIEVEMENT,
      title: "Strong Engagement Growth!",
      description: `Your engagements increased by ${engagementChange.toFixed(
        1
      )}%! Your audience is responding well to your content.`,
      recommendation: `Keep up the great work! Analyze what you did differently this period and replicate those successful strategies. Document your winning formula for future reference.`,
      metrics: {
        currentEngagements: data.currentPeriod.engagements,
        previousEngagements: data.previousPeriod.engagements,
        changePercent: engagementChange,
      },
      confidence: 0.95,
    });
  }

  // Improved engagement rate
  const rateChange =
    ((data.currentPeriod.avgEngagementRate -
      data.previousPeriod.avgEngagementRate) /
      (data.previousPeriod.avgEngagementRate || 1)) *
    100;

  if (rateChange > 15) {
    achievements.push({
      type: InsightType.ACHIEVEMENT,
      title: "Improved Engagement Rate!",
      description: `Your average engagement rate improved by ${rateChange.toFixed(
        1
      )}%. Your content quality is resonating with your audience.`,
      recommendation: `Continue refining your content strategy. Share your successful approach with your team and consider creating case studies of your best-performing posts.`,
      metrics: {
        currentRate: data.currentPeriod.avgEngagementRate,
        previousRate: data.previousPeriod.avgEngagementRate,
        changePercent: rateChange,
      },
      confidence: 0.9,
    });
  }

  // Milestone: High engagement rate
  if (data.currentPeriod.avgEngagementRate > 5) {
    achievements.push({
      type: InsightType.ACHIEVEMENT,
      title: "Excellent Engagement Rate!",
      description: `You've achieved a ${data.currentPeriod.avgEngagementRate.toFixed(
        2
      )}% engagement rate, which is excellent! Your content is highly engaging.`,
      recommendation: null,
      metrics: {
        engagementRate: data.currentPeriod.avgEngagementRate,
        benchmark: 5.0,
      },
      confidence: 0.95,
    });
  }

  return achievements;
}

/**
 * Detect emerging patterns and trends
 */
export function detectTrends(
  data: MetricsData
): Omit<AIInsight, "id" | "isRead" | "createdAt">[] {
  const trends: Omit<AIInsight, "id" | "isRead" | "createdAt">[] = [];

  // Impressions growing faster than reach (content being seen multiple times)
  const impressionsChange =
    ((data.currentPeriod.impressions - data.previousPeriod.impressions) /
      (data.previousPeriod.impressions || 1)) *
    100;

  const reachChange =
    ((data.currentPeriod.reach - data.previousPeriod.reach) /
      (data.previousPeriod.reach || 1)) *
    100;

  if (impressionsChange > reachChange + 20) {
    trends.push({
      type: InsightType.TREND,
      title: "Increasing Content Resonance",
      description: `Your impressions are growing faster than reach, suggesting people are viewing your content multiple times.`,
      recommendation: `This indicates your content has high replay value. Consider creating more evergreen content and encourage saves/bookmarks. Your audience finds value in revisiting your posts.`,
      metrics: {
        impressionsChange,
        reachChange,
        difference: impressionsChange - reachChange,
      },
      confidence: 0.75,
    });
  }

  // Increasing posting consistency
  if (
    data.currentPeriod.posts > data.previousPeriod.posts &&
    data.currentPeriod.engagements > data.previousPeriod.engagements
  ) {
    const postsRatio = data.currentPeriod.posts / data.previousPeriod.posts;
    const engagementsRatio =
      data.currentPeriod.engagements / data.previousPeriod.engagements;

    if (engagementsRatio > postsRatio * 0.8) {
      trends.push({
        type: InsightType.TREND,
        title: "Consistency Paying Off",
        description: `You're posting more frequently and maintaining strong engagement per post.`,
        recommendation: `Your consistent posting schedule is working. Maintain this momentum and consider documenting your content calendar approach for long-term success.`,
        metrics: {
          currentPosts: data.currentPeriod.posts,
          previousPosts: data.previousPeriod.posts,
          engagementPerPost: data.currentPeriod.engagements / data.currentPeriod.posts,
        },
        confidence: 0.8,
      });
    }
  }

  return trends;
}
