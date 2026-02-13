/**
 * Orbit Social Integration MCP Tools
 *
 * Social media platform connections, onboarding, and content management.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

const ListConnectionsSchema = z.object({
  platform: z.string().optional().describe("Filter by platform (twitter, instagram, linkedin, etc)."),
});

const ConnectPlatformSchema = z.object({
  platform: z.string().min(1).describe("Platform to connect (twitter, instagram, linkedin, facebook, tiktok)."),
  handle: z.string().min(1).describe("Account handle or username."),
});

const DisconnectPlatformSchema = z.object({
  connection_id: z.string().min(1).describe("Connection ID to disconnect."),
});

const GetOnboardingStatusSchema = z.object({});

const CompleteOnboardingStepSchema = z.object({
  step: z.string().min(1).describe("Onboarding step ID to mark as complete."),
});

const PostContentSchema = z.object({
  connection_id: z.string().min(1).describe("Connection ID to post to."),
  content: z.string().min(1).max(5000).describe("Content to post."),
  media_urls: z.array(z.string()).optional().describe("Optional media attachment URLs."),
});

export function registerOrbitSocialTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "social_list_connections",
    description: "List connected social media accounts.",
    category: "orbit-social",
    tier: "workspace",
    inputSchema: ListConnectionsSchema.shape,
    handler: async ({ platform }: z.infer<typeof ListConnectionsSchema>): Promise<CallToolResult> =>
      safeToolCall("social_list_connections", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const where: Record<string, unknown> = { userId };
        if (platform) where.platform = platform;
        const connections = await prisma.socialAccount.findMany({
          where,
          select: { id: true, platform: true, handle: true, status: true, connectedAt: true },
        });
        if (connections.length === 0) return textResult("No social connections found.");
        let text = `**Social Connections (${connections.length}):**\n\n`;
        for (const c of connections) {
          text += `- **${c.platform}** @${c.handle} [${c.status}]\n  ID: ${c.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "social_connect_platform",
    description: "Connect a new social media platform account.",
    category: "orbit-social",
    tier: "workspace",
    inputSchema: ConnectPlatformSchema.shape,
    handler: async ({ platform, handle }: z.infer<typeof ConnectPlatformSchema>): Promise<CallToolResult> =>
      safeToolCall("social_connect_platform", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const connection = await prisma.socialAccount.create({
          data: { platform, handle, status: "ACTIVE", userId, connectedAt: new Date() },
        });
        return textResult(`**Connected!**\n\n**Platform:** ${platform}\n**Handle:** @${handle}\n**ID:** ${connection.id}`);
      }),
  });

  registry.register({
    name: "social_disconnect_platform",
    description: "Disconnect a social media platform account.",
    category: "orbit-social",
    tier: "workspace",
    inputSchema: DisconnectPlatformSchema.shape,
    handler: async ({ connection_id }: z.infer<typeof DisconnectPlatformSchema>): Promise<CallToolResult> =>
      safeToolCall("social_disconnect_platform", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await prisma.socialAccount.update({
          where: { id: connection_id },
          data: { status: "DISCONNECTED" },
        });
        return textResult(`**Disconnected!** Connection ID: ${connection_id}`);
      }),
  });

  registry.register({
    name: "social_onboarding_status",
    description: "Get the current onboarding progress for social media setup.",
    category: "orbit-social",
    tier: "workspace",
    inputSchema: GetOnboardingStatusSchema.shape,
    handler: async (): Promise<CallToolResult> =>
      safeToolCall("social_onboarding_status", async () => {
        // TODO: Add OnboardingStep model to prisma/schema.prisma
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "OnboardingStep model not yet added to schema" }) }] };
      }),
  });

  registry.register({
    name: "social_complete_onboarding_step",
    description: "Mark an onboarding step as complete.",
    category: "orbit-social",
    tier: "workspace",
    inputSchema: CompleteOnboardingStepSchema.shape,
    handler: async ({ step: _step }: z.infer<typeof CompleteOnboardingStepSchema>): Promise<CallToolResult> =>
      safeToolCall("social_complete_onboarding_step", async () => {
        // TODO: Add OnboardingStep model to prisma/schema.prisma
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "OnboardingStep model not yet added to schema" }) }] };
      }),
  });

  registry.register({
    name: "social_post_content",
    description: "Post content to a connected social media account.",
    category: "orbit-social",
    tier: "workspace",
    inputSchema: PostContentSchema.shape,
    handler: async ({ connection_id, content, media_urls }: z.infer<typeof PostContentSchema>): Promise<CallToolResult> =>
      safeToolCall("social_post_content", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const connection = await prisma.socialAccount.findUnique({
          where: { id: connection_id },
          select: { platform: true, handle: true },
        });
        if (!connection) return textResult("**Error: NOT_FOUND**\nConnection not found.\n**Retryable:** false");
        const post = await prisma.socialPost.create({
          data: { connectionId: connection_id, content, mediaUrls: media_urls || [], status: "POSTED", userId },
        });
        return textResult(
          `**Posted!**\n\n` +
          `**Platform:** ${connection.platform}\n` +
          `**Handle:** @${connection.handle}\n` +
          `**Post ID:** ${post.id}\n` +
          `**Content:** ${content.slice(0, 100)}${content.length > 100 ? "..." : ""}`
        );
      }),
  });
}
