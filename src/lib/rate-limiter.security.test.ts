
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, rateLimitConfigs } from './rate-limiter';

describe('Rate Limiter Security Bypass', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should NOT allow bypass in production environment', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SKIP_RATE_LIMIT = 'true';

    const config = rateLimitConfigs.general;
    const result = await checkRateLimit('test-user-prod', config);

    // Should NOT match the bypass signature (bypass returns maxRequests)
    // Real logic should decrement remaining (or return 0 if full, but first request consumes 1)
    expect(result.remaining).toBeLessThan(config.maxRequests);
  });

  it('should allow bypass in development environment', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SKIP_RATE_LIMIT = 'true';

    const config = rateLimitConfigs.general;
    const result = await checkRateLimit('test-user-dev', config);

    // Bypass returns maxRequests (no consumption)
    expect(result.remaining).toBe(config.maxRequests);
  });

  it('should allow bypass in test environment', async () => {
    process.env.NODE_ENV = 'test';
    process.env.E2E_BYPASS_AUTH = 'true';

    const config = rateLimitConfigs.general;
    const result = await checkRateLimit('test-user-test', config);

    expect(result.remaining).toBe(config.maxRequests);
  });
});
