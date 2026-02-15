import logger from "@/lib/logger";

const SENTRY_BASE = "https://sentry.io/api/0";

interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  level: string;
  status: string;
  count: string;
  firstSeen: string;
  lastSeen: string;
  shortId: string;
}

interface SentryStats {
  received: number[];
  rejected: number[];
  blacklisted: number[];
}

interface SentryIssueDetail extends SentryIssue {
  metadata: Record<string, unknown>;
  type: string;
  permalink: string;
}

function getAuth(): string | null {
  return process.env.SENTRY_MCP_AUTH_TOKEN ?? null;
}

function getOrgSlug(): string {
  return process.env["SENTRY_ORG_SLUG"] ?? "spike-land";
}

function getProjectSlug(): string {
  return process.env["SENTRY_PROJECT_SLUG"] ?? "spike-land-nextjs";
}

async function sentryFetch<T>(path: string, timeoutMs = 10_000): Promise<T | null> {
  const token = getAuth();
  if (!token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${SENTRY_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!res.ok) {
      logger.warn(`Sentry API error: ${res.status} ${res.statusText}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    logger.warn("Sentry API fetch failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function listSentryIssues(
  options?: { query?: string; limit?: number },
): Promise<SentryIssue[] | null> {
  const org = getOrgSlug();
  const project = getProjectSlug();
  const params = new URLSearchParams();
  if (options?.query) params.set("query", options.query);
  params.set("limit", String(options?.limit ?? 25));
  return sentryFetch<SentryIssue[]>(`/projects/${org}/${project}/issues/?${params}`);
}

export async function getSentryIssueDetail(issueId: string): Promise<SentryIssueDetail | null> {
  return sentryFetch<SentryIssueDetail>(`/issues/${issueId}/`);
}

export async function getSentryStats(): Promise<SentryStats | null> {
  const org = getOrgSlug();
  const project = getProjectSlug();
  return sentryFetch<SentryStats>(`/projects/${org}/${project}/stats/`);
}

export type { SentryIssue, SentryIssueDetail, SentryStats };
