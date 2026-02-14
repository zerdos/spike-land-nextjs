import logger from "@/lib/logger";

const NEON_BASE = "https://console.neon.tech/api/v2";

interface NeonBranch {
  id: string;
  project_id: string;
  name: string;
  current_state: string;
  created_at: string;
  updated_at: string;
  primary: boolean;
}

interface NeonBranchDetail extends NeonBranch {
  endpoints: Array<{
    id: string;
    host: string;
    type: string;
    current_state: string;
    autoscaling_limit_min_cu: number;
    autoscaling_limit_max_cu: number;
  }>;
  databases: Array<{
    id: number;
    name: string;
    owner_name: string;
  }>;
  roles: Array<{
    name: string;
    protected: boolean;
  }>;
}

function getAuth(): string | null {
  return process.env["NEON_API_KEY"] ?? null;
}

function getProjectId(): string | null {
  return process.env["NEON_PROJECT_ID"] ?? null;
}

async function neonFetch<T>(path: string, timeoutMs = 10_000): Promise<T | null> {
  const token = getAuth();
  if (!token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${NEON_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      logger.warn(`Neon API error: ${res.status} ${res.statusText}`);
      return null;
    }

    return res.json() as Promise<T>;
  } catch (err) {
    logger.warn("Neon API fetch failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function listBranches(): Promise<NeonBranch[] | null> {
  const projectId = getProjectId();
  if (!projectId) return null;

  const result = await neonFetch<{ branches: NeonBranch[] }>(
    `/projects/${projectId}/branches`,
  );
  return result?.branches ?? null;
}

export async function getBranchDetail(branchId: string): Promise<NeonBranchDetail | null> {
  const projectId = getProjectId();
  if (!projectId) return null;

  const [branchResult, endpointsResult, databasesResult, rolesResult] = await Promise.all([
    neonFetch<{ branch: NeonBranch }>(`/projects/${projectId}/branches/${branchId}`),
    neonFetch<{ endpoints: NeonBranchDetail["endpoints"] }>(
      `/projects/${projectId}/branches/${branchId}/endpoints`,
    ),
    neonFetch<{ databases: NeonBranchDetail["databases"] }>(
      `/projects/${projectId}/branches/${branchId}/databases`,
    ),
    neonFetch<{ roles: NeonBranchDetail["roles"] }>(
      `/projects/${projectId}/branches/${branchId}/roles`,
    ),
  ]);

  if (!branchResult) return null;

  return {
    ...branchResult.branch,
    endpoints: endpointsResult?.endpoints ?? [],
    databases: databasesResult?.databases ?? [],
    roles: rolesResult?.roles ?? [],
  };
}

export type { NeonBranch, NeonBranchDetail };
