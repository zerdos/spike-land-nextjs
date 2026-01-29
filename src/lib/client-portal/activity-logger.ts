/**
 * Activity Logger for Client Portal
 *
 * Utility functions for logging client activity to the feed
 */

import prisma from "@/lib/prisma";
import type { ClientActivityType, UserRole } from "@prisma/client";
import type { InputJsonValue } from "@/generated/prisma/runtime/client";

export interface LogActivityInput {
  workspaceId: string;
  activityType: ClientActivityType;
  contentType: string;
  contentId: string;
  actorId: string;
  actorRole: UserRole;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  isClientVisible?: boolean;
}

/**
 * Log an activity to the client activity feed
 */
export async function logClientActivity(
  input: LogActivityInput,
): Promise<void> {
  try {
    await prisma.clientActivityFeed.create({
      data: {
        workspaceId: input.workspaceId,
        activityType: input.activityType,
        contentType: input.contentType,
        contentId: input.contentId,
        actorId: input.actorId,
        actorRole: input.actorRole,
        title: input.title,
        description: input.description ?? null,
        metadata: input.metadata ? (input.metadata as InputJsonValue) : undefined,
        isClientVisible: input.isClientVisible ?? true,
      },
    });
  } catch (error) {
    // Log error but don't throw - activity logging shouldn't break operations
    console.error("Failed to log client activity:", error);
  }
}

/**
 * Generate activity title from type and context
 */
export function generateActivityTitle(
  activityType: ClientActivityType,
  actorName: string,
  contentType: string,
): string {
  const contentLabel = contentType === "draft" ? "draft" : "content";

  switch (activityType) {
    case "CONTENT_ADDED":
      return `${actorName} added new ${contentLabel}`;
    case "CONTENT_UPDATED":
      return `${actorName} updated ${contentLabel}`;
    case "COMMENT_ADDED":
      return `${actorName} commented on ${contentLabel}`;
    case "MENTION_RECEIVED":
      return `${actorName} mentioned you in a comment`;
    case "APPROVAL_REQUESTED":
      return `${actorName} requested approval for ${contentLabel}`;
    case "APPROVAL_APPROVED":
      return `${actorName} approved ${contentLabel}`;
    case "APPROVAL_REJECTED":
      return `${actorName} rejected ${contentLabel}`;
    case "STATUS_CHANGED":
      return `${actorName} changed ${contentLabel} status`;
    default:
      return `${actorName} performed an action`;
  }
}
