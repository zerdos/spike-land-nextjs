
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, rateLimitConfigs } from './rate-limiter';

describe('Rate Limiter Security Bypass', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should NOT allow bypass in production environment', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SKIP_RATE_LIMIT', 'true');

    const config = rateLimitConfigs.general;
    const result = await checkRateLimit('test-user-prod', config);

    // Should NOT match the bypass signature (bypass returns maxRequests)
    // Real logic should decrement remaining (or return max-1 if new)
    expect(result.remaining).toBeLessThan(config.maxRequests);
  });

  it('should allow bypass in development environment', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SKIP_RATE_LIMIT', 'true');

    const config = rateLimitConfigs.general;
    const result = await checkRateLimit('test-user-dev', config);

    // Bypass returns maxRequests (no consumption)
    expect(result.remaining).toBe(config.maxRequests);
  });

  it('should allow bypass in test environment', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('E2E_BYPASS_AUTH', 'true');

    const config = rateLimitConfigs.general;
    const result = await checkRateLimit('test-user-test', config);

    expect(result.remaining).toBe(config.maxRequests);
  });
});
