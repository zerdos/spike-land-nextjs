import { getSession } from "@/lib/codespace/session-service";
import logger from "@/lib/logger";
import { tryCatch } from "@/lib/try-catch";

// Cache health check results for 60 seconds
const healthCache = new Map<string, { healthy: boolean; cachedAt: number }>();
const CACHE_TTL_MS = 60_000;

/**
 * Check if a codespace has real, non-default content
 */
export async function isCodespaceHealthy(codespaceId: string): Promise<boolean> {
  // Check cache first
  const cached = healthCache.get(codespaceId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.healthy;
  }

  const { data: session, error } = await tryCatch(getSession(codespaceId));

  if (error || !session) {
    logger.warn(`[codespace-health] No session found for ${codespaceId}`);
    cacheResult(codespaceId, false);
    return false;
  }

  const healthy = Boolean(
    session.code &&
    session.code.length > 100 &&
    session.transpiled &&
    session.transpiled.length > 0 &&
    !session.transpiled.includes("404 - for now") &&
    !session.code.includes("404 - for now"),
  );

  cacheResult(codespaceId, healthy);
  return healthy;
}

function cacheResult(codespaceId: string, healthy: boolean) {
  healthCache.set(codespaceId, { healthy, cachedAt: Date.now() });
}

/**
 * Batch check multiple codespace IDs
 */
export async function filterHealthyCodespaces<T extends { codespaceId: string | null }>(
  items: T[],
): Promise<T[]> {
  const results = await Promise.all(
    items.map(async (item) => {
      if (!item.codespaceId) return { item, healthy: false };
      const healthy = await isCodespaceHealthy(item.codespaceId);
      return { item, healthy };
    }),
  );

  return results.filter((r) => r.healthy).map((r) => r.item);
}

// Export for testing
export { healthCache };
