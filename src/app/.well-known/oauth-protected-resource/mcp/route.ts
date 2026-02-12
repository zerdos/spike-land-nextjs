/**
 * OAuth Protected Resource Metadata (RFC 9728)
 *
 * Tells MCP clients where to find the authorization server for this resource.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://spike.land";
}

export function GET() {
  const baseUrl = getBaseUrl();

  return NextResponse.json({
    resource: `${baseUrl}/api/mcp`,
    authorization_servers: [baseUrl],
    scopes_supported: ["mcp"],
    bearer_methods_supported: ["header"],
  });
}
