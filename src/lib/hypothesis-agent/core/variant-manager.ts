/**
 * Variant Manager
 * Epic #516
 *
 * Manages experiment variants and assignment logic.
 */

import prisma from "@/lib/prisma";
import type { ExperimentVariant, Prisma } from "@prisma/client";
import { createHash } from "crypto";

/**
 * Assign a variant to a visitor based on split percentages.
 *
 * Uses consistent hashing to ensure same visitor always gets same variant.
 *
 * @param experimentId - Experiment ID
 * @param visitorId - Visitor identifier (session ID, user ID, etc.)
 * @returns Assigned variant
 */
export async function assignVariant(
  experimentId: string,
  visitorId: string
): Promise<ExperimentVariant> {
  // Get experiment variants
  const variants = await prisma.experimentVariant.findMany({
    where: { experimentId },
    orderBy: { createdAt: "asc" }, // Consistent ordering
  });

  if (variants.length === 0) {
    throw new Error("No variants found for experiment");
  }

  if (variants.length === 1) {
    const first = variants[0];
    if (!first) throw new Error("Variant is undefined");
    return first;
  }

  // Use consistent hashing to assign variant
  const hash = createHash("md5")
    .update(`${experimentId}:${visitorId}`)
    .digest("hex");

  // Convert first 8 characters of hash to number between 0 and 1
  const hashValue = parseInt(hash.substring(0, 8), 16) / 0xffffffff;

  // Find variant based on split percentages
  let cumulativePercentage = 0;
  for (const variant of variants) {
    cumulativePercentage += variant.splitPercentage;
    if (hashValue * 100 < cumulativePercentage) {
      return variant;
    }
  }

  // Fallback to last variant (shouldn't happen with proper split percentages)
  const last = variants[variants.length - 1];
  if (!last) throw new Error("No variants found");
  return last;
}

/**
 * Get variant by ID.
 *
 * @param variantId - Variant ID
 * @returns Variant
 */
export async function getVariant(variantId: string): Promise<ExperimentVariant | null> {
  return await prisma.experimentVariant.findUnique({
    where: { id: variantId },
  });
}

/**
 * Update variant metrics (impressions, conversions, total value).
 *
 * @param variantId - Variant ID
 * @param metrics - Metrics to increment
 */
export async function updateVariantMetrics(
  variantId: string,
  metrics: {
    impressions?: number;
    conversions?: number;
    totalValue?: number;
  }
): Promise<ExperimentVariant> {
  return await prisma.experimentVariant.update({
    where: { id: variantId },
    data: {
      ...(metrics.impressions && {
        impressions: { increment: metrics.impressions },
      }),
      ...(metrics.conversions && {
        conversions: { increment: metrics.conversions },
      }),
      ...(metrics.totalValue && {
        totalValue: { increment: metrics.totalValue },
      }),
    },
  });
}

/**
 * Get all variants for an experiment.
 *
 * @param experimentId - Experiment ID
 * @returns Array of variants
 */
export async function getVariants(experimentId: string): Promise<ExperimentVariant[]> {
  return await prisma.experimentVariant.findMany({
    where: { experimentId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Update variant content.
 *
 * @param variantId - Variant ID
 * @param content - New content
 * @returns Updated variant
 */
export async function updateVariantContent(
  variantId: string,
  content: Record<string, unknown>
): Promise<ExperimentVariant> {
  return await prisma.experimentVariant.update({
    where: { id: variantId },
    data: { content: content as Prisma.InputJsonValue },
  });
}

/**
 * Delete a variant.
 *
 * Note: Cannot delete if experiment is running or if it's the last variant.
 *
 * @param variantId - Variant ID
 */
export async function deleteVariant(variantId: string): Promise<void> {
  const variant = await prisma.experimentVariant.findUnique({
    where: { id: variantId },
    include: { experiment: true },
  });

  if (!variant) {
    throw new Error("Variant not found");
  }

  if (variant.experiment.status === "RUNNING") {
    throw new Error("Cannot delete variant from running experiment");
  }

  const variantCount = await prisma.experimentVariant.count({
    where: { experimentId: variant.experimentId },
  });

  if (variantCount <= 2) {
    throw new Error("Cannot delete variant: experiment must have at least 2 variants");
  }

  await prisma.experimentVariant.delete({
    where: { id: variantId },
  });
}

/**
 * Rebalance variant split percentages.
 *
 * Useful when adding/removing variants or adjusting traffic allocation.
 *
 * @param experimentId - Experiment ID
 * @param newSplits - New split percentages (must sum to 100)
 */
export async function rebalanceVariants(
  experimentId: string,
  newSplits: Record<string, number>
): Promise<ExperimentVariant[]> {
  const variants = await getVariants(experimentId);

  // Validate splits
  const totalSplit = Object.values(newSplits).reduce((sum, split) => sum + split, 0);
  if (Math.abs(totalSplit - 100) > 0.01) {
    throw new Error("Split percentages must sum to 100");
  }

  // Update each variant
  const updates = variants.map((variant) => {
    const newSplit = newSplits[variant.id];
    if (newSplit === undefined) {
      throw new Error(`Missing split percentage for variant ${variant.id}`);
    }

    return prisma.experimentVariant.update({
      where: { id: variant.id },
      data: { splitPercentage: newSplit },
    });
  });

  return await Promise.all(updates);
}

/**
 * Get control variant for an experiment.
 *
 * @param experimentId - Experiment ID
 * @returns Control variant
 */
export async function getControlVariant(
  experimentId: string
): Promise<ExperimentVariant | null> {
  return await prisma.experimentVariant.findFirst({
    where: {
      experimentId,
      isControl: true,
    },
  });
}
