/**
 * Client Portal Validation Schemas
 *
 * Zod schemas for validating client portal API requests and responses
 */

import {
  ApprovalStatus,
  ApproverDecision,
  ClientActivityType,
  StageStatus,
  UserRole,
} from "@prisma/client";
import { z } from "zod";

// ============================================================================
// Client Access Schemas
// ============================================================================

export const grantClientAccessSchema = z.object({
  clientId: z.string().cuid(),
  canViewContent: z.boolean().default(true),
  canComment: z.boolean().default(true),
  canApprove: z.boolean().default(true),
  canViewAnalytics: z.boolean().default(false),
  accessibleContentIds: z.array(z.string()).optional().nullable(),
  accessibleFolderIds: z.array(z.string()).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const updateClientAccessSchema = z.object({
  canViewContent: z.boolean().optional(),
  canComment: z.boolean().optional(),
  canApprove: z.boolean().optional(),
  canViewAnalytics: z.boolean().optional(),
  accessibleContentIds: z.array(z.string()).optional().nullable(),
  accessibleFolderIds: z.array(z.string()).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

// ============================================================================
// Comment Schemas
// ============================================================================

export const createCommentSchema = z.object({
  contentType: z.enum(["draft", "scheduled_post", "asset"]),
  contentId: z.string().cuid(),
  content: z.string().min(1).max(5000),
  parentId: z.string().cuid().optional(),
  mentions: z.array(z.string().cuid()).optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const resolveCommentSchema = z.object({
  isResolved: z.boolean(),
});

export const listCommentsQuerySchema = z.object({
  contentType: z.enum(["draft", "scheduled_post", "asset"]).optional(),
  contentId: z.string().cuid().optional(),
  isResolved: z.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// Workflow Schemas
// ============================================================================

export const workflowStageSchema = z.object({
  order: z.number().int().min(1),
  name: z.string().min(1).max(100),
  requiredApprovers: z.array(z.string().cuid()).min(1),
  approvalThreshold: z.number().int().min(1),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  stages: z.array(workflowStageSchema).min(1).max(10),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  stages: z.array(workflowStageSchema).min(1).max(10).optional(),
});

// ============================================================================
// Approval Request Schemas
// ============================================================================

export const submitApprovalSchema = z.object({
  workflowId: z.string().cuid(),
  contentType: z.enum(["draft", "scheduled_post", "asset"]),
  contentId: z.string().cuid(),
  notes: z.string().max(1000).optional(),
});

export const approveStageSchema = z.object({
  decision: z.nativeEnum(ApproverDecision),
  comments: z.string().max(1000).optional(),
});

export const listApprovalsQuerySchema = z.object({
  status: z.nativeEnum(ApprovalStatus).optional(),
  contentType: z.enum(["draft", "scheduled_post", "asset"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// Activity Feed Schemas
// ============================================================================

export const listActivityQuerySchema = z.object({
  contentType: z.enum(["draft", "scheduled_post", "asset"]).optional(),
  contentId: z.string().cuid().optional(),
  activityType: z.nativeEnum(ClientActivityType).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// Response Schemas (for type inference)
// ============================================================================

export const clientAccessResponseSchema = z.object({
  id: z.string().cuid(),
  clientId: z.string().cuid(),
  workspaceId: z.string().cuid(),
  canViewContent: z.boolean(),
  canComment: z.boolean(),
  canApprove: z.boolean(),
  canViewAnalytics: z.boolean(),
  accessibleContentIds: z.array(z.string()).nullable(),
  accessibleFolderIds: z.array(z.string()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date().nullable(),
  client: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      image: z.string().nullable(),
    })
    .optional(),
});

export const commentResponseSchema: z.ZodType<{
  id: string;
  contentType: string;
  contentId: string;
  content: string;
  authorId: string;
  authorRole: UserRole;
  parentId: string | null;
  threadRoot: string | null;
  mentions: string[] | null;
  isResolved: boolean;
  resolvedAt: Date | null;
  resolvedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: UserRole;
  };
  replies?: unknown[];
}> = z.object({
  id: z.string().cuid(),
  contentType: z.string(),
  contentId: z.string().cuid(),
  content: z.string(),
  authorId: z.string().cuid(),
  authorRole: z.nativeEnum(UserRole),
  parentId: z.string().cuid().nullable(),
  threadRoot: z.string().cuid().nullable(),
  mentions: z.array(z.string()).nullable(),
  isResolved: z.boolean(),
  resolvedAt: z.date().nullable(),
  resolvedById: z.string().cuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  author: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    image: z.string().nullable(),
    role: z.nativeEnum(UserRole),
  }),
  replies: z.array(z.lazy(() => commentResponseSchema)).optional(),
});

export const approvalWorkflowResponseSchema = z.object({
  id: z.string().cuid(),
  workspaceId: z.string().cuid(),
  name: z.string(),
  description: z.string().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  stages: z.array(workflowStageSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const approvalStageResponseSchema = z.object({
  id: z.string().cuid(),
  requestId: z.string().cuid(),
  stageOrder: z.number().int(),
  stageName: z.string(),
  status: z.nativeEnum(StageStatus),
  requiredApprovers: z.array(z.string()),
  approvalThreshold: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
  approvers: z.array(
    z.object({
      id: z.string().cuid(),
      approverId: z.string().cuid(),
      decision: z.nativeEnum(ApproverDecision).nullable(),
      decidedAt: z.date().nullable(),
      comments: z.string().nullable(),
      approver: z.object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string().nullable(),
        image: z.string().nullable(),
      }),
    }),
  ),
});

export const approvalRequestResponseSchema = z.object({
  id: z.string().cuid(),
  workflowId: z.string().cuid(),
  contentType: z.string(),
  contentId: z.string().cuid(),
  currentStage: z.number().int(),
  status: z.nativeEnum(ApprovalStatus),
  submittedById: z.string().cuid(),
  finalDecisionById: z.string().cuid().nullable(),
  finalDecisionAt: z.date().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  workflow: z.object({
    id: z.string(),
    name: z.string(),
  }),
  submittedBy: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  }),
  stages: z.array(approvalStageResponseSchema),
});

export const activityFeedItemSchema = z.object({
  id: z.string().cuid(),
  activityType: z.nativeEnum(ClientActivityType),
  contentType: z.string(),
  contentId: z.string().cuid(),
  actorId: z.string().cuid(),
  actorRole: z.nativeEnum(UserRole),
  title: z.string(),
  description: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  isClientVisible: z.boolean(),
  createdAt: z.date(),
  actor: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    image: z.string().nullable(),
  }),
});

// ============================================================================
// Type exports
// ============================================================================

export type GrantClientAccessInput = z.infer<typeof grantClientAccessSchema>;
export type UpdateClientAccessInput = z.infer<
  typeof updateClientAccessSchema
>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type ResolveCommentInput = z.infer<typeof resolveCommentSchema>;
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;
export type WorkflowStage = z.infer<typeof workflowStageSchema>;
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type SubmitApprovalInput = z.infer<typeof submitApprovalSchema>;
export type ApproveStageInput = z.infer<typeof approveStageSchema>;
export type ListApprovalsQuery = z.infer<typeof listApprovalsQuerySchema>;
export type ListActivityQuery = z.infer<typeof listActivityQuerySchema>;
export type ClientAccessResponse = z.infer<typeof clientAccessResponseSchema>;
export type CommentResponse = z.infer<typeof commentResponseSchema>;
export type ApprovalWorkflowResponse = z.infer<
  typeof approvalWorkflowResponseSchema
>;
export type ApprovalStageResponse = z.infer<typeof approvalStageResponseSchema>;
export type ApprovalRequestResponse = z.infer<
  typeof approvalRequestResponseSchema
>;
export type ActivityFeedItem = z.infer<typeof activityFeedItemSchema>;
