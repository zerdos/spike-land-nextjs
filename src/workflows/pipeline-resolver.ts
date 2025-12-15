/**
 * Pipeline Configuration Resolver
 *
 * This module handles resolving pipeline configurations from the database.
 * It's separate from enhance-image.shared.ts to avoid Prisma imports in
 * the workflow bundler (which doesn't support Node.js modules).
 *
 * Use this in the direct implementation. For workflows, resolve the pipeline
 * config before starting the workflow.
 */

import {
  parsePipelineConfig,
  type PipelineConfig,
  SYSTEM_DEFAULT_PIPELINE,
} from "@/lib/ai/pipeline-types";
import prisma from "@/lib/prisma";

/**
 * Result of pipeline resolution
 */
export interface PipelineResolutionResult {
  config: PipelineConfig;
  pipelineId: string | null;
}

/**
 * Resolves the pipeline configuration to use for an enhancement job.
 *
 * Priority:
 * 1. Explicit pipelineId (if provided)
 * 2. Album's pipeline (if albumId provided)
 * 3. System default
 *
 * @param albumId - Optional album ID to inherit pipeline from
 * @param pipelineId - Optional explicit pipeline ID
 * @returns Pipeline configuration and resolved pipeline ID
 */
export async function resolvePipelineConfig(
  albumId?: string,
  pipelineId?: string,
): Promise<PipelineResolutionResult> {
  let resolvedPipelineId = pipelineId;

  // Try album's pipeline if no explicit pipelineId
  if (!resolvedPipelineId && albumId) {
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      select: { pipelineId: true },
    });
    resolvedPipelineId = album?.pipelineId ?? undefined;
  }

  // Fetch pipeline config if we have a pipelineId
  if (resolvedPipelineId) {
    const pipeline = await prisma.enhancementPipeline.findUnique({
      where: { id: resolvedPipelineId },
      select: {
        tier: true,
        analysisConfig: true,
        autoCropConfig: true,
        promptConfig: true,
        generationConfig: true,
      },
    });

    if (pipeline) {
      // Increment usage count asynchronously (don't await)
      prisma.enhancementPipeline
        .update({
          where: { id: resolvedPipelineId },
          data: { usageCount: { increment: 1 } },
        })
        .catch(() => {
          // Ignore errors from usage count update
        });

      return {
        config: parsePipelineConfig(pipeline.tier, {
          analysisConfig: pipeline.analysisConfig as
            | PipelineConfig["analysis"]
            | null,
          autoCropConfig: pipeline.autoCropConfig as
            | PipelineConfig["autoCrop"]
            | null,
          promptConfig: pipeline.promptConfig as
            | PipelineConfig["prompt"]
            | null,
          generationConfig: pipeline.generationConfig as
            | PipelineConfig["generation"]
            | null,
        }),
        pipelineId: resolvedPipelineId,
      };
    }
  }

  // Fall back to system default
  return {
    config: SYSTEM_DEFAULT_PIPELINE,
    pipelineId: null,
  };
}
