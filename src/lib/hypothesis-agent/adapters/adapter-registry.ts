/**
 * Adapter Registry
 * Epic #516
 *
 * Central registry for all content adapters.
 */

import type { ContentAdapter } from "@/types/hypothesis-agent";
import { SocialPostAdapter } from "./social-post-adapter";
import { GenericContentAdapter } from "./generic-content-adapter";

/**
 * Registry of available content adapters.
 */
const ADAPTER_REGISTRY: Map<string, ContentAdapter> = new Map();

// Register built-in adapters
ADAPTER_REGISTRY.set("social_post", new SocialPostAdapter());
ADAPTER_REGISTRY.set("generic", new GenericContentAdapter());

/**
 * Get adapter for a content type.
 *
 * @param contentType - Content type identifier
 * @returns Content adapter
 */
export function getAdapter(contentType: string): ContentAdapter {
  const adapter = ADAPTER_REGISTRY.get(contentType);

  if (!adapter) {
    // Fallback to generic adapter
    return ADAPTER_REGISTRY.get("generic")!;
  }

  return adapter;
}

/**
 * Register a custom adapter.
 *
 * @param contentType - Content type identifier
 * @param adapter - Adapter instance
 */
export function registerAdapter(contentType: string, adapter: ContentAdapter): void {
  ADAPTER_REGISTRY.set(contentType, adapter);
}

/**
 * List all registered adapters.
 *
 * @returns Array of adapter info
 */
export function listAdapters(): Array<{
  contentType: string;
  name: string;
  description: string;
}> {
  return Array.from(ADAPTER_REGISTRY.entries()).map(([contentType, adapter]) => ({
    contentType,
    name: adapter.name,
    description:
      typeof adapter.getDescription === "function"
        ? adapter.getDescription()
        : `${adapter.name} adapter`,
  }));
}

/**
 * Check if an adapter exists for a content type.
 *
 * @param contentType - Content type identifier
 * @returns True if adapter exists
 */
export function hasAdapter(contentType: string): boolean {
  return ADAPTER_REGISTRY.has(contentType);
}
