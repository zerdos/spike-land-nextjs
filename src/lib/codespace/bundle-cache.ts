import { redis } from "@/lib/upstash/client";

/**
 * Get cached bundle HTML for a codespace session.
 */
export async function getBundleCache(
  codeSpace: string,
  sessionHash: string,
): Promise<string | null> {
  const key = `codespace:bundle:${codeSpace}:${sessionHash}`;
  return redis.get<string>(key);
}

/**
 * Cache bundle HTML for a codespace session.
 * TTL: 1 hour (bundles are invalidated by session hash changes).
 */
export async function setBundleCache(
  codeSpace: string,
  sessionHash: string,
  html: string,
): Promise<void> {
  const key = `codespace:bundle:${codeSpace}:${sessionHash}`;
  await redis.set(key, html, { ex: 3600 }); // 1 hour
}

/**
 * Delete cached bundle HTML for a codespace session (used by rebuild flow).
 */
export async function deleteBundleCache(
  codeSpace: string,
  sessionHash: string,
): Promise<void> {
  const key = `codespace:bundle:${codeSpace}:${sessionHash}`;
  await redis.del(key);
}

/**
 * Get cached fallback HTML for a codespace session (used when esbuild bundle fails).
 */
export async function getBundleFallbackCache(
  codeSpace: string,
  sessionHash: string,
): Promise<string | null> {
  const key = `codespace:bundle:${codeSpace}:${sessionHash}:fallback`;
  return redis.get<string>(key);
}

/**
 * Cache fallback HTML for a codespace session.
 * TTL: 10 minutes (shorter than regular bundle cache since this is a degraded path).
 */
export async function setBundleFallbackCache(
  codeSpace: string,
  sessionHash: string,
  html: string,
): Promise<void> {
  const key = `codespace:bundle:${codeSpace}:${sessionHash}:fallback`;
  await redis.set(key, html, { ex: 600 }); // 10 minutes
}

/**
 * Delete cached fallback HTML for a codespace session (used by rebuild flow).
 */
export async function deleteBundleFallbackCache(
  codeSpace: string,
  sessionHash: string,
): Promise<void> {
  const key = `codespace:bundle:${codeSpace}:${sessionHash}:fallback`;
  await redis.del(key);
}

/**
 * Get cached npm package content by URL hash.
 */
export async function getPackageCache(
  urlHash: string,
): Promise<string | null> {
  const key = `esm:pkg:${urlHash}`;
  return redis.get<string>(key);
}

/**
 * Cache npm package content by URL hash.
 * TTL: 7 days (pinned versions are immutable).
 */
export async function setPackageCache(
  urlHash: string,
  content: string,
): Promise<void> {
  const key = `esm:pkg:${urlHash}`;
  await redis.set(key, content, { ex: 604800 }); // 7 days
}
