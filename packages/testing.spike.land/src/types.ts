interface CloudflareCache extends CacheStorage {
  default: Cache;
}

export interface Env {
  OPENAI_API_KEY: string;
  AI: unknown;
  KV: KVNamespace;
  __STATIC_CONTENT: KVNamespace;
  REPLICATE_API_TOKEN: string;
  CLAUDE_CODE_OAUTH_TOKEN: string;
  readonly caches: CloudflareCache;
}

export type { CloudflareCache };
