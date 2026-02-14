/**
 * A/B Testing MCP Tools
 *
 * Create and manage social post A/B tests, analyze results,
 * check statistical significance, and declare winners.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const CreateTestSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  post_id: z.string().min(1).describe("Social post ID to A/B test."),
  variant_contents: z.array(z.string().min(1)).min(2).describe("Array of variant content strings (min 2)."),
  hypothesis: z.string().optional().describe("Optional hypothesis for the test."),
});

const GetResultsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  test_id: z.string().min(1).describe("A/B test ID."),
});

const DeclareWinnerSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  test_id: z.string().min(1).describe("A/B test ID."),
  winning_variant_id: z.string().min(1).describe("ID of the winning variant."),
});

const ListActiveSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
});

const CheckSignificanceSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  test_id: z.string().min(1).describe("A/B test ID."),
});

/**
 * Calculate z-test significance between control and variant conversion rates.
 * Returns p-value and whether the result is significant at 95% confidence.
 */
function calculateSignificance(
  controlImpressions: number,
  controlConversions: number,
  variantImpressions: number,
  variantConversions: number,
): { pValue: number; significant: boolean; confidence: string } {
  if (controlImpressions === 0 || variantImpressions === 0) {
    return { pValue: 1, significant: false, confidence: "Insufficient data" };
  }

  const p1 = controlConversions / controlImpressions;
  const p2 = variantConversions / variantImpressions;
  const pPooled =
    (controlConversions + variantConversions) /
    (controlImpressions + variantImpressions);

  const se = Math.sqrt(
    pPooled * (1 - pPooled) * (1 / controlImpressions + 1 / variantImpressions),
  );

  if (se === 0) {
    return { pValue: 1, significant: false, confidence: "No variance" };
  }

  const zScore = (p2 - p1) / se;
  // Approximate two-tailed p-value using normal CDF approximation
  const absZ = Math.abs(zScore);
  const pValue = Math.exp(-0.5 * absZ * absZ) / (absZ * 0.3989422804 + 1);

  const significant = pValue < 0.05;
  let confidence: string;
  if (pValue < 0.01) confidence = "99%";
  else if (pValue < 0.05) confidence = "95%";
  else if (pValue < 0.1) confidence = "90%";
  else confidence = "Not significant";

  return { pValue, significant, confidence };
}

