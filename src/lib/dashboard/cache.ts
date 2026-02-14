import { redis } from "@/lib/upstash/client";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const inProcessCache = new Map<string, CacheEntry<unknown>>();

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { inProcessTtlMs?: number; redisTtlS?: number },
): Promise<T> {
  const inProcessTtl = options?.inProcessTtlMs ?? 30_000;
  const redisTtl = options?.redisTtlS ?? 300;

  // Check in-process cache
  const inProcess = inProcessCache.get(key);
  if (inProcess && Date.now() - inProcess.timestamp < inProcessTtl) {
    return inProcess.data as T;
  }

  // Check Redis cache
  const redisData = await redis.get<string>(key).catch(() => null);
  if (redisData) {
    const parsed = JSON.parse(
      typeof redisData === "string" ? redisData : JSON.stringify(redisData),
    ) as T;
    inProcessCache.set(key, { data: parsed, timestamp: Date.now() });
    return parsed;
  }

  // Fetch fresh data
  const data = await fetcher();
  inProcessCache.set(key, { data, timestamp: Date.now() });
  await redis
    .set(key, JSON.stringify(data), { ex: redisTtl })
    .catch(() => {});
  return data;
}

export function invalidateCache(key: string): void {
  inProcessCache.delete(key);
  redis.del(key).catch(() => {});
}

export function clearInProcessCache(): void {
  inProcessCache.clear();
}
