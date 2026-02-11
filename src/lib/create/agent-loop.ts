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

/** Maximum total tokens (input + output) per generation to prevent runaway costs. */
const TOKEN_BUDGET_MAX = 150_000;
/** Maximum fix iterations, clamped regardless of env var. */
const MAX_ITERATIONS_CAP = 5;
/** Max tokens for Sonnet fix calls — fixes rarely produce >4k tokens. */
const FIX_MAX_TOKENS = 8192;

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
  /** IDs of notes retrieved for this generation (for metrics). */
  notesRetrieved: string[];
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
  const maxIterations = Math.min(
    parseInt(process.env["AGENT_MAX_ITERATIONS"] || "3", 10),
    MAX_ITERATIONS_CAP,
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
    notesRetrieved: [],
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
    ctx.notesRetrieved = ctx.notes.map((n) => n.id);

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
      systemPrompt: systemPrompt.full,
      stablePrefix: systemPrompt.stablePrefix,
      dynamicSuffix: systemPrompt.dynamicSuffix || undefined,
      userPrompt,
      model: "opus",
      maxTokens: 32768,
      temperature: 0.5,
    });

    ctx.totalInputTokens += genResponse.inputTokens;
    ctx.totalOutputTokens += genResponse.outputTokens;
    ctx.totalCachedTokens += genResponse.cacheReadTokens;

    // Token budget check
    if (ctx.totalInputTokens + ctx.totalOutputTokens > TOKEN_BUDGET_MAX) {
      throw new Error(`Token budget exceeded (${ctx.totalInputTokens + ctx.totalOutputTokens}/${TOKEN_BUDGET_MAX})`);
    }

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

        // Attribution-gated confidence: only credit notes on fix success (iteration > 0),
        // and only notes relevant to the errors that were actually fixed.
        if (ctx.iteration > 0) {
          const fixedErrors = ctx.errors.filter((e) => e.fixed);
          const relevantNoteIds = getRelevantNoteIds(ctx.notes, fixedErrors);
          if (relevantNoteIds.length > 0) {
            await recordSuccess(relevantNoteIds);
          }
        }
        // On first-try success (iteration 0), notes get no credit — they didn't demonstrably help.

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
          notesApplied: ctx.notesRetrieved,
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
        {
          type: structuredError.type,
          library: structuredError.library,
          lineNumber: structuredError.lineNumber,
          suggestion: structuredError.suggestion,
        },
      );

      try {
        const fixResponse = await callClaude({
          systemPrompt: fixSystemPrompt.full,
          stablePrefix: fixSystemPrompt.stablePrefix,
          dynamicSuffix: fixSystemPrompt.dynamicSuffix || undefined,
          userPrompt: fixUserPrompt,
          model: "sonnet",
          maxTokens: FIX_MAX_TOKENS,
          temperature: 0.2,
        });

        ctx.totalInputTokens += fixResponse.inputTokens;
        ctx.totalOutputTokens += fixResponse.outputTokens;
        ctx.totalCachedTokens += fixResponse.cacheReadTokens;

        // Token budget check after fix call
        if (ctx.totalInputTokens + ctx.totalOutputTokens > TOKEN_BUDGET_MAX) {
          logger.warn("Token budget exceeded during fix loop, breaking", {
            total: ctx.totalInputTokens + ctx.totalOutputTokens,
            budget: TOKEN_BUDGET_MAX,
          });
          break;
        }

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
    // Attribution-gated failure: only penalize notes relevant to encountered errors
    const relevantFailNoteIds = getRelevantNoteIds(ctx.notes, ctx.errors);
    if (relevantFailNoteIds.length > 0) {
      await recordFailure(relevantFailNoteIds);
    }

    recordGenerationAttempt({
      slug,
      success: false,
      iterations: ctx.iteration,
      totalDurationMs: Date.now() - ctx.startTime,
      notesApplied: ctx.notesRetrieved,
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
      notesApplied: ctx.notesRetrieved,
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

/**
 * Find note IDs relevant to the given errors based on overlapping errorPatterns or libraries.
 * Used for attribution-gated confidence updates.
 */
function getRelevantNoteIds(
  notes: LearningNote[],
  errors: Array<{ error: string; iteration: number; fixed?: boolean }>,
): string[] {
  if (notes.length === 0 || errors.length === 0) return [];

  // We need the full note data — retrieve from the original notes which have
  // id/trigger/lesson/confidenceScore. For pattern matching we check if any
  // error substring appears in the note's trigger or lesson.
  const errorTexts = errors.map((e) => e.error.toLowerCase());

  return notes
    .filter((note) => {
      const triggerLower = note.trigger.toLowerCase();
      const lessonLower = note.lesson.toLowerCase();
      return errorTexts.some(
        (errText) => errText.includes(triggerLower) || triggerLower.includes(errText.slice(0, 50)),
      ) || errorTexts.some(
        (errText) => lessonLower.includes(errText.slice(0, 50)),
      );
    })
    .map((n) => n.id);
}
