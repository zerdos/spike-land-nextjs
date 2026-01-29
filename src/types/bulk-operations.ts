import type { BulkOperationType, BulkOperationStatus } from "@prisma/client";

/**
 * Bulk Operation
 */
export interface BulkOperation {
  id: string;
  userId: string;
  type: BulkOperationType;
  status: BulkOperationStatus;
  workspaceIds: string[];
  operationData: BulkOperationData;
  successCount: number;
  failureCount: number;
  totalCount: number;
  results: BulkOperationResult[];
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

/**
 * Bulk operation data (polymorphic based on type)
 */
export type BulkOperationData =
  | SchedulePostData
  | PublishPostData
  | DeletePostData
  | UpdateSettingsData
  | InviteMemberData;

/**
 * Schedule post operation data
 */
export interface SchedulePostData {
  type: "SCHEDULE_POST";
  content: string;
  scheduledAt: string; // ISO date string
  platforms: string[];
  mediaUrls?: string[];
}

/**
 * Publish post operation data
 */
export interface PublishPostData {
  type: "PUBLISH_POST";
  draftIds: string[];
}

/**
 * Delete post operation data
 */
export interface DeletePostData {
  type: "DELETE_POST";
  postIds: string[];
}

/**
 * Update settings operation data
 */
export interface UpdateSettingsData {
  type: "UPDATE_SETTINGS";
  settings: Record<string, unknown>;
}

/**
 * Invite member operation data
 */
export interface InviteMemberData {
  type: "INVITE_MEMBER";
  email: string;
  role: string;
}

/**
 * Result of a bulk operation for a single workspace
 */
export interface BulkOperationResult {
  workspaceId: string;
  workspaceName: string;
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Request to create a bulk operation
 */
export interface CreateBulkOperationRequest {
  type: BulkOperationType;
  workspaceIds: string[];
  operationData: BulkOperationData;
}

/**
 * API response for bulk operation list
 */
export interface BulkOperationsApiResponse {
  operations: BulkOperation[];
  total: number;
}

/**
 * Bulk operation status update
 */
export interface BulkOperationStatusUpdate {
  status: BulkOperationStatus;
  successCount?: number;
  failureCount?: number;
  results?: BulkOperationResult[];
}

/**
 * Operation types
 */
export const BULK_OPERATION_TYPES = {
  SCHEDULE_POST: "SCHEDULE_POST",
  PUBLISH_POST: "PUBLISH_POST",
  DELETE_POST: "DELETE_POST",
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
  INVITE_MEMBER: "INVITE_MEMBER",
} as const;

/**
 * Operation statuses
 */
export const BULK_OPERATION_STATUSES = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;
