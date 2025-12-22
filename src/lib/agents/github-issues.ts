/**
 * GitHub Issues Client
 *
 * Utility for fetching GitHub issues via REST API.
 */

import { tryCatch } from "@/lib/try-catch";

const GITHUB_API_BASE = "https://api.github.com";

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  labels: string[];
  author: string;
  assignees: string[];
  createdAt: string;
  updatedAt: string;
  url: string;
  body: string | null;
}

export interface GitHubProjectItem {
  id: string;
  content: {
    type: string;
    number?: number;
    title?: string;
  };
}

interface GitHubApiIssue {
  number: number;
  title: string;
  state: string;
  labels: Array<{ name: string; }>;
  user: { login: string; };
  assignees: Array<{ login: string; }>;
  created_at: string;
  updated_at: string;
  html_url: string;
  body: string | null;
}

/**
 * Check if GitHub API is available (token is configured)
 */
export function isGitHubAvailable(): boolean {
  return !!process.env.GITHUB_TOKEN;
}

/**
 * Get GitHub configuration from environment
 */
function getGitHubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || "zerdos";
  const repo = process.env.GITHUB_REPO || "spike-land-nextjs";
  const projectNumber = parseInt(process.env.GITHUB_PROJECT_NUMBER || "2");

  return { token, owner, repo, projectNumber };
}

/**
 * Make a request to the GitHub API
 */
