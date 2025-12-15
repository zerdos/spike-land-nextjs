/**
 * Facebook Marketing API - OAuth Connect Route
 *
 * Initiates OAuth flow to connect Facebook Ad accounts
 * GET /api/marketing/facebook/connect
 */

import { auth } from "@/auth";
import { FacebookMarketingClient } from "@/lib/marketing";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = new FacebookMarketingClient();

    // Generate state with user ID for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        timestamp: Date.now(),
      }),
    ).toString("base64url");

    // Determine redirect URI based on environment
    const baseUrl = process.env.NEXTAUTH_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";
    const redirectUri = `${
      baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
    }/api/marketing/facebook/callback`;

    const authUrl = client.getAuthUrl(redirectUri, state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Facebook connect error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to initiate OAuth",
      },
      { status: 500 },
    );
  }
}
