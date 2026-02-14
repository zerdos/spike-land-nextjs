/**
 * Boost MCP Tools
 *
 * Detect boosting opportunities, get recommendations, apply boosts, and predict ROI.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const DetectOpportunitiesSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  min_engagement_rate: z.number().optional().default(0.05).describe("Minimum engagement rate threshold (default 0.05)."),
});

const GetRecommendationSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  recommendation_id: z.string().min(1).describe("Boost recommendation ID."),
});

const ApplyBoostSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  recommendation_id: z.string().min(1).describe("Boost recommendation ID to apply."),
  budget: z.number().min(0).describe("Budget amount for the boost."),
  confirm: z.boolean().describe("Must be true to confirm boost application."),
});

const PredictRoiSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  post_id: z.string().min(1).describe("Post ID to predict ROI for."),
  budget: z.number().min(0).describe("Budget amount to predict ROI for."),
});

export function registerBoostTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "boost_detect_opportunities",
    description: "Detect posts with high boosting potential based on engagement metrics.",
    category: "boost",
    tier: "free",
    inputSchema: DetectOpportunitiesSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof DetectOpportunitiesSchema>): Promise<CallToolResult> =>
      safeToolCall("boost_detect_opportunities", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);
        const recommendations = await prisma.postBoostRecommendation.findMany({
          where: { workspaceId: workspace.id },
          orderBy: { confidenceScore: "desc" },
          take: 10,
        });
        if (recommendations.length === 0) {
          return textResult("**Boost Opportunities**\n\nNo boost opportunities detected.");
        }
        let text = `**Boost Opportunities** (${recommendations.length})\n\n`;
        for (const r of recommendations) {
          const rRecord = r as unknown as Record<string, unknown>;
          const content = String(rRecord["contentPreview"] ?? "N/A");
          const engRate = Number(rRecord["engagementRate"] ?? 0);
          const roi = String(rRecord["predictedRoi"] ?? "N/A");
          const confidence = Number(rRecord["confidenceScore"] ?? 0);
          text += `- **${content.slice(0, 60)}${content.length > 60 ? "..." : ""}**\n`;
          text += `  Engagement: ${(engRate * 100).toFixed(1)}% | Predicted ROI: ${roi} | Confidence: ${(confidence * 100).toFixed(0)}%\n`;
          text += `  ID: \`${String(rRecord["id"])}\`\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "boost_get_recommendation",
    description: "Get detailed boost recommendation including post details and predicted metrics.",
    category: "boost",
    tier: "free",
    inputSchema: GetRecommendationSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetRecommendationSchema>): Promise<CallToolResult> =>
      safeToolCall("boost_get_recommendation", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);
        const rec = await prisma.postBoostRecommendation.findFirst({
          where: { id: args.recommendation_id, workspaceId: workspace.id },
        });
        if (!rec) {
          return textResult("**Error: NOT_FOUND**\nBoost recommendation not found.\n**Retryable:** false");
        }
        const rRecord = rec as unknown as Record<string, unknown>;
        return textResult(
          `**Boost Recommendation**\n\n` +
          `**ID:** \`${String(rRecord["id"])}\`\n` +
          `**Post:** ${String(rRecord["contentPreview"] ?? "N/A")}\n` +
          `**Engagement Rate:** ${((Number(rRecord["engagementRate"] ?? 0)) * 100).toFixed(1)}%\n` +
          `**Predicted ROI:** ${String(rRecord["predictedRoi"] ?? "N/A")}\n` +
          `**Confidence:** ${((Number(rRecord["confidenceScore"] ?? 0)) * 100).toFixed(0)}%\n` +
          `**Suggested Budget:** $${String(rRecord["suggestedBudget"] ?? "N/A")}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "boost_apply",
    description: "Apply a boost to a post based on a recommendation.",
    category: "boost",
    tier: "free",
    inputSchema: ApplyBoostSchema.shape,
    handler: async (args: z.infer<typeof ApplyBoostSchema>): Promise<CallToolResult> =>
      safeToolCall("boost_apply", async () => {
        if (!args.confirm) {
          return textResult("**Boost Not Applied**\n\nSet `confirm: true` to apply this boost.");
        }
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);
        const rec = await prisma.postBoostRecommendation.findFirst({
          where: { id: args.recommendation_id, workspaceId: workspace.id },
        });
        if (!rec) {
          return textResult("**Error: NOT_FOUND**\nBoost recommendation not found.\n**Retryable:** false");
        }
        const boost = await prisma.appliedBoost.create({
          data: {
            workspaceId: workspace.id,
            recommendationId: args.recommendation_id,
            postId: rec.postId,
            postType: rec.postType,
            platform: (rec.recommendedPlatforms[0] ?? "FACEBOOK") as "FACEBOOK" | "GOOGLE_ADS",
            budget: args.budget,
            status: "ACTIVE",
          },
        });
        return textResult(
          `**Boost Applied**\n\n` +
          `**Boost ID:** \`${boost.id}\`\n` +
          `**Recommendation:** \`${args.recommendation_id}\`\n` +
          `**Budget:** $${args.budget}\n` +
          `**Status:** PENDING`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "boost_predict_roi",
    description: "Predict ROI for boosting a specific post with a given budget.",
    category: "boost",
    tier: "free",
    inputSchema: PredictRoiSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof PredictRoiSchema>): Promise<CallToolResult> =>
      safeToolCall("boost_predict_roi", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);
        const post = await prisma.socialPost.findFirst({
          where: { id: args.post_id },
        });
        if (!post) {
          return textResult("**Error: NOT_FOUND**\nPost not found.\n**Retryable:** false");
        }
        const pRecord = post as unknown as Record<string, unknown>;
        const impressions = Number(pRecord["impressions"] ?? 0);
        const engagements = Number(pRecord["engagements"] ?? 0);
        const engRate = impressions > 0 ? engagements / impressions : 0.03;
        const estimatedImpressions = Math.round(args.budget * 1000);
        const estimatedClicks = Math.round(estimatedImpressions * engRate);
        const estimatedConversions = Math.round(estimatedClicks * 0.02);
        const roas = estimatedImpressions > 0 ? ((estimatedClicks * 0.5) / args.budget).toFixed(2) : "0.00";
        return textResult(
          `**ROI Prediction**\n\n` +
          `**Post ID:** \`${args.post_id}\`\n` +
          `**Budget:** $${args.budget}\n` +
          `**Current Engagement Rate:** ${(engRate * 100).toFixed(1)}%\n\n` +
          `**Estimated Results:**\n` +
          `- Impressions: ${estimatedImpressions.toLocaleString()}\n` +
          `- Clicks: ${estimatedClicks.toLocaleString()}\n` +
          `- Conversions: ${estimatedConversions.toLocaleString()}\n` +
          `- ROAS: ${roas}x`,
        );
      }, { timeoutMs: 30_000 }),
  });
}
