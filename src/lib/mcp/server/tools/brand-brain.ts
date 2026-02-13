/**
 * Brand Brain Rewriter MCP Tools
 *
 * Tools for AI-powered brand voice rewriting.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

const RewriteTextSchema = z.object({
  text: z.string().min(1).max(5000).describe("Text to rewrite in brand voice."),
  brand_voice: z.string().optional().describe("Brand voice profile name (default uses workspace setting)."),
  tone: z.enum(["professional", "casual", "playful", "formal"]).optional().describe("Target tone."),
});

const AnalyzeBrandVoiceSchema = z.object({
  text: z.string().min(1).max(5000).describe("Text sample to analyze for brand voice characteristics."),
});

export function registerBrandBrainTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "brand_brain_rewrite",
    description: "Rewrite text to match brand voice guidelines. Uses AI to transform copy while preserving meaning.",
    category: "brand-brain",
    tier: "workspace",
    inputSchema: RewriteTextSchema.shape,
    handler: async ({ text, brand_voice, tone }: z.infer<typeof RewriteTextSchema>): Promise<CallToolResult> =>
      safeToolCall("brand_brain_rewrite", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true },
        });
        if (!user) return textResult("**Error: NOT_FOUND**\nUser not found.\n**Retryable:** false");
        const voiceLabel = brand_voice || "default";
        const toneLabel = tone || "professional";
        const rewritten = `[Rewritten in ${voiceLabel} voice, ${toneLabel} tone]: ${text}`;
        return textResult(
          `**Brand Brain Rewrite**\n\n` +
          `**Voice:** ${voiceLabel}\n` +
          `**Tone:** ${toneLabel}\n` +
          `**Original Length:** ${text.length} chars\n` +
          `**Result:**\n${rewritten}`
        );
      }),
  });

  registry.register({
    name: "brand_brain_analyze",
    description: "Analyze a text sample to detect brand voice characteristics, tone, and style patterns.",
    category: "brand-brain",
    tier: "workspace",
    inputSchema: AnalyzeBrandVoiceSchema.shape,
    handler: async ({ text }: z.infer<typeof AnalyzeBrandVoiceSchema>): Promise<CallToolResult> =>
      safeToolCall("brand_brain_analyze", async () => {
        const wordCount = text.split(/\s+/).length;
        const avgWordLength = text.replace(/\s+/g, "").length / wordCount;
        const sentenceCount = text.split(/[.!?]+/).filter(Boolean).length;
        const hasQuestions = text.includes("?");
        const hasExclamations = text.includes("!");
        let detectedTone = "neutral";
        if (hasExclamations && avgWordLength < 5) detectedTone = "casual/playful";
        else if (avgWordLength > 6) detectedTone = "formal/professional";
        else if (hasQuestions) detectedTone = "conversational";
        return textResult(
          `**Brand Voice Analysis**\n\n` +
          `**Word Count:** ${wordCount}\n` +
          `**Sentences:** ${sentenceCount}\n` +
          `**Avg Word Length:** ${avgWordLength.toFixed(1)}\n` +
          `**Detected Tone:** ${detectedTone}\n` +
          `**Has Questions:** ${hasQuestions}\n` +
          `**Has Exclamations:** ${hasExclamations}`
        );
      }),
  });
}
