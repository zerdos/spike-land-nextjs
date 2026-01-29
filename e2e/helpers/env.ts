/**
 * Helper to retrieve and sanitize the E2E bypass secret from environment variables.
 */
export function getE2eBypassSecret(): string | undefined {
  const secret = process.env.E2E_BYPASS_SECRET?.trim().replace(/[\r\n]/g, "");
  return secret || undefined;
}
