import { CreatedAppStatus } from "@prisma/client";
import {
  callClaude,
  extractCodeFromResponse,
  parseGenerationResponse,
} from "./agent-client";
import {
  extractAndSaveNote,
  recordFailure,
  recordGenerationAttempt,
  recordSuccess,
  retrieveRelevantNotes,
} from "./agent-memory";
import {
  buildAgentSystemPrompt,
  buildAgentUserPrompt,
  buildFixSystemPrompt,
  buildFixUserPrompt,
  type LearningNote,
} from "./agent-prompts";
import { generateCodespaceId, updateCodespace } from "./codespace-service";
import { cleanCode } from "./content-generator";
import {
  markAsGenerating,
  updateAppContent,
  updateAppStatus,
} from "./content-service";
import { parseTranspileError } from "./error-parser";
import type { StreamEvent } from "./types";
import logger from "@/lib/logger";

interface AgentContext {
  slug: string;
  path: string[];
  codespaceId: string;
  codespaceUrl: string;
  iteration: number;
  maxIterations: number;
  currentCode: string | null;
  title: string;
  description: string;
  relatedApps: string[];
  errors: Array<{ error: string; iteration: number; fixed: boolean }>;
  notesApplied: string[];
  notes: LearningNote[];
  startTime: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedTokens: number;
}

/**
 * Core agent loop: Generate → Transpile → Verify → Fix → Learn.
 *
 * Yields StreamEvent objects for SSE streaming to the client.
 * Uses Claude Opus for initial generation, Sonnet for fixes,
 * and Haiku for learning note extraction.
 */