async function githubRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: string | null; }> {
  const { token } = getGitHubConfig();

  if (!token) {
    return { data: null, error: "GITHUB_TOKEN is not configured" };
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${GITHUB_API_BASE}${endpoint}`;

  const { data: response, error: fetchError } = await tryCatch(
    fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...options.headers,
      },
    }),
  );

  if (fetchError) {
    return { data: null, error: `Network error: ${fetchError.message}` };
  }

  if (!response) {
    return { data: null, error: "No response received" };
  }

  const { data: json, error: jsonError } = await tryCatch(response.json());

  if (jsonError) {
    return { data: null, error: `Failed to parse response: ${jsonError.message}` };
  }

  if (!response.ok) {
    const message = (json as { message?: string; })?.message || `API error: ${response.status}`;
    return { data: null, error: message };
  }

  return { data: json as T, error: null };
}

/**
 * List open issues for the repository
 */
export async function listIssues(options?: {
  state?: "open" | "closed" | "all";
  labels?: string;
  limit?: number;
}): Promise<{ data: GitHubIssue[] | null; error: string | null; }> {
  const { owner, repo } = getGitHubConfig();
  const { state = "open", labels, limit = 20 } = options || {};

  const params = new URLSearchParams({
    state,
    per_page: String(limit),
    sort: "updated",
    direction: "desc",
  });

  if (labels) {
    params.set("labels", labels);
  }

  const { data, error } = await githubRequest<GitHubApiIssue[]>(
    `/repos/${owner}/${repo}/issues?${params}`,
  );

  if (error || !data) {
    return { data: null, error };
  }

  const issues: GitHubIssue[] = data.map((issue) => ({
    number: issue.number,
    title: issue.title,
    state: issue.state,
    labels: issue.labels.map((l) => l.name),
    author: issue.user.login,
    assignees: issue.assignees.map((a) => a.login),
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    url: issue.html_url,
    body: issue.body,
  }));

  return { data: issues, error: null };
}

/**
 * Get workflow runs (CI/CD status)
 */
export async function getWorkflowRuns(options?: { limit?: number; }): Promise<{
  data:
    | Array<{
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
      branch: string;
      event: string;
      createdAt: string;
      url: string;
    }>
    | null;
  error: string | null;
}> {
  const { owner, repo } = getGitHubConfig();
  const { limit = 10 } = options || {};

  const { data, error } = await githubRequest<{
    workflow_runs: Array<{
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
      head_branch: string;
      event: string;
      created_at: string;
      html_url: string;
    }>;
  }>(`/repos/${owner}/${repo}/actions/runs?per_page=${limit}`);

  if (error || !data) {
    return { data: null, error };
  }

  const runs = data.workflow_runs.map((run) => ({
    id: run.id,
    name: run.name,
    status: run.status,
    conclusion: run.conclusion,
    branch: run.head_branch,
    event: run.event,
    createdAt: run.created_at,
    url: run.html_url,
  }));

  return { data: runs, error: null };
}

// =============================================================================
// Pull Request Status Functions
// =============================================================================

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: string;
  headBranch: string;
  headSha: string;
  baseBranch: string;
  url: string;
  mergeableState: string | null;
  draft: boolean;
}

export interface GitHubCommitStatus {
  state: "success" | "failure" | "pending" | "error";
  totalCount: number;
  statuses: Array<{
    context: string;
    state: string;
    description: string | null;
    targetUrl: string | null;
  }>;
}

export interface GitHubCheckRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  url: string;
}

export interface GitHubBranchComparison {
  aheadBy: number;
  behindBy: number;
  status: "ahead" | "behind" | "identical" | "diverged";
}

/**
 * Get pull request details by PR number
 */
export async function getPullRequest(
  prNumber: number,
): Promise<{ data: GitHubPullRequest | null; error: string | null; }> {
  const { owner, repo } = getGitHubConfig();

  const { data, error } = await githubRequest<{
    number: number;
    title: string;
    state: string;
    head: { ref: string; sha: string; };
    base: { ref: string; };
    html_url: string;
    mergeable_state: string | null;
    draft: boolean;
  }>(`/repos/${owner}/${repo}/pulls/${prNumber}`);

  if (error || !data) {
    return { data: null, error };
  }

  return {
    data: {
      number: data.number,
      title: data.title,
      state: data.state,
      headBranch: data.head.ref,
      headSha: data.head.sha,
      baseBranch: data.base.ref,
      url: data.html_url,
      mergeableState: data.mergeable_state,
      draft: data.draft,
    },
    error: null,
  };
}

/**
 * Get combined commit status for a ref (branch or SHA)
 */
export async function getCommitStatus(
  ref: string,
): Promise<{ data: GitHubCommitStatus | null; error: string | null; }> {
  const { owner, repo } = getGitHubConfig();

  const { data, error } = await githubRequest<{
    state: "success" | "failure" | "pending" | "error";
    total_count: number;
    statuses: Array<{
      context: string;
      state: string;
      description: string | null;
      target_url: string | null;
    }>;
  }>(`/repos/${owner}/${repo}/commits/${ref}/status`);

  if (error || !data) {
    return { data: null, error };
  }

  return {
    data: {
      state: data.state,
      totalCount: data.total_count,
      statuses: data.statuses.map((s) => ({
        context: s.context,
        state: s.state,
        description: s.description,
        targetUrl: s.target_url,
      })),
    },
    error: null,
  };
}

/**
 * Get check runs for a ref (branch or SHA)
 */
export async function getCheckRuns(
  ref: string,
): Promise<{ data: GitHubCheckRun[] | null; error: string | null; }> {
  const { owner, repo } = getGitHubConfig();

  const { data, error } = await githubRequest<{
    check_runs: Array<{
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
      html_url: string;
    }>;
  }>(`/repos/${owner}/${repo}/commits/${ref}/check-runs`);

  if (error || !data) {
    return { data: null, error };
  }

  return {
    data: data.check_runs.map((run) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      url: run.html_url,
    })),
    error: null,
  };
}

/**
 * Compare two branches to see if one is ahead/behind the other
 */
export async function compareBranches(
  base: string,
  head: string,
): Promise<{ data: GitHubBranchComparison | null; error: string | null; }> {
  const { owner, repo } = getGitHubConfig();

  const { data, error } = await githubRequest<{
    ahead_by: number;
    behind_by: number;
    status: "ahead" | "behind" | "identical" | "diverged";
  }>(`/repos/${owner}/${repo}/compare/${base}...${head}`);

  if (error || !data) {
    return { data: null, error };
  }

  return {
    data: {
      aheadBy: data.ahead_by,
      behindBy: data.behind_by,
      status: data.status,
    },
    error: null,
  };
}

/**
 * Extract PR number from a GitHub PR URL
 */
export function extractPrNumberFromUrl(url: string): number | null {
  const match = url.match(/\/pull\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
