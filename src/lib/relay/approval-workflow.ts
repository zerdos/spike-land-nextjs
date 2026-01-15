/**
 * Approval Workflow Service
 *
 * Handles draft editing, approval/rejection, and audit logging.
 * Resolves #569
 */

import prisma from "@/lib/prisma";
import type { DraftEditType } from "@prisma/client";
import type {
  AggregatedFeedback,
  ApproveWorkflowRequest,
  CreateAuditLogParams,
  DraftAuditLogRecord,
  DraftEditHistoryRecord,
  DraftWithHistory,
  EditDraftRequest,
  EditDraftResponse,
  EditFeedbackData,
  RejectWorkflowRequest,
  RelayApprovalSettings,
  WorkflowActionResponse,
  WorkflowMetrics,
} from "./approval-workflow-types";
import { DEFAULT_APPROVAL_SETTINGS } from "./approval-workflow-types";

// ============================================
// Levenshtein Distance Calculation
// ============================================

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create a matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0) as number[]);

  // Initialize first column and row
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  // Fill in the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] = Math.min(
          dp[i - 1]![j]! + 1, // deletion
          dp[i]![j - 1]! + 1, // insertion
          dp[i - 1]![j - 1]! + 1, // substitution
        );
      }
    }
  }

  return dp[m]![n]!;
}

/**
 * Classify the type of edit based on edit distance and content analysis.
 */
function classifyEditType(
  original: string,
  edited: string,
  editDistance: number,
): DraftEditType {
  const originalLength = original.length;
  const editRatio = editDistance / Math.max(originalLength, 1);

  // Complete rewrite if more than 70% changed
  if (editRatio > 0.7) {
    return "COMPLETE_REWRITE";
  }

  // Check for platform formatting changes (hashtags, mentions)
  const hashtagRegex = /#\w+/g;
  const mentionRegex = /@\w+/g;
  const originalHashtags = original.match(hashtagRegex) || [];
  const editedHashtags = edited.match(hashtagRegex) || [];
  const originalMentions = original.match(mentionRegex) || [];
  const editedMentions = edited.match(mentionRegex) || [];

  if (
    originalHashtags.length !== editedHashtags.length ||
    originalMentions.length !== editedMentions.length
  ) {
    return "PLATFORM_FORMATTING";
  }

  // Minor tweak if less than 5% changed
  if (editRatio < 0.05) {
    return "MINOR_TWEAK";
  }

  // Tone adjustment if length is similar but content differs
  const lengthDiff = Math.abs(original.length - edited.length);
  if (lengthDiff < 20 && editRatio < 0.3) {
    return "TONE_ADJUSTMENT";
  }

  // Default to content revision
  return "CONTENT_REVISION";
}

// ============================================
// Audit Log Functions
// ============================================

/**
 * Create an audit log entry for a draft action.
 */
