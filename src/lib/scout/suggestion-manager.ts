/**
 * Scout Suggestion Manager
 *
 * Manages storage and retrieval of content suggestions.
 */

import prisma from "@/lib/prisma";

import type {
  ContentSuggestion,
  SuggestionFeedback,
  SuggestionQueryOptions,
  SuggestionStatus,
} from "./types";

/**
 * Save a new content suggestion
 */
export async function saveSuggestion(suggestion: ContentSuggestion): Promise<ContentSuggestion> {
  const saved = await prisma.contentSuggestion.create({
    data: {
      id: suggestion.id,
      workspaceId: suggestion.workspaceId,
      title: suggestion.title,
      description: suggestion.description,
      draftContent: suggestion.draftContent,
      contentType: suggestion.contentType,
      suggestedPlatforms: suggestion.suggestedPlatforms,
      trendData: suggestion.trendData as object[],
      relevanceScore: suggestion.relevanceScore,
      timelinessScore: suggestion.timelinessScore,
      brandAlignmentScore: suggestion.brandAlignmentScore,
      overallScore: suggestion.overallScore,
      status: suggestion.status,
      generatedAt: suggestion.generatedAt,
      expiresAt: suggestion.expiresAt,
    },
  });

  return mapToContentSuggestion(saved);
}

/**
 * Save multiple suggestions in batch
 */
export async function saveSuggestionsBatch(
  suggestions: ContentSuggestion[],
): Promise<ContentSuggestion[]> {
  const saved = await prisma.$transaction(
    suggestions.map((suggestion) =>
      prisma.contentSuggestion.create({
        data: {
          id: suggestion.id,
          workspaceId: suggestion.workspaceId,
          title: suggestion.title,
          description: suggestion.description,
          draftContent: suggestion.draftContent,
          contentType: suggestion.contentType,
          suggestedPlatforms: suggestion.suggestedPlatforms,
          trendData: suggestion.trendData as object[],
          relevanceScore: suggestion.relevanceScore,
          timelinessScore: suggestion.timelinessScore,
          brandAlignmentScore: suggestion.brandAlignmentScore,
          overallScore: suggestion.overallScore,
          status: suggestion.status,
          generatedAt: suggestion.generatedAt,
          expiresAt: suggestion.expiresAt,
        },
      })
    ),
  );

  return saved.map(mapToContentSuggestion);
}

/**
 * Get suggestion by ID
 */
export async function getSuggestionById(
  suggestionId: string,
  workspaceId: string,
): Promise<ContentSuggestion | null> {
  const suggestion = await prisma.contentSuggestion.findFirst({
    where: {
      id: suggestionId,
      workspaceId,
    },
  });

  return suggestion ? mapToContentSuggestion(suggestion) : null;
}

/**
 * Query suggestions with options
 */
export async function querySuggestions(
  options: SuggestionQueryOptions,
): Promise<{ suggestions: ContentSuggestion[]; total: number; }> {
  const where: Record<string, unknown> = {
    workspaceId: options.workspaceId,
  };

  if (options.status && options.status.length > 0) {
    where.status = { in: options.status };
  }

  if (options.contentTypes && options.contentTypes.length > 0) {
    where.contentType = { in: options.contentTypes };
  }

  if (options.platforms && options.platforms.length > 0) {
    where.suggestedPlatforms = { hasSome: options.platforms };
  }

  if (options.minScore !== undefined) {
    where.overallScore = { gte: options.minScore };
  }

  // Build orderBy
  const orderBy: Record<string, string> = {};
  const sortField = options.sortBy ?? "overallScore";
  const sortOrder = options.sortOrder ?? "desc";

  if (sortField === "score") {
    orderBy.overallScore = sortOrder;
  } else if (sortField === "generatedAt") {
    orderBy.generatedAt = sortOrder;
  } else if (sortField === "expiresAt") {
    orderBy.expiresAt = sortOrder;
  } else {
    orderBy.overallScore = sortOrder;
  }

  const [suggestions, total] = await Promise.all([
    prisma.contentSuggestion.findMany({
      where,
      orderBy,
      take: options.limit ?? 20,
      skip: options.offset ?? 0,
    }),
    prisma.contentSuggestion.count({ where }),
  ]);

  return {
    suggestions: suggestions.map(mapToContentSuggestion),
    total,
  };
}

/**
 * Get pending suggestions for a workspace
 */
export async function getPendingSuggestions(
  workspaceId: string,
  limit: number = 10,
): Promise<ContentSuggestion[]> {
  const result = await querySuggestions({
    workspaceId,
    status: ["PENDING"],
    limit,
    sortBy: "score",
    sortOrder: "desc",
  });

  return result.suggestions;
}

/**
 * Update suggestion status
 */
