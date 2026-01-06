import { tryCatch } from "@/lib/try-catch";
import { redis } from "@/lib/upstash";
import type { ContentPlatform, ContentRewriteResponse } from "@/lib/validations/brand-rewrite";
import crypto from "crypto";

const CACHE_PREFIX = "brand-rewrite";
const DEFAULT_TTL_SECONDS = 3600; // 1 hour

/**
 * Build a cache key for content rewriting.
 * Uses SHA-256 hash of content to create a consistent, compact key.
 * Includes platform in the key since different platforms have different constraints.
 *
 * @param workspaceId - The workspace ID
 * @param profileVersion - The brand profile version (for cache invalidation on profile updates)
 * @param content - The content being rewritten
 * @param platform - The target platform
 * @returns Cache key string
 */
export function buildRewriteCacheKey(
  workspaceId: string,
  profileVersion: number,
  content: string,
  platform: ContentPlatform,
): string {
  const contentHash = crypto
    .createHash("sha256")
    .update(content)
    .digest("hex")
    .slice(0, 16); // Use first 16 chars for brevity

  return `${CACHE_PREFIX}:${workspaceId}:v${profileVersion}:${platform}:${contentHash}`;
}

/**
 * Get a cached content rewrite.
 *
 * @param cacheKey - The cache key
 * @returns The cached rewrite or null if not found
 */
export async function getCachedRewrite(
  cacheKey: string,
): Promise<ContentRewriteResponse | null> {
  const { data, error } = await tryCatch(
    redis.get<ContentRewriteResponse>(cacheKey),
  );

  if (error) {
    console.warn("[BRAND_REWRITE_CACHE] Failed to get cached rewrite:", error);
    return null;
  }

  return data;
}

/**
 * Cache a content rewrite.
 *
 * @param cacheKey - The cache key
 * @param rewrite - The rewrite response to cache
 * @param ttlSeconds - Time to live in seconds (default: 1 hour)
 */
export async function setCachedRewrite(
  cacheKey: string,
  rewrite: ContentRewriteResponse,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<void> {
  const { error } = await tryCatch(
    redis.set(cacheKey, rewrite, { ex: ttlSeconds }),
  );

  if (error) {
    console.warn("[BRAND_REWRITE_CACHE] Failed to cache rewrite:", error);
    // Cache failures should not break the main flow
  }
}

/**
 * Delete a cached rewrite.
 *
 * @param cacheKey - The cache key to delete
 */
export async function deleteCachedRewrite(cacheKey: string): Promise<void> {
  const { error } = await tryCatch(redis.del(cacheKey));

  if (error) {
    console.warn("[BRAND_REWRITE_CACHE] Failed to delete cached rewrite:", error);
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