export async function createAuditLog(
  params: CreateAuditLogParams,
): Promise<DraftAuditLogRecord> {
  const { draftId, action, performedById, details, ipAddress, userAgent } = params;

  const auditLog = await prisma.draftAuditLog.create({
    data: {
      draftId,
      action,
      performedById,
      details: details ? JSON.parse(JSON.stringify(details)) : undefined,
      ipAddress,
      userAgent,
    },
    include: {
      performedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    id: auditLog.id,
    draftId: auditLog.draftId,
    action: auditLog.action,
    details: auditLog.details as Record<string, unknown> | null,
    ipAddress: auditLog.ipAddress,
    userAgent: auditLog.userAgent,
    performedById: auditLog.performedById,
    createdAt: auditLog.createdAt,
    performedBy: auditLog.performedBy,
  };
}

/**
 * Get audit logs for a draft.
 */
export async function getAuditLogs(
  draftId: string,
  limit = 50,
): Promise<DraftAuditLogRecord[]> {
  const auditLogs = await prisma.draftAuditLog.findMany({
    where: { draftId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      performedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return auditLogs.map((log) => ({
    id: log.id,
    draftId: log.draftId,
    action: log.action,
    details: log.details as Record<string, unknown> | null,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    performedById: log.performedById,
    createdAt: log.createdAt,
    performedBy: log.performedBy,
  }));
}

// ============================================
// Edit Functions
// ============================================

/**
 * Edit a draft and track the changes.
 */
export async function editDraft(
  params: EditDraftRequest,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<EditDraftResponse> {
  const { draftId, content, reason } = params;

  // Get the current draft
  const currentDraft = await prisma.relayDraft.findUnique({
    where: { id: draftId },
  });

  if (!currentDraft) {
    throw new Error("Draft not found");
  }

  if (currentDraft.status !== "PENDING") {
    throw new Error(`Cannot edit draft with status ${currentDraft.status}`);
  }

  const originalContent = currentDraft.content;
  const editDistance = levenshteinDistance(originalContent, content);
  const editType = classifyEditType(originalContent, content, editDistance);

  // Use a transaction to update draft and create edit history
  const [updatedDraft, editHistory, _auditLog] = await prisma.$transaction([
    // Update the draft
    prisma.relayDraft.update({
      where: { id: draftId },
      data: { content },
    }),
    // Create edit history record
    prisma.draftEditHistory.create({
      data: {
        draftId,
        originalContent,
        editedContent: content,
        editType,
        changesSummary: reason || null,
        editDistance,
        editedById: userId,
      },
    }),
    // Create audit log
    prisma.draftAuditLog.create({
      data: {
        draftId,
        action: "EDITED",
        performedById: userId,
        details: JSON.parse(
          JSON.stringify({
            editType,
            editDistance,
            reason,
          }),
        ),
        ipAddress,
        userAgent,
      },
    }),
  ]);

  return {
    draft: {
      id: updatedDraft.id,
      content: updatedDraft.content,
      confidenceScore: updatedDraft.confidenceScore,
      status: updatedDraft.status,
      isPreferred: updatedDraft.isPreferred,
      reason: updatedDraft.reason,
      metadata: updatedDraft.metadata as Record<string, unknown> | null,
      sentAt: updatedDraft.sentAt,
      errorMessage: updatedDraft.errorMessage,
      inboxItemId: updatedDraft.inboxItemId,
      reviewedById: updatedDraft.reviewedById,
      reviewedAt: updatedDraft.reviewedAt,
      createdAt: updatedDraft.createdAt,
      updatedAt: updatedDraft.updatedAt,
    },
    editHistory: {
      id: editHistory.id,
      draftId: editHistory.draftId,
      originalContent: editHistory.originalContent,
      editedContent: editHistory.editedContent,
      editType: editHistory.editType,
      changesSummary: editHistory.changesSummary,
      editDistance: editHistory.editDistance,
      editedById: editHistory.editedById,
      createdAt: editHistory.createdAt,
    },
    editType,
  };
}

/**
 * Get edit history for a draft.
 */
export async function getEditHistory(
  draftId: string,
): Promise<DraftEditHistoryRecord[]> {
  const editHistory = await prisma.draftEditHistory.findMany({
    where: { draftId },
    orderBy: { createdAt: "desc" },
  });

  return editHistory.map((record) => ({
    id: record.id,
    draftId: record.draftId,
    originalContent: record.originalContent,
    editedContent: record.editedContent,
    editType: record.editType,
    changesSummary: record.changesSummary,
    editDistance: record.editDistance,
    editedById: record.editedById,
    createdAt: record.createdAt,
  }));
}

// ============================================
// Workflow Action Functions
// ============================================

/**
 * Approve a draft for sending.
 */
export async function approveDraftWorkflow(
  params: ApproveWorkflowRequest,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<WorkflowActionResponse> {
  const { draftId, note } = params;

  const currentDraft = await prisma.relayDraft.findUnique({
    where: { id: draftId },
  });

  if (!currentDraft) {
    throw new Error("Draft not found");
  }

  if (currentDraft.status !== "PENDING") {
    throw new Error(`Cannot approve draft with status ${currentDraft.status}`);
  }

  const [updatedDraft, auditLog] = await prisma.$transaction([
    prisma.relayDraft.update({
      where: { id: draftId },
      data: {
        status: "APPROVED",
        reviewedById: userId,
        reviewedAt: new Date(),
      },
    }),
    prisma.draftAuditLog.create({
      data: {
        draftId,
        action: "APPROVED",
        performedById: userId,
        details: note ? JSON.parse(JSON.stringify({ note })) : undefined,
        ipAddress,
        userAgent,
      },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    draft: {
      id: updatedDraft.id,
      content: updatedDraft.content,
      confidenceScore: updatedDraft.confidenceScore,
      status: updatedDraft.status,
      isPreferred: updatedDraft.isPreferred,
      reason: updatedDraft.reason,
      metadata: updatedDraft.metadata as Record<string, unknown> | null,
      sentAt: updatedDraft.sentAt,
      errorMessage: updatedDraft.errorMessage,
      inboxItemId: updatedDraft.inboxItemId,
      reviewedById: updatedDraft.reviewedById,
      reviewedAt: updatedDraft.reviewedAt,
      createdAt: updatedDraft.createdAt,
      updatedAt: updatedDraft.updatedAt,
    },
    success: true,
    message: "Draft approved successfully",
    auditLog: {
      id: auditLog.id,
      draftId: auditLog.draftId,
      action: auditLog.action,
      details: auditLog.details as Record<string, unknown> | null,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      performedById: auditLog.performedById,
      createdAt: auditLog.createdAt,
      performedBy: auditLog.performedBy,
    },
  };
}

/**
 * Reject a draft.
 */
export async function rejectDraftWorkflow(
  params: RejectWorkflowRequest,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<WorkflowActionResponse> {
  const { draftId, reason } = params;

  const currentDraft = await prisma.relayDraft.findUnique({
    where: { id: draftId },
  });

  if (!currentDraft) {
    throw new Error("Draft not found");
  }

  if (currentDraft.status !== "PENDING") {
    throw new Error(`Cannot reject draft with status ${currentDraft.status}`);
  }

  const [updatedDraft, auditLog] = await prisma.$transaction([
    prisma.relayDraft.update({
      where: { id: draftId },
      data: {
        status: "REJECTED",
        reviewedById: userId,
        reviewedAt: new Date(),
      },
    }),
    prisma.draftAuditLog.create({
      data: {
        draftId,
        action: "REJECTED",
        performedById: userId,
        details: JSON.parse(JSON.stringify({ reason })),
        ipAddress,
        userAgent,
      },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    draft: {
      id: updatedDraft.id,
      content: updatedDraft.content,
      confidenceScore: updatedDraft.confidenceScore,
      status: updatedDraft.status,
      isPreferred: updatedDraft.isPreferred,
      reason: updatedDraft.reason,
      metadata: updatedDraft.metadata as Record<string, unknown> | null,
      sentAt: updatedDraft.sentAt,
      errorMessage: updatedDraft.errorMessage,
      inboxItemId: updatedDraft.inboxItemId,
      reviewedById: updatedDraft.reviewedById,
      reviewedAt: updatedDraft.reviewedAt,
      createdAt: updatedDraft.createdAt,
      updatedAt: updatedDraft.updatedAt,
    },
    success: true,
    message: "Draft rejected",
    auditLog: {
      id: auditLog.id,
      draftId: auditLog.draftId,
      action: auditLog.action,
      details: auditLog.details as Record<string, unknown> | null,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      performedById: auditLog.performedById,
      createdAt: auditLog.createdAt,
      performedBy: auditLog.performedBy,
    },
  };
}

/**
 * Mark a draft as sent.
 */
export async function markDraftAsSent(
  draftId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<WorkflowActionResponse> {
  const currentDraft = await prisma.relayDraft.findUnique({
    where: { id: draftId },
    include: {
      inboxItem: true,
    },
  });

  if (!currentDraft) {
    throw new Error("Draft not found");
  }

  if (currentDraft.status !== "APPROVED") {
    throw new Error(
      `Cannot send draft with status ${currentDraft.status}. Draft must be approved first.`,
    );
  }

  const [updatedDraft, _updatedInboxItem, auditLog] = await prisma.$transaction([
    prisma.relayDraft.update({
      where: { id: draftId },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    }),
    // Update inbox item status to replied
    prisma.inboxItem.update({
      where: { id: currentDraft.inboxItemId },
      data: {
        status: "REPLIED",
        repliedAt: new Date(),
      },
    }),
    prisma.draftAuditLog.create({
      data: {
        draftId,
        action: "SENT",
        performedById: userId,
        ipAddress,
        userAgent,
      },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    draft: {
      id: updatedDraft.id,
      content: updatedDraft.content,
      confidenceScore: updatedDraft.confidenceScore,
      status: updatedDraft.status,
      isPreferred: updatedDraft.isPreferred,
      reason: updatedDraft.reason,
      metadata: updatedDraft.metadata as Record<string, unknown> | null,
      sentAt: updatedDraft.sentAt,
      errorMessage: updatedDraft.errorMessage,
      inboxItemId: updatedDraft.inboxItemId,
      reviewedById: updatedDraft.reviewedById,
      reviewedAt: updatedDraft.reviewedAt,
      createdAt: updatedDraft.createdAt,
      updatedAt: updatedDraft.updatedAt,
    },
    success: true,
    message: "Draft sent successfully",
    auditLog: {
      id: auditLog.id,
      draftId: auditLog.draftId,
      action: auditLog.action,
      details: auditLog.details as Record<string, unknown> | null,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      performedById: auditLog.performedById,
      createdAt: auditLog.createdAt,
      performedBy: auditLog.performedBy,
    },
  };
}

/**
 * Mark a draft as failed to send.
 */
export async function markDraftAsFailed(
  draftId: string,
  errorMessage: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<WorkflowActionResponse> {
  const currentDraft = await prisma.relayDraft.findUnique({
    where: { id: draftId },
  });

  if (!currentDraft) {
    throw new Error("Draft not found");
  }

  const [updatedDraft, auditLog] = await prisma.$transaction([
    prisma.relayDraft.update({
      where: { id: draftId },
      data: {
        status: "FAILED",
        errorMessage,
      },
    }),
    prisma.draftAuditLog.create({
      data: {
        draftId,
        action: "SEND_FAILED",
        performedById: userId,
        details: JSON.parse(JSON.stringify({ errorMessage })),
        ipAddress,
        userAgent,
      },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    draft: {
      id: updatedDraft.id,
      content: updatedDraft.content,
      confidenceScore: updatedDraft.confidenceScore,
      status: updatedDraft.status,
      isPreferred: updatedDraft.isPreferred,
      reason: updatedDraft.reason,
      metadata: updatedDraft.metadata as Record<string, unknown> | null,
      sentAt: updatedDraft.sentAt,
      errorMessage: updatedDraft.errorMessage,
      inboxItemId: updatedDraft.inboxItemId,
      reviewedById: updatedDraft.reviewedById,
      reviewedAt: updatedDraft.reviewedAt,
      createdAt: updatedDraft.createdAt,
      updatedAt: updatedDraft.updatedAt,
    },
    success: false,
    message: `Failed to send draft: ${errorMessage}`,
    auditLog: {
      id: auditLog.id,
      draftId: auditLog.draftId,
      action: auditLog.action,
      details: auditLog.details as Record<string, unknown> | null,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      performedById: auditLog.performedById,
      createdAt: auditLog.createdAt,
      performedBy: auditLog.performedBy,
    },
  };
}

// ============================================
// Draft Retrieval with History
// ============================================

/**
 * Get a draft with its full history.
 */
export async function getDraftWithHistory(
  draftId: string,
): Promise<DraftWithHistory | null> {
  const draft = await prisma.relayDraft.findUnique({
    where: { id: draftId },
    include: {
      editHistory: {
        orderBy: { createdAt: "desc" },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      reviewedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!draft) {
    return null;
  }

  return {
    id: draft.id,
    content: draft.content,
    confidenceScore: draft.confidenceScore,
    status: draft.status,
    isPreferred: draft.isPreferred,
    reason: draft.reason,
    metadata: draft.metadata as Record<string, unknown> | null,
    sentAt: draft.sentAt,
    errorMessage: draft.errorMessage,
    inboxItemId: draft.inboxItemId,
    reviewedById: draft.reviewedById,
    reviewedAt: draft.reviewedAt,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    editHistory: draft.editHistory.map((record) => ({
      id: record.id,
      draftId: record.draftId,
      originalContent: record.originalContent,
      editedContent: record.editedContent,
      editType: record.editType,
      changesSummary: record.changesSummary,
      editDistance: record.editDistance,
      editedById: record.editedById,
      createdAt: record.createdAt,
    })),
    auditLogs: draft.auditLogs.map((log) => ({
      id: log.id,
      draftId: log.draftId,
      action: log.action,
      details: log.details as Record<string, unknown> | null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      performedById: log.performedById,
      createdAt: log.createdAt,
      performedBy: log.performedBy,
    })),
    reviewedBy: draft.reviewedBy,
  };
}

// ============================================
// Workspace Approval Settings
// ============================================

/**
 * Get approval settings for a workspace.
 */
export function getApprovalSettings(
  workspaceSettings: Record<string, unknown> | null,
): RelayApprovalSettings {
  if (!workspaceSettings || !workspaceSettings["relay"]) {
    return DEFAULT_APPROVAL_SETTINGS;
  }

  const relaySettings = workspaceSettings["relay"] as Partial<RelayApprovalSettings>;

  return {
    requireApproval: relaySettings.requireApproval ?? DEFAULT_APPROVAL_SETTINGS.requireApproval,
    approverRoles: relaySettings.approverRoles ?? DEFAULT_APPROVAL_SETTINGS.approverRoles,
    autoApproveHighConfidence: relaySettings.autoApproveHighConfidence ??
      DEFAULT_APPROVAL_SETTINGS.autoApproveHighConfidence,
    autoApproveThreshold: relaySettings.autoApproveThreshold ??
      DEFAULT_APPROVAL_SETTINGS.autoApproveThreshold,
    notifyApprovers: relaySettings.notifyApprovers ?? DEFAULT_APPROVAL_SETTINGS.notifyApprovers,
    escalationTimeoutHours: relaySettings.escalationTimeoutHours ??
      DEFAULT_APPROVAL_SETTINGS.escalationTimeoutHours,
  };
}

/**
 * Update approval settings for a workspace.
 */
export async function updateApprovalSettings(
  workspaceId: string,
  settings: Partial<RelayApprovalSettings>,
): Promise<RelayApprovalSettings> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const currentSettings = (workspace.settings as Record<string, unknown>) || {};
  const currentRelaySettings = getApprovalSettings(currentSettings);

  const newRelaySettings: RelayApprovalSettings = {
    ...currentRelaySettings,
    ...settings,
  };

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      settings: JSON.parse(
        JSON.stringify({
          ...currentSettings,
          relay: newRelaySettings,
        }),
      ),
    },
  });

  return newRelaySettings;
}

// ============================================
// ML Feedback Functions
// ============================================

/**
 * Get edit feedback data for ML training.
 */
export async function getEditFeedbackData(
  workspaceId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<EditFeedbackData[]> {
  const whereClause: Record<string, unknown> = {
    draft: {
      inboxItem: {
        workspaceId,
      },
    },
  };

  if (startDate || endDate) {
    whereClause["createdAt"] = {};
    if (startDate) (whereClause["createdAt"] as Record<string, unknown>)["gte"] = startDate;
    if (endDate) (whereClause["createdAt"] as Record<string, unknown>)["lte"] = endDate;
  }

  const editHistory = await prisma.draftEditHistory.findMany({
    where: whereClause,
    include: {
      draft: {
        include: {
          inboxItem: true,
        },
      },
    },
  });

  return editHistory.map((record) => ({
    originalContent: record.originalContent,
    editedContent: record.editedContent,
    editType: record.editType,
    editDistance: record.editDistance || 0,
    originalConfidenceScore: record.draft.confidenceScore,
    platform: record.draft.inboxItem.platform,
    messageType: record.draft.inboxItem.type,
    originalMessageSentiment: "unknown", // Would need to store this
    isSubstantialEdit: record.editType === "CONTENT_REVISION" ||
      record.editType === "COMPLETE_REWRITE",
  }));
}

/**
 * Get aggregated feedback statistics.
 */
export async function getAggregatedFeedback(
  workspaceId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<AggregatedFeedback> {
  const whereClause: Record<string, unknown> = {
    draft: {
      inboxItem: {
        workspaceId,
      },
    },
  };

  if (startDate || endDate) {
    whereClause["createdAt"] = {};
    if (startDate) (whereClause["createdAt"] as Record<string, unknown>)["gte"] = startDate;
    if (endDate) (whereClause["createdAt"] as Record<string, unknown>)["lte"] = endDate;
  }

  const editHistory = await prisma.draftEditHistory.findMany({
    where: whereClause,
  });

  const totalDrafts = await prisma.relayDraft.count({
    where: {
      inboxItem: { workspaceId },
      createdAt: startDate || endDate
        ? {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        }
        : undefined,
    },
  });

  const editTypeBreakdown: Record<string, number> = {
    MINOR_TWEAK: 0,
    TONE_ADJUSTMENT: 0,
    CONTENT_REVISION: 0,
    COMPLETE_REWRITE: 0,
    PLATFORM_FORMATTING: 0,
  };

  let totalEditDistance = 0;

  for (const record of editHistory) {
    const currentCount = editTypeBreakdown[record.editType] ?? 0;
    editTypeBreakdown[record.editType] = currentCount + 1;
    totalEditDistance += record.editDistance || 0;
  }

  const totalEdits = editHistory.length;
  const averageEditDistance = totalEdits > 0 ? totalEditDistance / totalEdits : 0;
  const editRate = totalDrafts > 0 ? (totalEdits / totalDrafts) * 100 : 0;

  return {
    totalEdits,
    editTypeBreakdown: editTypeBreakdown as Record<DraftEditType, number>,
    averageEditDistance,
    editRate,
    commonPatterns: [], // Would require more sophisticated analysis
  };
}

// ============================================
// Workflow Metrics
// ============================================

/**
 * Calculate workflow metrics for a workspace.
 */
export async function getWorkflowMetrics(
  workspaceId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<WorkflowMetrics> {
  const dateFilter = startDate || endDate
    ? {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    }
    : undefined;

  // Get all drafts in the time period
  const drafts = await prisma.relayDraft.findMany({
    where: {
      inboxItem: { workspaceId },
      createdAt: dateFilter,
    },
    include: {
      editHistory: true,
    },
  });

  const reviewedDrafts = drafts.filter((d) => d.reviewedAt);
  const approvedDrafts = drafts.filter((d) => d.status === "APPROVED" || d.status === "SENT");
  const rejectedDrafts = drafts.filter((d) => d.status === "REJECTED");
  const sentDrafts = drafts.filter((d) => d.status === "SENT");
  const failedDrafts = drafts.filter((d) => d.status === "FAILED");
  const editedDrafts = drafts.filter((d) => d.editHistory.length > 0);

  // Calculate average approval time
  let totalApprovalTime = 0;
  let approvalTimeCount = 0;
  for (const draft of reviewedDrafts) {
    if (draft.reviewedAt) {
      const timeDiff = draft.reviewedAt.getTime() - draft.createdAt.getTime();
      totalApprovalTime += timeDiff / (1000 * 60); // Convert to minutes
      approvalTimeCount++;
    }
  }

  const averageApprovalTime = approvalTimeCount > 0 ? totalApprovalTime / approvalTimeCount : 0;
  const approvalRate = reviewedDrafts.length > 0
    ? (approvedDrafts.length / reviewedDrafts.length) * 100
    : 0;
  const rejectionRate = reviewedDrafts.length > 0
    ? (rejectedDrafts.length / reviewedDrafts.length) * 100
    : 0;
  const editBeforeApprovalRate = drafts.length > 0
    ? (editedDrafts.length / drafts.length) * 100
    : 0;

  // Calculate average edits per draft
  let totalEdits = 0;
  for (const draft of drafts) {
    totalEdits += draft.editHistory.length;
  }
  const averageEditsPerDraft = drafts.length > 0 ? totalEdits / drafts.length : 0;

  // Send success rate
  const totalSendAttempts = sentDrafts.length + failedDrafts.length;
  const sendSuccessRate = totalSendAttempts > 0
    ? (sentDrafts.length / totalSendAttempts) * 100
    : 100;

  return {
    averageApprovalTime,
    approvalRate,
    rejectionRate,
    editBeforeApprovalRate,
    averageEditsPerDraft,
    sendSuccessRate,
  };
}

// ============================================
// Exports for testing
// ============================================

export { classifyEditType as _classifyEditType };
export { levenshteinDistance as _levenshteinDistance };
