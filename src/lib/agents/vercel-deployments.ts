/**
 * Vercel Deployments Client
 *
 * Utility for fetching Vercel deployment information (preview URLs).
 */

import { tryCatch } from "@/lib/try-catch";

const VERCEL_API_BASE = "https://api.vercel.com";

export interface VercelDeployment {
  id: string;
  url: string;
  state: string;
  readyState: string;
  createdAt: number;
  buildingAt: number | null;
  ready: number | null;
  gitBranch: string | null;
  gitCommitSha: string | null;
  gitCommitMessage: string | null;
}

/**
 * Check if Vercel API is available (token is configured)
 */
export function isVercelAvailable(): boolean {
  return !!process.env.VERCEL_ACCESS_TOKEN;
}

/**
 * Get Vercel configuration from environment
 */
function getVercelConfig() {
  const token = process.env.VERCEL_ACCESS_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  return { token, projectId, teamId };
}

/**
 * Make a request to the Vercel API
 */
async function vercelRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: string | null; }> {
  const { token, teamId } = getVercelConfig();

  if (!token) {
    return { data: null, error: "VERCEL_ACCESS_TOKEN is not configured" };
  }

  // Add teamId to query params if available
  const separator = endpoint.includes("?") ? "&" : "?";
  const url = teamId
    ? `${VERCEL_API_BASE}${endpoint}${separator}teamId=${teamId}`
    : `${VERCEL_API_BASE}${endpoint}`;

  const { data: response, error: fetchError } = await tryCatch(
    fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
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
    const message = (json as { error?: { message?: string; }; })?.error?.message ||
      `API error: ${response.status}`;
    return { data: null, error: message };
  }

  return { data: json as T, error: null };
}

/**
 * Get preview deployment for a specific branch
 */
export async function getPreviewDeployment(
  branch: string,
): Promise<{ data: VercelDeployment | null; error: string | null; }> {
  const { projectId } = getVercelConfig();

  if (!projectId) {
    return { data: null, error: "VERCEL_PROJECT_ID is not configured" };
  }

  // Fetch recent deployments for the project
  const { data, error } = await vercelRequest<{
    deployments: Array<{
      uid: string;
      url: string;
      state: string;
      readyState: string;
      createdAt: number;
      buildingAt: number | null;
      ready: number | null;
      meta?: {
        githubCommitRef?: string;
        githubCommitSha?: string;
        githubCommitMessage?: string;
      };
    }>;
  }>(`/v6/deployments?projectId=${projectId}&target=preview&limit=50`);

  if (error || !data) {
    return { data: null, error };
  }

  // Find the most recent deployment for the specified branch
  const deployment = data.deployments.find(
    (d) => d.meta?.githubCommitRef === branch,
  );

  if (!deployment) {
    return { data: null, error: null }; // No deployment found for this branch
  }

  return {
    data: {
      id: deployment.uid,
      url: `https://${deployment.url}`,
      state: deployment.state,
      readyState: deployment.readyState,
      createdAt: deployment.createdAt,
      buildingAt: deployment.buildingAt,
      ready: deployment.ready,
      gitBranch: deployment.meta?.githubCommitRef || null,
      gitCommitSha: deployment.meta?.githubCommitSha || null,
      gitCommitMessage: deployment.meta?.githubCommitMessage || null,
    },
    error: null,
  };
}

/**
 * Get preview deployment by commit SHA
 */
export async function getPreviewDeploymentBySha(
  sha: string,
): Promise<{ data: VercelDeployment | null; error: string | null; }> {
  const { projectId } = getVercelConfig();

  if (!projectId) {
    return { data: null, error: "VERCEL_PROJECT_ID is not configured" };
  }

  // Fetch recent deployments for the project
  const { data, error } = await vercelRequest<{
    deployments: Array<{
      uid: string;
      url: string;
      state: string;
      readyState: string;
      createdAt: number;
      buildingAt: number | null;
      ready: number | null;
      meta?: {
        githubCommitRef?: string;
        githubCommitSha?: string;
        githubCommitMessage?: string;
      };
    }>;
  }>(`/v6/deployments?projectId=${projectId}&target=preview&limit=50`);

  if (error || !data) {
    return { data: null, error };
  }

  // Find the deployment for the specified SHA
  const deployment = data.deployments.find(
    (d) => d.meta?.githubCommitSha === sha,
  );

  if (!deployment) {
    return { data: null, error: null }; // No deployment found for this SHA
  }

  return {
    data: {
      id: deployment.uid,
      url: `https://${deployment.url}`,
      state: deployment.state,
      readyState: deployment.readyState,
      createdAt: deployment.createdAt,
      buildingAt: deployment.buildingAt,
      ready: deployment.ready,
      gitBranch: deployment.meta?.githubCommitRef || null,
      gitCommitSha: deployment.meta?.githubCommitSha || null,
      gitCommitMessage: deployment.meta?.githubCommitMessage || null,
    },
    error: null,
  };
}
