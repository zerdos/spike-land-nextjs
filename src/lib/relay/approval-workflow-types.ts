/**
 * Approval Workflow Types
 *
 * Type definitions for the Relay draft approval workflow.
 * Resolves #569
 */

import type { DraftAuditAction, DraftEditType, RelayDraftStatus } from "@prisma/client";

// ============================================
// Workspace Approval Settings
// ============================================

export interface RelayApprovalSettings {
  /** Whether drafts require approval before sending */
  requireApproval: boolean;
  /** Roles that can approve drafts */
  approverRoles: ApproverRole[];
  /** Whether to auto-approve high-confidence drafts */
  autoApproveHighConfidence: boolean;
  /** Minimum confidence score for auto-approval (0-1) */
  autoApproveThreshold: number;
  /** Whether to notify approvers of new drafts */
  notifyApprovers: boolean;
  /** Maximum time (in hours) before escalating unreviewed drafts */
  escalationTimeoutHours: number | null;
}

export type ApproverRole = "OWNER" | "ADMIN" | "MEMBER";

export const DEFAULT_APPROVAL_SETTINGS: RelayApprovalSettings = {
  requireApproval: true,
  approverRoles: ["OWNER", "ADMIN"],
  autoApproveHighConfidence: false,
  autoApproveThreshold: 0.95,
  notifyApprovers: true,
  escalationTimeoutHours: 24,
};

// ============================================
// Draft Edit Types
// ============================================

export interface EditDraftRequest {
  /** ID of the draft to edit */
  draftId: string;
  /** New content for the draft */
  content: string;
  /** Optional reason for the edit */
  reason?: string;
}

export interface EditDraftResponse {
  /** Updated draft */
  draft: DraftWithHistory;
  /** Edit history record */
  editHistory: DraftEditHistoryRecord;
  /** Type of edit detected */
  editType: DraftEditType;
}

export interface DraftEditHistoryRecord {
  id: string;
  draftId: string;
  originalContent: string;
  editedContent: string;
  editType: DraftEditType;
  changesSummary: string | null;
  editDistance: number | null;
  editedById: string;
  createdAt: Date;
}

// ============================================
// Audit Log Types
// ============================================

export interface CreateAuditLogParams {
  draftId: string;
  action: DraftAuditAction;
  performedById: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface DraftAuditLogRecord {
  id: string;
  draftId: string;
  action: DraftAuditAction;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  performedById: string;
  createdAt: Date;
  performedBy?: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export interface AuditLogFilters {
  draftId?: string;
  action?: DraftAuditAction;
  performedById?: string;
  startDate?: Date;
  endDate?: Date;
}

// ============================================
// Workflow Action Types
// ============================================

export interface ApproveWorkflowRequest {
  /** ID of the draft to approve */
  draftId: string;
  /** Optional note from the approver */
  note?: string;
}

export interface RejectWorkflowRequest {
  /** ID of the draft to reject */
  draftId: string;
  /** Reason for rejection */
  reason: string;
}

export interface SendDraftWorkflowRequest {
  /** ID of the draft to send */
  draftId: string;
}

export interface WorkflowActionResponse {
  /** Updated draft */
  draft: DraftWithHistory;
  /** Whether the action was successful */
  success: boolean;
  /** Message describing the result */
  message: string;
  /** Audit log record for the action */
  auditLog: DraftAuditLogRecord;
}

// ============================================
// Draft with History
// ============================================

export interface DraftWithHistory {
  id: string;
  content: string;
  confidenceScore: number;
  status: RelayDraftStatus;
  isPreferred: boolean;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  sentAt: Date | null;
  errorMessage: string | null;
  inboxItemId: string;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  editHistory?: DraftEditHistoryRecord[];
  auditLogs?: DraftAuditLogRecord[];
  reviewedBy?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

// ============================================
// ML Feedback Types
// ============================================

export interface EditFeedbackData {
  /** Original AI-generated content */
  originalContent: string;
  /** User-edited content */
  editedContent: string;
  /** Type of edit made */
  editType: DraftEditType;
  /** Edit distance (Levenshtein) */
  editDistance: number;
  /** Confidence score of original draft */
  originalConfidenceScore: number;
  /** Platform the draft was for */
  platform: string;
  /** Message type being responded to */
  messageType: string;
  /** Sentiment of original message */
  originalMessageSentiment: string;
  /** Whether the edit was substantial */
  isSubstantialEdit: boolean;
}

export interface AggregatedFeedback {
  /** Total number of edits */
  totalEdits: number;
  /** Breakdown by edit type */
  editTypeBreakdown: Record<DraftEditType, number>;
  /** Average edit distance */
  averageEditDistance: number;
  /** Percentage of drafts that were edited */
  editRate: number;
  /** Common patterns in edits */
  commonPatterns: string[];
}

// ============================================
// API Request/Response Types
// ============================================

export interface GetDraftHistoryRequest {
  draftId: string;
}

export interface GetDraftHistoryResponse {
  draft: DraftWithHistory;
  editHistory: DraftEditHistoryRecord[];
  auditLogs: DraftAuditLogRecord[];
}

export interface GetAuditLogsRequest {
  filters?: AuditLogFilters;
  limit?: number;
  offset?: number;
}

export interface GetAuditLogsResponse {
  auditLogs: DraftAuditLogRecord[];
  total: number;
}

// ============================================
// Workflow Metrics
// ============================================

export interface WorkflowMetrics {
  /** Average time from draft creation to approval (in minutes) */
  averageApprovalTime: number;
  /** Approval rate (approved / total reviewed) */
  approvalRate: number;
  /** Rejection rate (rejected / total reviewed) */
  rejectionRate: number;
  /** Edit rate (drafts edited before approval) */
  editBeforeApprovalRate: number;
  /** Average edits per draft */
  averageEditsPerDraft: number;
  /** Send success rate */
  sendSuccessRate: number;
}
