import { redis } from "@/lib/upstash/client";
import { CACHE_TTL, CACHE_PREFIX } from "../constants";

export async function getCached<T>(key: string): Promise<T | null> {
  return redis.get<T>(`${CACHE_PREFIX}${key}`);
}

export async function setCached<T>(key: string, value: T, ttl = CACHE_TTL): Promise<void> {
  await redis.set(`${CACHE_PREFIX}${key}`, value, { ex: ttl });
}

export function cacheKey(...parts: string[]): string {
  return parts.join(":");
}
