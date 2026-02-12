/**
 * Shared base URL resolver for MCP OAuth and API routes.
 *
 * Ensures production deployments always return https://spike.land,
 * even when VERCEL_URL is set to a preview hostname.
 */
export function getMcpBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_ENV === "production") return "https://spike.land";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://spike.land";
}
