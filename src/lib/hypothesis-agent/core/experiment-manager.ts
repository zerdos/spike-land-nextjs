/**
 * Experiment Manager
 * Epic #516
 *
 * Core manager for creating, updating, and managing experiments.
 */

import prisma from "@/lib/prisma";
import type {
  Experiment,
  ExperimentStatus,
} from "@prisma/client";
import type {
  CreateExperimentRequest,
  UpdateExperimentRequest,
  ExperimentWithRelations,
} from "@/types/hypothesis-agent";
import type { Prisma } from "@prisma/client";

/**
 * Create a new experiment.
 *
 * @param workspaceId - Workspace ID
 * @param request - Experiment creation request
 * @returns Created experiment with variants
 */
export async function createExperiment(
  workspaceId: string,
  request: CreateExperimentRequest
): Promise<ExperimentWithRelations> {
  // Validate variants
  if (request.variants.length < 2) {
    throw new Error("Experiment must have at least 2 variants");
  }

  // Validate split percentages sum to 100
  const totalSplit = request.variants.reduce(
    (sum, v) => sum + (v.splitPercentage ?? 50),
    0
  );
  if (Math.abs(totalSplit - 100) > 0.01 && request.variants.length > 1) {
    throw new Error("Variant split percentages must sum to 100");
  }

  // Create experiment with variants
  const experiment = await prisma.experiment.create({
    data: {
      workspaceId,
      name: request.name,
      description: request.description,
      hypothesis: request.hypothesis,
      contentType: request.contentType,
      adapterConfig: (request.adapterConfig ?? {}) as Prisma.InputJsonValue,
      significanceLevel: request.significanceLevel ?? 0.95,
      minimumSampleSize: request.minimumSampleSize ?? 100,
      winnerStrategy: request.winnerStrategy ?? "CONSERVATIVE",
      autoSelectWinner: request.autoSelectWinner ?? false,
      tags: request.tags ?? [],
      metadata: (request.metadata ?? {}) as Prisma.InputJsonValue,
      variants: {
        create: request.variants.map((v, _index) => ({
          name: v.name,
          description: v.description,
          content: (v.content ?? {}) as Prisma.InputJsonValue,
          splitPercentage: v.splitPercentage,
          isControl: v.isControl,
        })),
      },
    },
    include: {
      variants: true,
    },
  });
  return experiment as ExperimentWithRelations;
}

/**
 * Get experiment by ID with all relations.
 *
 * @param experimentId - Experiment ID
 * @returns Experiment with variants, events, and results
 */
export async function getExperiment(
  experimentId: string
): Promise<ExperimentWithRelations | null> {
  return await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: {
      variants: true,
      events: {
        orderBy: { createdAt: "desc" },
        take: 100, // Latest 100 events
      },
      results: {
        orderBy: { calculatedAt: "desc" },
        take: 10, // Latest 10 calculation results
      },
    },
  });
}

/**
 * List experiments for a workspace.
 *
 * @param workspaceId - Workspace ID
 * @param filters - Optional filters
 * @returns List of experiments
 */
export async function listExperiments(
  workspaceId: string,
  filters?: {
    status?: ExperimentStatus;
    contentType?: string;
    tags?: string[];
  }
): Promise<ExperimentWithRelations[]> {
  return await prisma.experiment.findMany({
    where: {
      workspaceId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.contentType && { contentType: filters.contentType }),
      ...(filters?.tags &&
        filters.tags.length > 0 && {
          tags: {
            hasSome: filters.tags,
          },
        }),
    },
    include: {
      variants: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Update an experiment.
 *
 * @param experimentId - Experiment ID
 * @param request - Update request
 * @returns Updated experiment
 */
export async function updateExperiment(
  experimentId: string,
  request: UpdateExperimentRequest
): Promise<Experiment> {
  return await prisma.experiment.update({
    where: { id: experimentId },
    data: {
      ...(request.name && { name: request.name }),
      ...(request.description !== undefined && { description: request.description }),
      ...(request.hypothesis !== undefined && { hypothesis: request.hypothesis }),
      ...(request.status && { status: request.status }),
      ...(request.significanceLevel && { significanceLevel: request.significanceLevel }),
      ...(request.winnerStrategy && { winnerStrategy: request.winnerStrategy }),
      ...(request.autoSelectWinner !== undefined && {
        autoSelectWinner: request.autoSelectWinner,
      }),
      ...(request.tags && { tags: request.tags }),
      ...(request.metadata && { metadata: request.metadata as Prisma.InputJsonValue }),
    },
  });
}

/**
 * Start an experiment (transition to RUNNING status).
 *
 * @param experimentId - Experiment ID
 * @returns Updated experiment
 */
export async function startExperiment(experimentId: string): Promise<Experiment> {
  return await prisma.experiment.update({
    where: { id: experimentId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
    },
  });
}

/**
 * Pause an experiment.
 *
 * @param experimentId - Experiment ID
 * @returns Updated experiment
 */
export async function pauseExperiment(experimentId: string): Promise<Experiment> {
  return await prisma.experiment.update({
    where: { id: experimentId },
    data: {
      status: "PAUSED",
    },
  });
}

/**
 * Complete an experiment and select winner.
 *
 * @param experimentId - Experiment ID
 * @param winnerVariantId - ID of winning variant
 * @returns Updated experiment
 */
export async function completeExperiment(
  experimentId: string,
  winnerVariantId: string
): Promise<Experiment> {
  return await prisma.experiment.update({
    where: { id: experimentId },
    data: {
      status: "COMPLETED",
      winnerVariantId,
      selectedAt: new Date(),
      completedAt: new Date(),
    },
  });
}

/**
 * Archive an experiment.
 *
 * @param experimentId - Experiment ID
 * @returns Updated experiment
 */
export async function archiveExperiment(experimentId: string): Promise<Experiment> {
  return await prisma.experiment.update({
    where: { id: experimentId },
    data: {
      status: "ARCHIVED",
    },
  });
}

/**
 * Delete an experiment and all related data.
 *
 * @param experimentId - Experiment ID
 */
export async function deleteExperiment(experimentId: string): Promise<void> {
  await prisma.experiment.delete({
    where: { id: experimentId },
  });
}

/**
 * Get active (running) experiments for a workspace.
 *
 * @param workspaceId - Workspace ID
 * @returns List of active experiments
 */
export async function getActiveExperiments(
  workspaceId: string
): Promise<ExperimentWithRelations[]> {
  return await listExperiments(workspaceId, { status: "RUNNING" });
}
