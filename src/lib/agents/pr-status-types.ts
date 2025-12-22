/**
 * PR Status Types
 *
 * TypeScript interfaces for the combined PR status data
 * returned by the PR status API endpoint.
 */

export interface PRCheckResult {
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion:
    | "success"
    | "failure"
    | "neutral"
    | "cancelled"
    | "skipped"
    | "timed_out"
    | "action_required"
    | null;
  url: string;
}

export interface PRStatus {
  // PR info
  prNumber: number;
  prUrl: string;
  prTitle: string;
  targetBranch: string;
  headBranch: string;
  headSha: string;
  draft: boolean;
  mergeableState: string | null;

  // Branch comparison
  behindBy: number;
  aheadBy: number;
  isUpToDate: boolean;

  // CI Status
  ciStatus: "success" | "failure" | "pending" | "error" | "unknown";
  ciStatusMessage: string;
  checks: PRCheckResult[];
  checksTotal: number;
  checksPassed: number;
  checksFailed: number;
  checksPending: number;

  // Vercel preview
  previewUrl: string | null;
  previewState: string | null;

  // Metadata
  fetchedAt: string;
}

export interface PRStatusResponse {
  success: boolean;
  data: PRStatus | null;
  error: string | null;
}
