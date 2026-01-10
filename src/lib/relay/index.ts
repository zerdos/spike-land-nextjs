/**
 * Relay Module Exports
 *
 * AI-powered response draft generation for social media inbox.
 * Resolves #555, #569
 */

// Draft generation functions
export {
  approveDraft,
  generateDrafts,
  getDraftsForInboxItem,
  regenerateDrafts,
  rejectDraft,
  saveDraftsToDatabase,
} from "./generate-drafts";

// Approval workflow functions
export {
  approveDraftWorkflow,
  createAuditLog,
  editDraft,
  getAggregatedFeedback,
  getApprovalSettings,
  getAuditLogs,
  getDraftWithHistory,
  getEditFeedbackData,
  getEditHistory,
  getWorkflowMetrics,
  markDraftAsFailed,
  markDraftAsSent,
  rejectDraftWorkflow,
  updateApprovalSettings,
} from "./approval-workflow";

// Draft generation types
export type {
  ApproveDraftRequest,
  DraftMetadata,
  DraftResponse,
  GeminiDraftResponse,
  GeneratedDraft,
  GenerateDraftParams,
  GenerateDraftsRequest,
  GenerateDraftsResponse,
  InboxItemData,
  MessageAnalysis,
  MessageIntent,
  SaveDraftRequest,
  SendDraftRequest,
  ToneMatchScore,
} from "./relay-types";

// Approval workflow types
export type {
  AggregatedFeedback,
  ApproverRole,
  ApproveWorkflowRequest,
  AuditLogFilters,
  CreateAuditLogParams,
  DraftAuditLogRecord,
  DraftEditHistoryRecord,
  DraftWithHistory,
  EditDraftRequest,
  EditDraftResponse,
  EditFeedbackData,
  GetAuditLogsRequest,
  GetAuditLogsResponse,
  GetDraftHistoryRequest,
  GetDraftHistoryResponse,
  RejectWorkflowRequest,
  RelayApprovalSettings,
  SendDraftWorkflowRequest,
  WorkflowActionResponse,
  WorkflowMetrics,
} from "./approval-workflow-types";

export { DEFAULT_APPROVAL_SETTINGS } from "./approval-workflow-types";
export { getPlatformCharacterLimit, PLATFORM_CHARACTER_LIMITS } from "./relay-types";