export async function* agentGenerateApp(
  slug: string,
  path: string[],
  userId: string | undefined,
): AsyncGenerator<StreamEvent> {
  const codespaceId = generateCodespaceId(slug);
  const codespaceUrl = `https://testing.spike.land/live/${codespaceId}/`;
  const maxIterations = parseInt(
    process.env["AGENT_MAX_ITERATIONS"] || "3",
    10,
  );

  const ctx: AgentContext = {
    slug,
    path,
    codespaceId,
    codespaceUrl,
    iteration: 0,
    maxIterations,
    currentCode: null,
    title: path[path.length - 1]?.replace(/-/g, " ") || "New App",
    description: "Generating app...",
    relatedApps: [],
    errors: [],
    notesApplied: [],
    notes: [],
    startTime: Date.now(),
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCachedTokens: 0,
  };

  try {
    // === INIT: Mark as generating in DB ===
    yield { type: "status", message: "Initializing app generation..." };
    await markAsGenerating(
      slug,
      path,
      ctx.title,
      ctx.description,
      codespaceId,
      codespaceUrl,
      `Agent loop: ${slug}`,
      userId,
    );

    // === PLANNING: Retrieve notes and build prompts ===
    yield {
      type: "phase",
      phase: "PLANNING",
      message: "Assembling context and learning notes...",
    };
    ctx.notes = await retrieveRelevantNotes(path);
    ctx.notesApplied = ctx.notes.map((n) => n.id);

    const topic = path.join("/");
    const systemPrompt = buildAgentSystemPrompt(topic, ctx.notes);
    const userPrompt = buildAgentUserPrompt(path);

    // === GENERATING: Call Claude Opus ===
    yield {
      type: "phase",
      phase: "GENERATING",
      message: "Generating application with Claude...",
    };

    const genResponse = await callClaude({
      systemPrompt,
      userPrompt,
      model: "opus",
      maxTokens: 32768,
      temperature: 0.5,
    });

    ctx.totalInputTokens += genResponse.inputTokens;
    ctx.totalOutputTokens += genResponse.outputTokens;
    ctx.totalCachedTokens += genResponse.cacheReadTokens;

    // Parse structured response
    const parsed = parseGenerationResponse(genResponse.text, slug);
    if (!parsed?.code) {
      throw new Error("Failed to generate valid code from Claude");
    }

    ctx.currentCode = cleanCode(parsed.code);
    ctx.title = parsed.title;
    ctx.description = parsed.description;
    ctx.relatedApps = parsed.relatedApps;

    yield {
      type: "code_generated",
      codePreview: ctx.currentCode.slice(0, 200),
    };

    // === TRANSPILE + FIX LOOP ===
    while (ctx.iteration < ctx.maxIterations) {
      yield {
        type: "phase",
        phase: "TRANSPILING",
        message:
          `Transpiling (attempt ${ctx.iteration + 1}/${ctx.maxIterations})...`,
        iteration: ctx.iteration,
      };

      const result = await updateCodespace(codespaceId, ctx.currentCode!);

      if (result.success) {
        // === SUCCESS: Publish ===
        yield {
          type: "phase",
          phase: "PUBLISHED",
          message: "App published successfully!",
        };

        // Record note effectiveness
        await recordSuccess(ctx.notesApplied);

        // Update DB
        await updateAppContent(slug, ctx.title, ctx.description);
        await updateAppStatus(
          slug,
          CreatedAppStatus.PUBLISHED,
          ctx.relatedApps,
        );

        // Record metrics (fire-and-forget)
        recordGenerationAttempt({
          slug,
          success: true,
          iterations: ctx.iteration,
          totalDurationMs: Date.now() - ctx.startTime,
          notesApplied: ctx.notesApplied,
          errors: ctx.errors,
          model: "opus",
          inputTokens: ctx.totalInputTokens,
          outputTokens: ctx.totalOutputTokens,
          cachedTokens: ctx.totalCachedTokens,
        }).catch(() => {});

        yield {
          type: "complete",
          slug,
          url: codespaceUrl,
          title: ctx.title,
          description: ctx.description,
          relatedApps: ctx.relatedApps,
        };
        return;
      }

      // === TRANSPILE FAILED ===
      const errorMsg = result.error || "Unknown transpilation error";
      const structuredError = parseTranspileError(errorMsg);

      yield {
        type: "error_detected",
        error: errorMsg.slice(0, 200),
        iteration: ctx.iteration,
      };

      ctx.errors.push({
        error: errorMsg,
        iteration: ctx.iteration,
        fixed: false,
      });

      // === FIXING: Ask Claude Sonnet to fix the error ===
      yield {
        type: "phase",
        phase: "FIXING",
        message:
          `Fixing ${structuredError.type} error (attempt ${ctx.iteration + 1})...`,
        iteration: ctx.iteration,
      };

      const fixSystemPrompt = buildFixSystemPrompt(topic, ctx.notes);
      const fixUserPrompt = buildFixUserPrompt(
        ctx.currentCode!,
        errorMsg,
        ctx.errors.map((e) => ({ error: e.error, iteration: e.iteration })),
      );

      try {
        const fixResponse = await callClaude({
          systemPrompt: fixSystemPrompt,
          userPrompt: fixUserPrompt,
          model: "sonnet",
          maxTokens: 32768,
          temperature: 0.2,
        });

        ctx.totalInputTokens += fixResponse.inputTokens;
        ctx.totalOutputTokens += fixResponse.outputTokens;
        ctx.totalCachedTokens += fixResponse.cacheReadTokens;

        const fixedCode = extractCodeFromResponse(fixResponse.text);
        if (fixedCode) {
          ctx.currentCode = cleanCode(fixedCode);
          ctx.errors[ctx.errors.length - 1]!.fixed = true;
          yield { type: "error_fixed", iteration: ctx.iteration };
        }
      } catch (fixError) {
        logger.error("Fix attempt failed", {
          error: fixError,
          iteration: ctx.iteration,
        });
      }

      // === LEARNING: Extract note from this error (fire-and-forget) ===
      yield {
        type: "phase",
        phase: "LEARNING",
        message: "Recording lesson learned...",
      };

      extractAndSaveNote(
        ctx.currentCode!,
        errorMsg,
        ctx.errors[ctx.errors.length - 1]?.fixed ? ctx.currentCode : null,
        path,
      ).catch((err) => {
        logger.warn("Note extraction failed", { error: err });
      });

      yield {
        type: "learning",
        notePreview: `Learned from: ${structuredError.type} error`,
      };

      ctx.iteration++;
    }

    // === EXHAUSTED ALL ITERATIONS ===
    await recordFailure(ctx.notesApplied);

    recordGenerationAttempt({
      slug,
      success: false,
      iterations: ctx.iteration,
      totalDurationMs: Date.now() - ctx.startTime,
      notesApplied: ctx.notesApplied,
      errors: ctx.errors,
      model: "opus",
      inputTokens: ctx.totalInputTokens,
      outputTokens: ctx.totalOutputTokens,
      cachedTokens: ctx.totalCachedTokens,
    }).catch(() => {});

    try {
      await updateAppStatus(slug, CreatedAppStatus.FAILED);
    } catch {
      // Ignore
    }

    yield {
      type: "error",
      message: `Failed after ${ctx.maxIterations} fix attempts`,
      codespaceUrl,
    };
  } catch (error) {
    logger.error(`Agent loop failed for ${slug}:`, { error });

    try {
      await updateAppStatus(slug, CreatedAppStatus.FAILED);
    } catch {
      // Ignore
    }

    // Record the failed attempt
    recordGenerationAttempt({
      slug,
      success: false,
      iterations: ctx.iteration,
      totalDurationMs: Date.now() - ctx.startTime,
      notesApplied: ctx.notesApplied,
      errors: [
        ...ctx.errors,
        {
          error: error instanceof Error ? error.message : "Unknown",
          iteration: ctx.iteration,
          fixed: false,
        },
      ],
      model: "opus",
      inputTokens: ctx.totalInputTokens,
      outputTokens: ctx.totalOutputTokens,
      cachedTokens: ctx.totalCachedTokens,
    }).catch(() => {});

    yield {
      type: "error",
      message: error instanceof Error ? error.message : "Generation failed",
      codespaceUrl,
    };
  }
}
