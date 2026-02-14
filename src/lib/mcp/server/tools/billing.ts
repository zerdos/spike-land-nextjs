/**
 * Billing Management MCP Tools
 *
 * Stripe checkout sessions and subscription status management.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

const CreateCheckoutSchema = z.object({
  type: z.enum(["tokens", "subscription", "workspace_tier"]).describe("Checkout type: tokens (one-time), subscription (recurring), or workspace_tier (workspace upgrade)."),
  workspace_id: z.string().min(1).describe("Workspace ID to associate the checkout with."),
});

export function registerBillingTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "billing_create_checkout",
    description: "Create a Stripe checkout session for purchasing tokens, subscribing to a plan, or upgrading workspace tier.",
    category: "billing",
    tier: "free",
    inputSchema: CreateCheckoutSchema.shape,
    handler: async ({ type, workspace_id }: z.infer<typeof CreateCheckoutSchema>): Promise<CallToolResult> =>
      safeToolCall("billing_create_checkout", async () => {
        const prisma = (await import("@/lib/prisma")).default;

        // Verify workspace membership
        const membership = await prisma.workspaceMember.findFirst({
          where: { userId, workspaceId: workspace_id },
          select: { role: true },
        });

        if (!membership) {
          return textResult("**Error:** Workspace not found or you are not a member.");
        }

        // NOTE: Actual Stripe checkout session creation is handled by the
        // /api/stripe/checkout route. This tool documents the intent and
        // validates prerequisites. The agent should direct the user to the
        // checkout UI or call the API route directly.
        return textResult(
          `**Checkout Session Intent**\n\n` +
          `**Type:** ${type}\n` +
          `**Workspace:** ${workspace_id}\n` +
          `**User Role:** ${membership.role}\n\n` +
          `To complete checkout, direct the user to the billing page or call POST /api/stripe/checkout with the appropriate packageId/planId/tierId.`,
        );
      }),
  });

  registry.register({
    name: "billing_get_subscription",
    description: "Get current subscription status and tier information for the user's workspace.",
    category: "billing",
    tier: "free",
    inputSchema: z.object({}).shape,
    handler: async (): Promise<CallToolResult> =>
      safeToolCall("billing_get_subscription", async () => {
        const prisma = (await import("@/lib/prisma")).default;

        // Find user's personal workspace with subscription info
        const workspace = await prisma.workspace.findFirst({
          where: {
            isPersonal: true,
            members: { some: { userId } },
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            subscriptionTier: true,
            stripeSubscriptionId: true,
            monthlyAiCredits: true,
            usedAiCredits: true,
          },
        });

        if (!workspace) {
          return textResult("**Error:** No personal workspace found for the current user.");
        }

        const hasActiveSubscription = !!workspace.stripeSubscriptionId;
        const remaining = Math.max(0, workspace.monthlyAiCredits - workspace.usedAiCredits);

        return textResult(
          `**Subscription Status**\n\n` +
          `**Workspace:** ${workspace.name}\n` +
          `**Workspace ID:** ${workspace.id}\n` +
          `**Tier:** ${workspace.subscriptionTier}\n` +
          `**Active Stripe Subscription:** ${hasActiveSubscription ? "Yes" : "No"}\n` +
          `**Monthly AI Credits:** ${workspace.monthlyAiCredits}\n` +
          `**Used:** ${workspace.usedAiCredits}\n` +
          `**Remaining:** ${remaining}`,
        );
      }),
  });
}
