/**
 * Discord Metrics API Route
 *
 * GET /api/social/discord/metrics - Get server statistics
 */

import { auth } from "@/auth";
import { DiscordClient } from "@/lib/social/clients/discord";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

/**
 * GET /api/social/discord/metrics
 *
 * Get Discord server statistics including member count, online count,
 * server name, and icon.
 *
 * Requires admin session.
 * Uses environment variables:
 * - DISCORD_BOT_TOKEN
 * - DISCORD_SERVER_ID
 */
export async function GET(): Promise<NextResponse> {
  // Verify authentication
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden. Admin access required." },
      { status: 403 },
    );
  }

  // Create Discord client
  let client: DiscordClient;
  try {
    client = new DiscordClient();
  } catch (error) {
    console.error("Failed to initialize Discord client:", error);
    return NextResponse.json(
      {
        error: "Discord integration not configured",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }

  // Fetch metrics
  const { data: metrics, error: metricsError } = await tryCatch(
    client.getMetrics(),
  );

  if (metricsError) {
    console.error("Failed to fetch Discord metrics:", metricsError);

    // Handle rate limiting
    if (
      metricsError instanceof Error &&
      metricsError.message.includes("rate limited")
    ) {
      return NextResponse.json(
        {
          error: "Rate limited by Discord. Please try again later.",
          details: metricsError.message,
        },
        { status: 429 },
      );
    }

    // Handle permission errors
    if (
      metricsError instanceof Error &&
      (metricsError.message.includes("403") ||
        metricsError.message.includes("Missing Access"))
    ) {
      return NextResponse.json(
        {
          error: "Bot does not have permission to access server information",
          details: metricsError.message,
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch Discord metrics",
        details: metricsError instanceof Error
          ? metricsError.message
          : "Unknown error",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    metrics: {
      memberCount: metrics.memberCount,
      onlineCount: metrics.onlineCount,
      serverName: metrics.serverName,
      serverIcon: metrics.serverIcon,
      premiumTier: metrics.premiumTier,
      boostCount: metrics.boostCount,
    },
    fetchedAt: new Date().toISOString(),
  });
}
