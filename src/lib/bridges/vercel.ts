import logger from "@/lib/logger";

const VERCEL_BASE = "https://api.vercel.com";

interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  created: number;
  ready: number;
  source: string;
  meta: Record<string, unknown>;
}

interface VercelDeploymentDetail extends VercelDeployment {
  alias: string[];
  regions: string[];
  buildingAt: number;
  readyState: string;
  inspectorUrl: string;
}

interface VercelAnalytics {
  pageViews: number;
  visitors: number;
  bounceRate: number;
  avgDuration: number;
  topPages: Array<{ path: string; views: number }>;
}

function getAuth(): string | null {
  return process.env.VERCEL_TOKEN ?? null;
}

function getTeamId(): string | null {
  return process.env.VERCEL_TEAM_ID ?? null;
}

async function vercelFetch<T>(path: string, timeoutMs = 10_000): Promise<T | null> {
  const token = getAuth();
  if (!token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL(`${VERCEL_BASE}${path}`);
    const teamId = getTeamId();
    if (teamId) url.searchParams.set("teamId", teamId);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!res.ok) {
      logger.warn(`Vercel API error: ${res.status} ${res.statusText}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    logger.warn("Vercel API fetch failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function listVercelDeployments(
  options?: { limit?: number; projectId?: string; state?: string },
): Promise<VercelDeployment[] | null> {
  const params = new URLSearchParams();
  params.set("limit", String(options?.limit ?? 20));
  if (options?.projectId) params.set("projectId", options.projectId);
  if (options?.state) params.set("state", options.state);

  const result = await vercelFetch<{ deployments: VercelDeployment[] }>(
    `/v6/deployments?${params}`,
  );
  return result?.deployments ?? null;
}

export async function getVercelDeployment(id: string): Promise<VercelDeploymentDetail | null> {
  return vercelFetch<VercelDeploymentDetail>(`/v13/deployments/${id}`);
}

export async function getVercelAnalytics(
  options?: { from?: number; to?: number },
): Promise<VercelAnalytics | null> {
  const params = new URLSearchParams();
  if (options?.from) params.set("from", String(options.from));
  if (options?.to) params.set("to", String(options.to));
  return vercelFetch<VercelAnalytics>(`/v1/analytics?${params}`);
}

export async function promoteDeployment(deploymentId: string): Promise<boolean> {
  const token = getAuth();
  if (!token) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const url = new URL(`${VERCEL_BASE}/v10/projects/promote`);
    const teamId = getTeamId();
    if (teamId) url.searchParams.set("teamId", teamId);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deploymentId }),
      signal: controller.signal,
    });

    if (!res.ok) {
      logger.warn(`Vercel promote failed: ${res.status} ${res.statusText}`);
      return false;
    }
    return true;
  } catch (err) {
    logger.warn("Vercel promote request failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export type { VercelDeployment, VercelDeploymentDetail, VercelAnalytics };
