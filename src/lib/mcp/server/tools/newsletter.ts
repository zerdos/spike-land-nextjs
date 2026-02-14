/**
 * Newsletter MCP Tools
 *
 * Email subscription management for the newsletter.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

const NewsletterSubscribeSchema = z.object({
  email: z.string().email().describe("Email address to subscribe."),
});

export function registerNewsletterTools(
  registry: ToolRegistry,
  _userId: string,
): void {
  registry.register({
    name: "newsletter_subscribe",
    description: "Subscribe an email address to the newsletter.",
    category: "newsletter",
    tier: "free",
    inputSchema: NewsletterSubscribeSchema.shape,
    handler: async ({ email }: z.infer<typeof NewsletterSubscribeSchema>): Promise<CallToolResult> =>
      safeToolCall("newsletter_subscribe", async () => {
        const prisma = (await import("@/lib/prisma")).default;

        const subscriber = await prisma.newsletterSubscriber.upsert({
          where: { email },
          create: { email, source: "mcp" },
          update: { unsubscribed: false, unsubscribedAt: null },
        });

        return textResult(
          `**Newsletter Subscription Confirmed!**\n\n` +
          `**Email:** ${subscriber.email}\n` +
          `**Subscribed at:** ${subscriber.subscribedAt.toISOString()}\n` +
          `**Source:** ${subscriber.source}`,
        );
      }),
  });
}
