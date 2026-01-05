import { tryCatch } from "@/lib/try-catch";
import { redis } from "@/lib/upstash";
import type { ContentScoreResponse } from "@/lib/validations/brand-score";
import crypto from "crypto";

const CACHE_PREFIX = "brand-score";
const DEFAULT_TTL_SECONDS = 3600; // 1 hour

/**
 * Build a cache key for content scoring.
 * Uses SHA-256 hash of content to create a consistent, compact key.
 *
 * @param workspaceId - The workspace ID
 * @param profileVersion - The brand profile version (for cache invalidation on profile updates)
 * @param content - The content being scored
 * @returns Cache key string
 */
export function buildScoreCacheKey(
  workspaceId: string,
  profileVersion: number,
  content: string,
): string {
  const contentHash = crypto
    .createHash("sha256")
    .update(content)
    .digest("hex")
    .slice(0, 16); // Use first 16 chars for brevity

  return `${CACHE_PREFIX}:${workspaceId}:v${profileVersion}:${contentHash}`;
}

/**
 * Get a cached content score.
 *
 * @param cacheKey - The cache key
 * @returns The cached score or null if not found
 */
export async function getCachedScore(
  cacheKey: string,
): Promise<ContentScoreResponse | null> {
  const { data, error } = await tryCatch(
    redis.get<ContentScoreResponse>(cacheKey),
  );

  if (error) {
    console.warn("[BRAND_SCORE_CACHE] Failed to get cached score:", error);
    return null;
  }

  return data;
}

/**
 * Cache a content score.
 *
 * @param cacheKey - The cache key
 * @param score - The score response to cache
 * @param ttlSeconds - Time to live in seconds (default: 1 hour)
 */
export async function setCachedScore(
  cacheKey: string,
  score: ContentScoreResponse,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<void> {
  const { error } = await tryCatch(
    redis.set(cacheKey, score, { ex: ttlSeconds }),
  );

  if (error) {
    console.warn("[BRAND_SCORE_CACHE] Failed to cache score:", error);
    // Cache failures should not break the main flow
  }
}

/**
 * Delete a cached score.
 *
 * @param cacheKey - The cache key to delete
 */
export async function deleteCachedScore(cacheKey: string): Promise<void> {
  const { error } = await tryCatch(redis.del(cacheKey));

  if (error) {
    console.warn("[BRAND_SCORE_CACHE] Failed to delete cached score:", error);
  }
}

/**
 * Note: Full cache invalidation by workspace requires Redis SCAN which can be slow.
 * When a brand profile is updated, the cache naturally invalidates because
 * the profile version changes, creating new cache keys.
 *
 * For immediate invalidation, implement pattern-based deletion with SCAN
 * or use a separate index to track cache keys per workspace.
 */
