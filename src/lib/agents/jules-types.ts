/**
 * Jules API Types
 *
 * TypeScript types for the Google Jules async coding agent API.
 * @see https://developers.google.com/jules/api
 */

// Session state values from Jules API
export type JulesSessionState =
  | "QUEUED"
  | "PLANNING"
  | "AWAITING_PLAN_APPROVAL"
  | "AWAITING_USER_FEEDBACK"
  | "IN_PROGRESS"
  | "PAUSED"
  | "FAILED"
  | "COMPLETED";

// Automation modes for session creation
export type JulesAutomationMode = "AUTO_CREATE_PR";

// Source context for GitHub repositories
export interface JulesGithubRepoContext {
  startingBranch?: string;
}

export interface JulesSourceContext {
  source: string; // e.g., "sources/github/owner/repo"
  githubRepoContext?: JulesGithubRepoContext;
}

// Session output (e.g., pull requests)
export interface JulesSessionOutput {
  url?: string;
  title?: string;
  description?: string;
}

// Jules Session resource
export interface JulesSession {
  name: string; // Resource name, e.g., "sessions/abc123"
  id?: string;
  state: JulesSessionState;
  createTime?: string;
  updateTime?: string;
  url?: string; // Link to Jules web interface
  title?: string;
  outputs?: JulesSessionOutput[];
  planSummary?: string;
}

// Activity within a session
export interface JulesActivity {
  name: string; // Resource name
  type?: string;
  content?: string;
  createTime?: string;
}

// Source resource
export interface JulesSource {
  name: string; // e.g., "sources/github/owner/repo"
  displayName?: string;
}

// Request/Response types

export interface CreateSessionRequest {
  prompt: string;
  sourceContext: JulesSourceContext;
  title?: string;
  requirePlanApproval?: boolean;
  automationMode?: JulesAutomationMode;
}

export interface ListSessionsRequest {
  pageSize?: number;
  pageToken?: string;
}

export interface ListSessionsResponse {
  sessions: JulesSession[];
  nextPageToken?: string;
}

export interface GetSessionRequest {
  name: string; // Session resource name
}

export interface ApprovePlanRequest {
  session: string; // Session resource name
}

export interface SendMessageRequest {
  session: string; // Session resource name
  prompt: string;
}

export interface ListActivitiesRequest {
  parent: string; // Session resource name
  pageSize?: number;
  pageToken?: string;
}

export interface ListActivitiesResponse {
  activities: JulesActivity[];
  nextPageToken?: string;
}

export interface ListSourcesRequest {
  pageSize?: number;
  pageToken?: string;
}

export interface ListSourcesResponse {
  sources: JulesSource[];
  nextPageToken?: string;
}

// Error response from Jules API
export interface JulesApiError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

// Client configuration
export interface JulesClientConfig {
  apiKey: string;
  baseUrl?: string;
}

// Mapped types for internal use
export type JulesStateToInternalStatus = {
  QUEUED: "QUEUED";
  PLANNING: "PLANNING";
  AWAITING_PLAN_APPROVAL: "AWAITING_PLAN_APPROVAL";
  AWAITING_USER_FEEDBACK: "AWAITING_USER_FEEDBACK";
  IN_PROGRESS: "IN_PROGRESS";
  PAUSED: "PAUSED";
  FAILED: "FAILED";
  COMPLETED: "COMPLETED";
};
