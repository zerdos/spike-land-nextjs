import logger from "@/lib/logger";

const CF_BASE = "https://api.cloudflare.com/client/v4";

interface WorkerAnalytics {
  requests: number;
  errors: number;
  cpuTimeMs: number;
  duration: number;
  subrequests: number;
  wallTimeMs: number;
}

interface KVStats {
  reads: number;
  writes: number;
  deletes: number;
  lists: number;
  storedKeys: number;
  storedBytes: number;
}

function getAuth(): string | null {
  return process.env.CF_API_TOKEN ?? null;
}

function getAccountId(): string | null {
  return process.env.CF_ACCOUNT_ID ?? null;
}

async function cfFetch<T>(path: string, timeoutMs = 10_000): Promise<T | null> {
  const token = getAuth();
  if (!token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${CF_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    if (!res.ok) {
      logger.warn(`Cloudflare API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const body = await res.json() as { success: boolean; result: T; errors?: Array<{ message: string }> };
    if (!body.success) {
      logger.warn("Cloudflare API returned errors", {
        errors: body.errors?.map((e) => e.message),
      });
      return null;
    }
    return body.result;
  } catch (err) {
    logger.warn("Cloudflare API fetch failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getWorkerAnalytics(
  options?: { scriptName?: string; since?: string; until?: string },
): Promise<WorkerAnalytics | null> {
  const accountId = getAccountId();
  if (!accountId) return null;

  const token = getAuth();
  if (!token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  const since = options?.since ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const until = options?.until ?? new Date().toISOString();
  const scriptFilter = options?.scriptName
    ? `, scriptName: "${options.scriptName}"`
    : "";

  const query = `
    query {
      viewer {
        accounts(filter: { accountTag: "${accountId}" }) {
          workersInvocationsAdaptive(
            filter: { datetime_geq: "${since}", datetime_leq: "${until}"${scriptFilter} }
            limit: 1000
          ) {
            sum {
              requests
              errors
              subrequests
            }
            quantiles {
              cpuTimeP50
              durationP50
              wallTimeP50
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });

    if (!res.ok) {
      logger.warn(`Cloudflare GraphQL error: ${res.status} ${res.statusText}`);
      return null;
    }

    const body = await res.json() as {
      data?: {
        viewer: {
          accounts: Array<{
            workersInvocationsAdaptive: Array<{
              sum: { requests: number; errors: number; subrequests: number };
              quantiles: { cpuTimeP50: number; durationP50: number; wallTimeP50: number };
            }>;
          }>;
        };
      };
    };

    const invocations = body.data?.viewer.accounts[0]?.workersInvocationsAdaptive;
    if (!invocations?.length) return null;

    let totalRequests = 0;
    let totalErrors = 0;
    let totalSubrequests = 0;
    let cpuTime = 0;
    let duration = 0;
    let wallTime = 0;

    for (const entry of invocations) {
      totalRequests += entry.sum.requests;
      totalErrors += entry.sum.errors;
      totalSubrequests += entry.sum.subrequests;
      cpuTime = Math.max(cpuTime, entry.quantiles.cpuTimeP50);
      duration = Math.max(duration, entry.quantiles.durationP50);
      wallTime = Math.max(wallTime, entry.quantiles.wallTimeP50);
    }

    return {
      requests: totalRequests,
      errors: totalErrors,
      cpuTimeMs: cpuTime,
      duration,
      subrequests: totalSubrequests,
      wallTimeMs: wallTime,
    };
  } catch (err) {
    logger.warn("Cloudflare GraphQL fetch failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getKVStats(
  options?: { namespaceId?: string },
): Promise<KVStats | null> {
  const accountId = getAccountId();
  if (!accountId) return null;

  if (options?.namespaceId) {
    const result = await cfFetch<{
      reads: number;
      writes: number;
      deletes: number;
      lists: number;
      stored_keys: number;
      stored_bytes: number;
    }>(`/accounts/${accountId}/storage/kv/namespaces/${options.namespaceId}/analytics`);

    if (!result) return null;

    return {
      reads: result.reads,
      writes: result.writes,
      deletes: result.deletes,
      lists: result.lists,
      storedKeys: result.stored_keys,
      storedBytes: result.stored_bytes,
    };
  }

  const namespaces = await cfFetch<Array<{ id: string; title: string }>>(
    `/accounts/${accountId}/storage/kv/namespaces`,
  );

  if (!namespaces) return null;

  const aggregated: KVStats = {
    reads: 0,
    writes: 0,
    deletes: 0,
    lists: 0,
    storedKeys: 0,
    storedBytes: 0,
  };

  for (const ns of namespaces) {
    const stats = await getKVStats({ namespaceId: ns.id });
    if (stats) {
      aggregated.reads += stats.reads;
      aggregated.writes += stats.writes;
      aggregated.deletes += stats.deletes;
      aggregated.lists += stats.lists;
      aggregated.storedKeys += stats.storedKeys;
      aggregated.storedBytes += stats.storedBytes;
    }
  }

  return aggregated;
}

export type { WorkerAnalytics, KVStats };
