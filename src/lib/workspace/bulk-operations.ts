import prisma from "@/lib/prisma";
import type {
  BulkOperation,
  BulkOperationData,
  BulkOperationResult,
  SchedulePostData,
  PublishPostData,
  DeletePostData,
  UpdateSettingsData,
  InviteMemberData,
} from "@/types/bulk-operations";
import type { BulkOperationType, BulkOperationStatus } from "@prisma/client";

/**
 * Execute a bulk operation across multiple workspaces
 */
export async function executeBulkOperation(
  operationId: string
): Promise<BulkOperation> {
  const operation = await prisma.bulkOperation.findUnique({
    where: { id: operationId },
  });

  if (!operation) {
    throw new Error(`Bulk operation ${operationId} not found`);
  }

  if (operation.status !== "PENDING") {
    throw new Error(`Bulk operation ${operationId} is not pending`);
  }

  // Update status to IN_PROGRESS
  await prisma.bulkOperation.update({
    where: { id: operationId },
    data: {
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });

  const results: BulkOperationResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  try {
    // Execute operation for each workspace
    for (const workspaceId of operation.workspaceIds) {
      try {
        const result = await executeForWorkspace(
          workspaceId,
          operation.type,
          operation.operationData as unknown as BulkOperationData
        );
        results.push(result);
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (_error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.push({
          workspaceId,
          workspaceName: workspaceId, // We'll fetch the name later if needed
          success: false,
          error: errorMessage,
        });
        failureCount++;
      }
    }

    // Update operation with results
    const updatedOperation = await prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: "COMPLETED",
        successCount,
        failureCount,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results: results as any, // Prisma Json type
        completedAt: new Date(),
      },
    });

    return updatedOperation as unknown as BulkOperation;
  } catch (_error) {
    // If execution fails, mark as FAILED
    const updatedOperation = await prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: "FAILED",
        successCount,
        failureCount,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results: results as any,
        completedAt: new Date(),
      },
    });

    return updatedOperation as unknown as BulkOperation;
  }
}

/**
 * Execute operation for a single workspace
 */
async function executeForWorkspace(
  workspaceId: string,
  type: BulkOperationType,
  data: BulkOperationData
): Promise<BulkOperationResult> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });

  if (!workspace) {
    return {
      workspaceId,
      workspaceName: workspaceId,
      success: false,
      error: "Workspace not found",
    };
  }

  try {
    let result: unknown;

    switch (type) {
      case "SCHEDULE_POST":
        result = await schedulePost(workspaceId, data as SchedulePostData);
        break;
      case "PUBLISH_POST":
        result = await publishPosts(workspaceId, data as PublishPostData);
        break;
      case "DELETE_POST":
        result = await deletePosts(workspaceId, data as DeletePostData);
        break;
      case "UPDATE_SETTINGS":
        result = await updateSettings(
          workspaceId,
          data as UpdateSettingsData
        );
        break;
      case "INVITE_MEMBER":
        result = await inviteMember(workspaceId, data as InviteMemberData);
        break;
      default:
        throw new Error(`Unsupported operation type: ${type}`);
    }

    return {
      workspaceId,
      workspaceName: workspace.name,
      success: true,
      data: result,
    };
  } catch (_error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      workspaceId,
      workspaceName: workspace.name,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Schedule a post in a workspace
 */
async function schedulePost(
  workspaceId: string,
  data: SchedulePostData
): Promise<{ postId: string }> {
  // Get first workspace member to use as creator
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId },
    select: { userId: true },
  });

  if (!member) {
    throw new Error("No workspace members found");
  }

  const post = await prisma.scheduledPost.create({
    data: {
      workspaceId,
      content: data.content,
      scheduledAt: new Date(data.scheduledAt),
      status: "SCHEDULED",
      createdById: member.userId,
      metadata: {
        platforms: data.platforms,
        mediaUrls: data.mediaUrls || [],
      },
    },
  });

  return { postId: post.id };
}

/**
 * Publish draft posts in a workspace
 */
async function publishPosts(
  workspaceId: string,
  data: PublishPostData
): Promise<{ publishedCount: number }> {
  // RelayDraft doesn't have direct workspaceId, needs to go through inboxItem
  const result = await prisma.relayDraft.updateMany({
    where: {
      id: { in: data.draftIds },
      inboxItem: {
        workspaceId,
      },
    },
    data: {
      status: "APPROVED",
    },
  });

  return { publishedCount: result.count };
}

/**
 * Delete posts in a workspace
 */
async function deletePosts(
  workspaceId: string,
  data: DeletePostData
): Promise<{ deletedCount: number }> {
  const result = await prisma.scheduledPost.deleteMany({
    where: {
      id: { in: data.postIds },
      workspaceId,
    },
  });

  return { deletedCount: result.count };
}

/**
 * Update workspace settings
 */
async function updateSettings(
  workspaceId: string,
  data: UpdateSettingsData
): Promise<{ updated: boolean }> {
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      settings: data.settings as any, // Settings is Json type
    },
  });

  return { updated: true };
}

/**
 * Invite a member to a workspace
 */
async function inviteMember(
  workspaceId: string,
  data: InviteMemberData
): Promise<{ memberId: string }> {
  // First, find or create user with this email
  let user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    // Create a new user (they'll complete registration later)
    user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.email.split("@")[0],
      },
    });
  }

  // Check if already a member
  const existingMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: user.id,
      },
    },
  });

  if (existingMember) {
    return { memberId: existingMember.id };
  }

  // Create workspace member
  const member = await prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId: user.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      role: data.role as any, // Cast to WorkspaceRole
    },
  });

  return { memberId: member.id };
}

/**
 * Cancel a pending bulk operation
 */
export async function cancelBulkOperation(
  operationId: string
): Promise<BulkOperation> {
  const operation = await prisma.bulkOperation.findUnique({
    where: { id: operationId },
  });

  if (!operation) {
    throw new Error(`Bulk operation ${operationId} not found`);
  }

  if (operation.status !== "PENDING" && operation.status !== "IN_PROGRESS") {
    throw new Error(
      `Cannot cancel bulk operation ${operationId} with status ${operation.status}`
    );
  }

  const updatedOperation = await prisma.bulkOperation.update({
    where: { id: operationId },
    data: {
      status: "CANCELLED",
      completedAt: new Date(),
    },
  });

  return updatedOperation as unknown as BulkOperation;
}

/**
 * Get bulk operation status
 */
export async function getBulkOperationStatus(
  operationId: string
): Promise<{
  status: BulkOperationStatus;
  progress: number;
  successCount: number;
  failureCount: number;
  totalCount: number;
}> {
  const operation = await prisma.bulkOperation.findUnique({
    where: { id: operationId },
    select: {
      status: true,
      successCount: true,
      failureCount: true,
      totalCount: true,
    },
  });

  if (!operation) {
    throw new Error(`Bulk operation ${operationId} not found`);
  }

  const completedCount = operation.successCount + operation.failureCount;
  const progress =
    operation.totalCount > 0
      ? (completedCount / operation.totalCount) * 100
      : 0;

  return {
    status: operation.status,
    progress,
    successCount: operation.successCount,
    failureCount: operation.failureCount,
    totalCount: operation.totalCount,
  };
}