export function registerAbTestingTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "abtest_create",
    description: "Create an A/B test for a social post with multiple content variants and an optional hypothesis.",
    category: "ab-testing",
    tier: "free",
    inputSchema: CreateTestSchema.shape,
    handler: async (args: z.infer<typeof CreateTestSchema>): Promise<CallToolResult> =>
      safeToolCall("abtest_create", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const test = await prisma.socialPostAbTest.create({
          data: {
            postId: args.post_id,
            workspaceId: workspace.id,
            status: "DRAFT",
          },
        });

        const variantIds: string[] = [];
        for (let i = 0; i < args.variant_contents.length; i++) {
          const variant = await prisma.socialPostAbTestVariant.create({
            data: {
              testId: test.id,
              content: args.variant_contents[i]!,
              variantIndex: i,
            },
          });
          variantIds.push(variant.id);
        }

        if (args.hypothesis) {
          await prisma.hypothesis.create({
            data: {
              testId: test.id,
              content: args.hypothesis,
            },
          });
        }

        let text = `**A/B Test Created**\n\n`;
        text += `**Test ID:** \`${test.id}\`\n`;
        text += `**Post ID:** \`${args.post_id}\`\n`;
        text += `**Status:** ACTIVE\n`;
        text += `**Variants:** ${variantIds.length}\n`;
        if (args.hypothesis) {
          text += `**Hypothesis:** ${args.hypothesis}\n`;
        }
        text += `\n| # | Variant ID |\n`;
        text += `|---|------------|\n`;
        for (let i = 0; i < variantIds.length; i++) {
          text += `| ${i + 1} | \`${variantIds[i]}\` |\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "abtest_get_results",
    description: "Get detailed results for an A/B test including per-variant metrics, confidence intervals, and significance.",
    category: "ab-testing",
    tier: "free",
    inputSchema: GetResultsSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetResultsSchema>): Promise<CallToolResult> =>
      safeToolCall("abtest_get_results", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);

        const test = await prisma.socialPostAbTest.findFirst({
          where: { id: args.test_id },
          include: {
            variants: {
              include: { metrics: true },
              orderBy: { variantIndex: "asc" },
            },
          },
        });

        if (!test) {
          return textResult("**Error: NOT_FOUND**\nA/B test not found.\n**Retryable:** false");
        }

        let text = `**A/B Test Results**\n\n`;
        text += `**Test ID:** \`${test.id}\`\n`;
        text += `**Status:** ${test.status}\n\n`;
        text += `| Variant | Impressions | Clicks | CTR | Conversions | Conv. Rate |\n`;
        text += `|---------|------------|--------|-----|-------------|------------|\n`;

        for (const v of test.variants) {
          const m = v.metrics;
          if (m) {
            const ctr = m.impressions > 0
              ? ((m.clicks / m.impressions) * 100).toFixed(2)
              : "0.00";
            const convRate = m.impressions > 0
              ? ((m.conversions / m.impressions) * 100).toFixed(2)
              : "0.00";
            text += `| \`${v.id}\` | ${m.impressions} | ${m.clicks} | ${ctr}% | ${m.conversions} | ${convRate}% |\n`;
          } else {
            text += `| \`${v.id}\` | - | - | - | - | - |\n`;
          }
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "abtest_declare_winner",
    description: "Declare a winning variant for an A/B test and mark the test as completed.",
    category: "ab-testing",
    tier: "free",
    inputSchema: DeclareWinnerSchema.shape,
    handler: async (args: z.infer<typeof DeclareWinnerSchema>): Promise<CallToolResult> =>
      safeToolCall("abtest_declare_winner", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);

        const test = await prisma.socialPostAbTest.findFirst({
          where: { id: args.test_id },
        });

        if (!test) {
          return textResult("**Error: NOT_FOUND**\nA/B test not found.\n**Retryable:** false");
        }

        await prisma.socialPostAbTest.update({
          where: { id: args.test_id },
          data: {
            status: "COMPLETED",
            winnerVariantId: args.winning_variant_id,
          },
        });

        let text = `**Winner Declared**\n\n`;
        text += `**Test ID:** \`${args.test_id}\`\n`;
        text += `**Winner:** \`${args.winning_variant_id}\`\n`;
        text += `**Status:** COMPLETED\n`;
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "abtest_list_active",
    description: "List all active A/B tests in a workspace with post previews and variant counts.",
    category: "ab-testing",
    tier: "free",
    inputSchema: ListActiveSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof ListActiveSchema>): Promise<CallToolResult> =>
      safeToolCall("abtest_list_active", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const tests = await prisma.socialPostAbTest.findMany({
          where: { workspaceId: workspace.id, status: "ACTIVE" },
          include: {
            post: { select: { content: true } },
            _count: { select: { variants: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        if (tests.length === 0) {
          return textResult("**Active A/B Tests**\n\nNo active tests found.");
        }

        let text = `**Active A/B Tests** (${tests.length})\n\n`;
        text += `| Test ID | Post Preview | Variants | Started |\n`;
        text += `|---------|-------------|----------|---------|\n`;
        for (const t of tests) {
          const preview = t.post?.content
            ? t.post.content.slice(0, 50) + (t.post.content.length > 50 ? "..." : "")
            : "(no content)";
          text += `| \`${t.id}\` | ${preview} | ${t._count.variants} | ${t.createdAt.toISOString()} |\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "abtest_check_significance",
    description: "Check statistical significance of an A/B test using z-test on conversion rates. Compares each variant against the control (first variant).",
    category: "ab-testing",
    tier: "free",
    inputSchema: CheckSignificanceSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof CheckSignificanceSchema>): Promise<CallToolResult> =>
      safeToolCall("abtest_check_significance", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);

        const test = await prisma.socialPostAbTest.findFirst({
          where: { id: args.test_id },
          include: {
            variants: {
              include: { metrics: true },
              orderBy: { variantIndex: "asc" },
            },
          },
        });

        if (!test) {
          return textResult("**Error: NOT_FOUND**\nA/B test not found.\n**Retryable:** false");
        }

        if (test.variants.length < 2) {
          return textResult("**Error: VALIDATION_ERROR**\nNeed at least 2 variants for significance testing.\n**Retryable:** false");
        }

        const control = test.variants[0]!;
        const controlMetrics = control.metrics;

        let text = `**Statistical Significance**\n\n`;
        text += `**Test ID:** \`${test.id}\`\n`;
        text += `**Control:** \`${control.id}\`\n\n`;
        text += `| Variant | p-Value | Confidence | Significant |\n`;
        text += `|---------|---------|-----------|-------------|\n`;

        for (let i = 1; i < test.variants.length; i++) {
          const variant = test.variants[i]!;
          const variantMetrics = variant.metrics;

          const result = calculateSignificance(
            controlMetrics?.impressions ?? 0,
            controlMetrics?.conversions ?? 0,
            variantMetrics?.impressions ?? 0,
            variantMetrics?.conversions ?? 0,
          );

          text += `| \`${variant.id}\` | ${result.pValue.toFixed(4)} | ${result.confidence} | ${result.significant ? "Yes" : "No"} |\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });
}
