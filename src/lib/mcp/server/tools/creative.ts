/**
 * Creative MCP Tools
 *
 * Manage creative sets, variants, fatigue detection, and performance tracking.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const GenerateVariantsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  content: z.string().min(1).describe("Original creative content."),
  platform: z.string().optional().describe("Target platform (e.g., INSTAGRAM, TWITTER)."),
  variant_count: z.number().optional().default(3).describe("Number of variants to generate (default 3)."),
});

const DetectFatigueSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  limit: z.number().optional().default(10).describe("Max number of alerts to return (default 10)."),
});

const GetPerformanceSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  creative_set_id: z.string().min(1).describe("Creative set ID."),
});

const ListSetsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  limit: z.number().optional().default(20).describe("Max number of sets to return (default 20)."),
});

export function registerCreativeTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "creative_generate_variants",
    description: "Create a creative set with variants from original content. Variants are created with PENDING status for async generation.",
    category: "creative",
    tier: "free",
    inputSchema: GenerateVariantsSchema.shape,
    handler: async (args: z.infer<typeof GenerateVariantsSchema>): Promise<CallToolResult> =>
      safeToolCall("creative_generate_variants", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const creativeSet = await prisma.creativeSet.create({
          data: {
            workspaceId: workspace.id,
            originalContent: args.content,
            platform: args.platform ?? null,
          },
        });

        const variantIds: string[] = [];
        for (let i = 0; i < args.variant_count; i++) {
          const variant = await prisma.creativeVariant.create({
            data: {
              creativeSetId: creativeSet.id,
              content: args.content,
              status: "PENDING",
              variantIndex: i,
            },
          });
          variantIds.push(variant.id);
        }

        let text = `**Creative Set Created**\n\n`;
        text += `**Set ID:** \`${creativeSet.id}\`\n`;
        text += `**Workspace:** ${workspace.name}\n`;
        text += `**Platform:** ${args.platform || "all"}\n`;
        text += `**Variants:** ${variantIds.length}\n\n`;
        text += `| # | Variant ID | Status |\n`;
        text += `|---|-----------|--------|\n`;
        for (let i = 0; i < variantIds.length; i++) {
          text += `| ${i + 1} | \`${variantIds[i]}\` | PENDING |\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "creative_detect_fatigue",
    description: "Detect creative fatigue alerts for a workspace. Returns unresolved fatigue alerts ordered by detection time.",
    category: "creative",
    tier: "free",
    inputSchema: DetectFatigueSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof DetectFatigueSchema>): Promise<CallToolResult> =>
      safeToolCall("creative_detect_fatigue", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const alerts = await prisma.creativeFatigueAlert.findMany({
          where: { workspaceId: workspace.id, isResolved: false },
          orderBy: { detectedAt: "desc" },
          take: args.limit,
        });

        if (alerts.length === 0) {
          return textResult("**Creative Fatigue**\n\nNo active fatigue alerts found.");
        }

        let text = `**Creative Fatigue Alerts** (${alerts.length})\n\n`;
        text += `| Creative ID | Fatigue Type | Metrics Decline | Recommendation |\n`;
        text += `|------------|-------------|----------------|----------------|\n`;
        for (const a of alerts) {
          text += `| \`${a.creativeId}\` | ${a.fatigueType} | ${a.metricsDecline}% | ${a.recommendation} |\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "creative_get_performance",
    description: "Get performance metrics for a creative set and its variants, including impressions, clicks, CTR, and conversions.",
    category: "creative",
    tier: "free",
    inputSchema: GetPerformanceSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetPerformanceSchema>): Promise<CallToolResult> =>
      safeToolCall("creative_get_performance", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const creativeSet = await prisma.creativeSet.findFirst({
          where: { id: args.creative_set_id, workspaceId: workspace.id },
          include: {
            variants: {
              include: { performance: true },
            },
          },
        });

        if (!creativeSet) {
          return textResult("**Error: NOT_FOUND**\nCreative set not found.\n**Retryable:** false");
        }

        let text = `**Creative Performance**\n\n`;
        text += `**Set ID:** \`${creativeSet.id}\`\n`;
        text += `**Variants:** ${creativeSet.variants.length}\n\n`;
        text += `| Variant | Impressions | Clicks | CTR | Conversions |\n`;
        text += `|---------|------------|--------|-----|-------------|\n`;

        for (const v of creativeSet.variants) {
          const perf = v.performance;
          if (perf) {
            const ctr = perf.impressions > 0
              ? ((perf.clicks / perf.impressions) * 100).toFixed(2)
              : "0.00";
            text += `| \`${v.id}\` | ${perf.impressions} | ${perf.clicks} | ${ctr}% | ${perf.conversions} |\n`;
          } else {
            text += `| \`${v.id}\` | - | - | - | - |\n`;
          }
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "creative_list_sets",
    description: "List creative sets in a workspace with variant counts, ordered by creation date.",
    category: "creative",
    tier: "free",
    inputSchema: ListSetsSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof ListSetsSchema>): Promise<CallToolResult> =>
      safeToolCall("creative_list_sets", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const sets = await prisma.creativeSet.findMany({
          where: { workspaceId: workspace.id },
          include: { _count: { select: { variants: true } } },
          orderBy: { createdAt: "desc" },
          take: args.limit,
        });

        if (sets.length === 0) {
          return textResult("**Creative Sets**\n\nNo creative sets found.");
        }

        let text = `**Creative Sets** (${sets.length})\n\n`;
        text += `| Set ID | Variants | Platform | Created |\n`;
        text += `|--------|---------|----------|---------|\n`;
        for (const s of sets) {
          text += `| \`${s.id}\` | ${s._count.variants} | ${s.platform || "all"} | ${s.createdAt.toISOString()} |\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });
}
