/**
 * AI Content Generation Service
 * Generates content suggestions using Gemini AI
 * Issue #841
 */

import prisma from "@/lib/prisma";
import { generateStructuredResponse } from "@/lib/ai/gemini-client";
import type {
  GenerateContentRequest,
  CalendarContentSuggestion,
} from "@/types/ai-calendar";
import { getBestTimeRecommendations } from "./best-time-service";
import type { SocialPlatform } from "@prisma/client";

interface AIContentSuggestionResponse {
  content: string;
  platform: SocialPlatform;
  suggestedTime: string; // ISO date string
  reason: string;
  confidence: number;
  keywords: string[];
}

/**
 * Generate AI-powered content suggestions for a workspace
 */
export async function generateContentSuggestions(
  request: GenerateContentRequest,
): Promise<CalendarContentSuggestion[]> {
  const { workspaceId, platform, count = 5 } = request;

  // 1. Fetch workspace context (brand profile)
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      brandProfile: true,
      socialAccounts: {
        where: {
          status: "ACTIVE",
          ...(platform ? { platform } : {}),
        },
      },
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  if (workspace.socialAccounts.length === 0) {
    throw new Error("No active social accounts found");
  }

  // 2. Fetch recent posts for context
  const recentPosts = await prisma.scheduledPost.findMany({
    where: {
      workspaceId,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
    },
    select: {
      content: true,
      scheduledAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // 3. Get optimal posting times
  const accountIds = workspace.socialAccounts.map((acc) => acc.id);
  const bestTimeData = await getBestTimeRecommendations({
    workspaceId,
    accountIds,
    includeGaps: true,
  });

  // 4. Build AI prompt with context
  const brandValues = workspace.brandProfile?.values
    ? JSON.stringify(workspace.brandProfile.values)
    : "{}";
  const brandContext = workspace.brandProfile
    ? `
Brand Values: ${brandValues}
Mission: ${workspace.brandProfile.mission || ""}
`
    : "No brand profile available.";

  const recentPostsContext = recentPosts.length > 0
    ? `Recent posts:\n${recentPosts.map((p) => `- ${p.content.slice(0, 100)}`).join("\n")}`
    : "No recent posts.";

  const optimalTimesContext = bestTimeData.globalBestSlots.length > 0
    ? `Optimal posting times:\n${
      bestTimeData.globalBestSlots
        .slice(0, 5)
        .map((slot) =>
          `- Day ${slot.dayOfWeek}, Hour ${slot.hour} UTC (score: ${slot.engagementScore})`
        )
        .join("\n")
    }`
    : "No optimal times data available.";

  const prompt = `You are an AI content strategist for a social media management platform.

Generate ${count} content suggestions for social media posts based on the following context:

${brandContext}

Platforms available: ${workspace.socialAccounts.map((acc) => acc.platform).join(", ")}

${recentPostsContext}

${optimalTimesContext}

Requirements:
1. Each suggestion should align with the brand voice and target audience
2. Suggest optimal posting times from the data above (or within the next 7 days if no data)
3. Provide a confidence score (0-100) based on relevance and timing
4. Include 2-5 relevant keywords/hashtags
5. Provide a brief reason for the suggestion (e.g., "optimal engagement time", "trending topic", "content gap")

Return a JSON array of exactly ${count} suggestions with this structure:
[
  {
    "content": "string (the actual post content, 100-280 characters)",
    "platform": "LINKEDIN" | "TWITTER" | "FACEBOOK" | "INSTAGRAM",
    "suggestedTime": "ISO 8601 datetime string",
    "reason": "string (brief explanation)",
    "confidence": number (0-100),
    "keywords": ["keyword1", "keyword2", ...]
  }
]`;

  // 5. Call Gemini AI
  const aiResponse = await generateStructuredResponse<
    AIContentSuggestionResponse[]
  >({
    prompt,
    systemPrompt:
      "You are a social media content strategist. Generate diverse, engaging content suggestions that align with the brand profile.",
    maxTokens: 4096,
    temperature: 0.7, // Higher temperature for creative content
  });

  // 6. Store suggestions in database
  const suggestions: CalendarContentSuggestion[] = [];

  for (const suggestion of aiResponse) {
    const created = await prisma.calendarContentSuggestion.create({
      data: {
        workspaceId,
        content: suggestion.content,
        suggestedFor: new Date(suggestion.suggestedTime),
        platform: suggestion.platform,
        reason: suggestion.reason,
        confidence: suggestion.confidence,
        keywords: suggestion.keywords,
        status: "PENDING",
      },
    });

    suggestions.push({
      id: created.id,
      workspaceId: created.workspaceId,
      content: created.content,
      suggestedFor: created.suggestedFor,
      platform: created.platform,
      reason: created.reason,
      status: created.status,
      confidence: created.confidence,
      keywords: created.keywords,
      metadata: created.metadata as Record<string, unknown> | undefined,
      createdAt: created.createdAt,
      acceptedAt: created.acceptedAt ?? undefined,
      rejectedAt: created.rejectedAt ?? undefined,
    });
  }

  return suggestions;
}

/**
 * Accept a content suggestion (marks it as accepted and optionally creates a scheduled post)
 */
export async function acceptContentSuggestion(
  suggestionId: string,
): Promise<void> {
  const suggestion = await prisma.calendarContentSuggestion.findUnique({
    where: { id: suggestionId },
  });

  if (!suggestion) {
    throw new Error("Content suggestion not found");
  }

  // Update suggestion status
  await prisma.calendarContentSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });

  // Optionally create a scheduled post
  // This is intentionally left as a placeholder - the user might want to edit first
  // The frontend should handle creating the actual ScheduledPost after acceptance
}

/**
 * Reject a content suggestion
 */
export async function rejectContentSuggestion(
  suggestionId: string,
): Promise<void> {
  await prisma.calendarContentSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
    },
  });
}
