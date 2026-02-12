
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

  it('should NOT allow SKIP_RATE_LIMIT bypass in production environment', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SKIP_RATE_LIMIT', 'true');

    const config = rateLimitConfigs.general;
    const result = await checkRateLimit('test-user-prod-skip', config);

    // Should NOT match the bypass signature (bypass returns maxRequests)
    // Real logic should decrement remaining (or return max-1 if new)
    expect(result.remaining).toBeLessThan(config.maxRequests);
  });

  it('should allow E2E_BYPASS_AUTH bypass in production environment (for CI)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('E2E_BYPASS_AUTH', 'true');

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config = rateLimitConfigs.general;
    const result = await checkRateLimit('test-user-prod-e2e', config);

    // Should match the bypass signature
    expect(result.remaining).toBe(config.maxRequests);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Rate limit bypass enabled in PRODUCTION'));

    consoleSpy.mockRestore();
  });

  it('should allow SKIP_RATE_LIMIT bypass in development environment', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SKIP_RATE_LIMIT', 'true');

    const config = rateLimitConfigs.general;
    const result = await checkRateLimit('test-user-dev', config);

    // Bypass returns maxRequests (no consumption)
    expect(result.remaining).toBe(config.maxRequests);
  });

  it('should allow E2E_BYPASS_AUTH bypass in test environment', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('E2E_BYPASS_AUTH', 'true');

    const config = rateLimitConfigs.general;
    const result = await checkRateLimit('test-user-test', config);

    expect(result.remaining).toBe(config.maxRequests);
  });
});
