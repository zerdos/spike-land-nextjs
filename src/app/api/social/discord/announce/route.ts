/**
 * Discord Announcement API Route
 *
 * POST /api/social/discord/announce - Send announcement to configured channel
 */

import { auth } from "@/auth";
import { DiscordClient, type DiscordEmbed } from "@/lib/social/clients/discord";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * POST /api/social/discord/announce
 *
 * Send an announcement message to the configured Discord channel.
 * Requires admin session.
 *
 * Body:
 * - content: Required (unless embeds provided). Message text (max 2000 characters)
 * - embeds: Optional. Array of Discord embed objects for rich content
 *
 * Uses DISCORD_ANNOUNCEMENT_CHANNEL_ID from environment variables.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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

  // Validate environment configuration
  const announcementChannelId = process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID;
  if (!announcementChannelId) {
    console.error("DISCORD_ANNOUNCEMENT_CHANNEL_ID not configured");
    return NextResponse.json(
      { error: "Discord announcement channel not configured" },
      { status: 500 },
    );
  }

  // Parse request body
  const { data: body, error: parseError } = await tryCatch(request.json());

  if (parseError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { content, embeds } = body as {
    content?: string;
    embeds?: DiscordEmbed[];
  };

  // Validate content or embeds provided
  if (!content && (!embeds || embeds.length === 0)) {
    return NextResponse.json(
      { error: "Either content or embeds is required" },
      { status: 400 },
    );
  }

  // Validate content length
  if (content && content.length > 2000) {
    return NextResponse.json(
      { error: "Message content exceeds 2000 character limit" },
      { status: 400 },
    );
  }

  // Validate embeds count
  if (embeds && embeds.length > 10) {
    return NextResponse.json(
      { error: "Maximum of 10 embeds allowed per message" },
      { status: 400 },
    );
  }

  // Validate embeds structure if provided
  if (embeds) {
    for (let i = 0; i < embeds.length; i++) {
      const embed = embeds[i];
      if (!embed) continue;

      // Validate embed field lengths (Discord limits)
      if (embed.title && embed.title.length > 256) {
        return NextResponse.json(
          { error: `Embed ${i + 1}: title exceeds 256 characters` },
          { status: 400 },
        );
      }
      if (embed.description && embed.description.length > 4096) {
        return NextResponse.json(
          { error: `Embed ${i + 1}: description exceeds 4096 characters` },
          { status: 400 },
        );
      }
      if (embed.fields && embed.fields.length > 25) {
        return NextResponse.json(
          { error: `Embed ${i + 1}: maximum of 25 fields allowed` },
          { status: 400 },
        );
      }
      if (embed.fields) {
        for (let j = 0; j < embed.fields.length; j++) {
          const field = embed.fields[j];
          if (!field) continue;
          if (field.name.length > 256) {
            return NextResponse.json(
              { error: `Embed ${i + 1}, field ${j + 1}: name exceeds 256 characters` },
              { status: 400 },
            );
          }
          if (field.value.length > 1024) {
            return NextResponse.json(
              { error: `Embed ${i + 1}, field ${j + 1}: value exceeds 1024 characters` },
              { status: 400 },
            );
          }
        }
      }
      if (embed.footer?.text && embed.footer.text.length > 2048) {
        return NextResponse.json(
          { error: `Embed ${i + 1}: footer text exceeds 2048 characters` },
          { status: 400 },
        );
      }
    }
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

  // Verify channel access before sending
  const { data: hasAccess, error: accessError } = await tryCatch(
    client.verifyChannelAccess(announcementChannelId),
  );

  if (accessError || !hasAccess) {
    console.error(
      "Discord bot cannot access announcement channel:",
      accessError || "No access",
    );
    return NextResponse.json(
      { error: "Bot cannot access the announcement channel. Check permissions." },
      { status: 500 },
    );
  }

  // Send the announcement
  const { data: message, error: sendError } = await tryCatch(
    client.sendMessage(announcementChannelId, content || "", { embeds }),
  );

  if (sendError) {
    console.error("Failed to send Discord announcement:", sendError);

    // Handle rate limiting
    if (sendError instanceof Error && sendError.message.includes("rate limited")) {
      return NextResponse.json(
        {
          error: "Rate limited by Discord. Please try again later.",
          details: sendError.message,
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to send announcement",
        details: sendError instanceof Error ? sendError.message : "Unknown error",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: {
      id: message.id,
      channelId: message.channel_id,
      content: message.content,
      timestamp: message.timestamp,
      author: {
        id: message.author.id,
        username: message.author.username,
      },
      embeds: message.embeds,
    },
    sentAt: new Date().toISOString(),
  });
}