export async function updateSuggestionStatus(
  suggestionId: string,
  workspaceId: string,
  status: SuggestionStatus,
  metadata?: {
    dismissalReason?: string;
    feedback?: string;
  },
): Promise<ContentSuggestion | null> {
  const updateData: Record<string, unknown> = {
    status,
  };

  if (status === "DISMISSED") {
    updateData.dismissedAt = new Date();
    if (metadata?.dismissalReason) {
      updateData.dismissalReason = metadata.dismissalReason;
    }
  }

  if (status === "USED") {
    updateData.usedAt = new Date();
  }

  if (metadata?.feedback) {
    updateData.feedback = metadata.feedback;
  }

  const updated = await prisma.contentSuggestion.updateMany({
    where: {
      id: suggestionId,
      workspaceId,
    },
    data: updateData,
  });

  if (updated.count === 0) {
    return null;
  }

  return getSuggestionById(suggestionId, workspaceId);
}

/**
 * Accept a suggestion (mark as accepted)
 */
export async function acceptSuggestion(
  suggestionId: string,
  workspaceId: string,
): Promise<ContentSuggestion | null> {
  return updateSuggestionStatus(suggestionId, workspaceId, "ACCEPTED");
}

/**
 * Dismiss a suggestion with optional reason
 */
export async function dismissSuggestion(
  suggestionId: string,
  workspaceId: string,
  reason?: string,
): Promise<ContentSuggestion | null> {
  return updateSuggestionStatus(suggestionId, workspaceId, "DISMISSED", {
    dismissalReason: reason,
  });
}

/**
 * Mark suggestion as used (content was posted)
 */
export async function markSuggestionUsed(
  suggestionId: string,
  workspaceId: string,
): Promise<ContentSuggestion | null> {
  return updateSuggestionStatus(suggestionId, workspaceId, "USED");
}

/**
 * Submit feedback for a suggestion
 */
export async function submitFeedback(
  feedback: SuggestionFeedback,
  workspaceId: string,
): Promise<void> {
  const feedbackText = [
    feedback.helpful ? "Helpful" : "Not helpful",
    feedback.reason,
    feedback.improvementSuggestions,
  ]
    .filter(Boolean)
    .join(" - ");

  await prisma.contentSuggestion.updateMany({
    where: {
      id: feedback.suggestionId,
      workspaceId,
    },
    data: {
      feedback: feedbackText,
    },
  });
}

/**
 * Delete expired suggestions
 */
export async function deleteExpiredSuggestions(workspaceId?: string): Promise<number> {
  const where: Record<string, unknown> = {
    status: "PENDING",
    expiresAt: {
      lt: new Date(),
    },
  };

  if (workspaceId) {
    where.workspaceId = workspaceId;
  }

  const result = await prisma.contentSuggestion.deleteMany({ where });
  return result.count;
}

/**
 * Get suggestion statistics for a workspace
 */
export async function getSuggestionStats(workspaceId: string): Promise<{
  total: number;
  pending: number;
  accepted: number;
  dismissed: number;
  used: number;
  avgScore: number;
}> {
  const [counts, avgResult] = await Promise.all([
    prisma.contentSuggestion.groupBy({
      by: ["status"],
      where: { workspaceId },
      _count: { id: true },
    }),
    prisma.contentSuggestion.aggregate({
      where: { workspaceId },
      _avg: { overallScore: true },
    }),
  ]);

  const statusCounts = counts.reduce(
    (acc, item) => {
      acc[item.status as SuggestionStatus] = item._count.id;
      return acc;
    },
    {} as Record<SuggestionStatus, number>,
  );

  const total = (statusCounts.PENDING ?? 0) +
    (statusCounts.ACCEPTED ?? 0) +
    (statusCounts.DISMISSED ?? 0) +
    (statusCounts.USED ?? 0);

  return {
    total,
    pending: statusCounts.PENDING ?? 0,
    accepted: statusCounts.ACCEPTED ?? 0,
    dismissed: statusCounts.DISMISSED ?? 0,
    used: statusCounts.USED ?? 0,
    avgScore: avgResult._avg.overallScore ?? 0,
  };
}

/**
 * Map database record to ContentSuggestion type
 */
function mapToContentSuggestion(record: {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  draftContent: string;
  contentType: string;
  suggestedPlatforms: string[];
  trendData: unknown;
  relevanceScore: number;
  timelinessScore: number;
  brandAlignmentScore: number;
  overallScore: number;
  status: string;
  generatedAt: Date;
  expiresAt: Date | null;
  usedAt: Date | null;
  dismissedAt: Date | null;
  dismissalReason: string | null;
  feedback: string | null;
}): ContentSuggestion {
  return {
    id: record.id,
    workspaceId: record.workspaceId,
    title: record.title,
    description: record.description,
    draftContent: record.draftContent,
    contentType: record.contentType as ContentSuggestion["contentType"],
    suggestedPlatforms: record.suggestedPlatforms as ContentSuggestion["suggestedPlatforms"],
    trendData: record.trendData as ContentSuggestion["trendData"],
    relevanceScore: record.relevanceScore,
    timelinessScore: record.timelinessScore,
    brandAlignmentScore: record.brandAlignmentScore,
    overallScore: record.overallScore,
    status: record.status as SuggestionStatus,
    generatedAt: record.generatedAt,
    expiresAt: record.expiresAt ?? undefined,
    usedAt: record.usedAt ?? undefined,
    dismissedAt: record.dismissedAt ?? undefined,
    dismissalReason: record.dismissalReason ?? undefined,
    feedback: record.feedback ?? undefined,
  };
}
