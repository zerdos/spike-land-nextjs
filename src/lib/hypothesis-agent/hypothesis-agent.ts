/**
 * Hypothesis Agent - Main Interface
 * Epic #516
 *
 * Main entry point for the Hypothesis Agent experimentation framework.
 * Orchestrates experiments, variants, events, and analysis.
 */

import type {
  ExperimentWithRelations,
  CreateExperimentRequest,
  UpdateExperimentRequest,
  ExperimentAnalysis,
  StatisticalResult,
  ExperimentEventData,
  WinnerSelectionConfig,
} from "@/types/hypothesis-agent";
import type { ExperimentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";

// Core managers
import * as ExperimentManager from "./core/experiment-manager";
import * as VariantManager from "./core/variant-manager";
import * as EventTracker from "./core/event-tracker";

// Statistical engine
import {
  wilsonScoreInterval,
} from "./statistical-engine/confidence-intervals";

// Winner selection
import { selectWinner, checkTimeConstraints } from "./winner-selection/winner-selector";

/**
 * Hypothesis Agent class - main interface for experiments.
 */
export class HypothesisAgent {
  constructor(private workspaceId: string) {}

  // ============================================================================
  // Experiment Management
  // ============================================================================

  async createExperiment(request: CreateExperimentRequest): Promise<ExperimentWithRelations> {
    return await ExperimentManager.createExperiment(this.workspaceId, request);
  }

  async getExperiment(experimentId: string): Promise<ExperimentWithRelations | null> {
    const experiment = await ExperimentManager.getExperiment(experimentId);

    // Verify workspace ownership
    if (experiment && experiment.workspaceId !== this.workspaceId) {
      throw new Error("Experiment not found in workspace");
    }

    return experiment;
  }

  async listExperiments(filters?: {
    status?: ExperimentStatus;
    contentType?: string;
    tags?: string[];
  }): Promise<ExperimentWithRelations[]> {
    return await ExperimentManager.listExperiments(this.workspaceId, filters);
  }

  async updateExperiment(
    experimentId: string,
    request: UpdateExperimentRequest
  ): Promise<ExperimentWithRelations> {
    // Verify ownership
    await this.verifyExperimentOwnership(experimentId);

    const experiment = await ExperimentManager.updateExperiment(experimentId, request);
    const updated = await this.getExperiment(experiment.id);
    if (!updated) throw new Error("Failed to retrieve updated experiment");
    return updated;
  }

  async startExperiment(experimentId: string): Promise<ExperimentWithRelations> {
    await this.verifyExperimentOwnership(experimentId);

    const experiment = await ExperimentManager.startExperiment(experimentId);
    const updated = await this.getExperiment(experiment.id);
    if (!updated) throw new Error("Failed to retrieve updated experiment");
    return updated;
  }

  async pauseExperiment(experimentId: string): Promise<ExperimentWithRelations> {
    await this.verifyExperimentOwnership(experimentId);

    const experiment = await ExperimentManager.pauseExperiment(experimentId);
    const updated = await this.getExperiment(experiment.id);
    if (!updated) throw new Error("Failed to retrieve updated experiment");
    return updated;
  }

  async deleteExperiment(experimentId: string): Promise<void> {
    await this.verifyExperimentOwnership(experimentId);
    await ExperimentManager.deleteExperiment(experimentId);
  }

  // ============================================================================
  // Variant Management
  // ============================================================================

  async assignVariant(experimentId: string, visitorId: string) {
    await this.verifyExperimentOwnership(experimentId);
    return await VariantManager.assignVariant(experimentId, visitorId);
  }

  async getVariants(experimentId: string) {
    await this.verifyExperimentOwnership(experimentId);
    return await VariantManager.getVariants(experimentId);
  }

  // ============================================================================
  // Event Tracking
  // ============================================================================

  async trackEvent(
    experimentId: string,
    variantId: string,
    event: ExperimentEventData
  ) {
    await this.verifyExperimentOwnership(experimentId);
    return await EventTracker.trackEvent(experimentId, variantId, event);
  }

  async trackEventsBatch(
    events: Array<{
      experimentId: string;
      variantId: string;
      event: ExperimentEventData;
    }>
  ) {
    // Verify all experiments belong to workspace
    const experimentIds = [...new Set(events.map((e) => e.experimentId))];
    await Promise.all(experimentIds.map((id) => this.verifyExperimentOwnership(id)));

    return await EventTracker.trackEventsBatch(events);
  }

  // ============================================================================
  // Analysis & Results
  // ============================================================================

  async analyzeExperiment(experimentId: string): Promise<ExperimentAnalysis> {
    await this.verifyExperimentOwnership(experimentId);

    const experiment = await this.getExperiment(experimentId);
    if (!experiment) {
      throw new Error("Experiment not found");
    }

    const variants = experiment.variants;

    // Calculate statistical results for each variant
    const results: StatisticalResult[] = variants.map((variant) => {
      const conversionRate =
        variant.impressions > 0 ? variant.conversions / variant.impressions : 0;

      // Wilson score confidence interval
      const ci = wilsonScoreInterval(
        variant.conversions,
        variant.impressions,
        experiment.significanceLevel
      );

      // Calculate lift vs control
      const control = variants.find((v) => v.isControl) || variants[0];
      if (!control) throw new Error("No variants found");

      return {
        variantId: variant.id,
        variantName: variant.name,
        impressions: variant.impressions,
        conversions: variant.conversions,
        conversionRate,
        confidenceInterval: {
          lower: ci.lower,
          upper: ci.upper,
          level: experiment.significanceLevel,
        },
        isSignificant: false, // Will be set below
        zScore: undefined,
        pValue: undefined,
        totalValue: variant.totalValue,
        avgValue: variant.impressions > 0 ? variant.totalValue / variant.impressions : 0,
      };
    });

    // Determine winner using configured strategy
    const config: WinnerSelectionConfig = {
      strategy: experiment.winnerStrategy,
      minimumSampleSize: experiment.minimumSampleSize,
      significanceLevel: experiment.significanceLevel,
    };

    const winnerCandidate = selectWinner(variants, config);

    // Check time constraints
    const timeCheck = experiment.startedAt
      ? checkTimeConstraints(
          experiment.startedAt,
          3, // minDurationDays
          30 // maxDurationDays
        )
      : { isReady: false, shouldForceSelection: false, reasoning: "Not started" };

    // Determine recommended action
    let recommendedAction: "continue" | "select_winner" | "stop" | "needs_more_data";
    let reasoning: string;

    if (!timeCheck.isReady) {
      recommendedAction = "needs_more_data";
      reasoning = timeCheck.reasoning;
    } else if (winnerCandidate?.meetsThreshold) {
      recommendedAction = "select_winner";
      reasoning = winnerCandidate.reasoning;
    } else if (timeCheck.shouldForceSelection) {
      recommendedAction = "select_winner";
      reasoning = "Maximum duration reached. Select best performing variant.";
    } else {
      recommendedAction = "continue";
      reasoning = "Continue collecting data for stronger signal.";
    }

    // Mark winner as significant if found
    if (winnerCandidate?.variantId) {
      const winnerResult = results.find((r) => r.variantId === winnerCandidate.variantId);
      if (winnerResult) {
        winnerResult.isSignificant = true;
      }
    }

    const winner = winnerCandidate?.variantId
      ? results.find((r) => r.variantId === winnerCandidate.variantId) ?? null
      : null;

    return {
      experimentId: experiment.id,
      status: experiment.status,
      variants: results,
      winner,
      recommendedAction,
      reasoning,
      calculatedAt: new Date(),
    };
  }

  async selectWinnerAndComplete(
    experimentId: string,
    variantId?: string,
    _reason?: string
  ): Promise<ExperimentWithRelations> {
    await this.verifyExperimentOwnership(experimentId);

    // If no variant specified, auto-select based on analysis
    let selectedVariantId = variantId;

    if (!selectedVariantId) {
      const analysis = await this.analyzeExperiment(experimentId);

      if (!analysis.winner) {
        throw new Error("No clear winner found. Please specify variant manually.");
      }

      selectedVariantId = analysis.winner.variantId;
    }

    // Complete experiment
    const experiment = await ExperimentManager.completeExperiment(
      experimentId,
      selectedVariantId
    );

    // Store final results
    await this.storeResults(experimentId);

    const completed = await this.getExperiment(experiment.id);
    if (!completed) throw new Error("Failed to retrieve completed experiment");
    return completed;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async verifyExperimentOwnership(experimentId: string): Promise<void> {
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
      select: { workspaceId: true },
    });

    if (!experiment) {
      throw new Error("Experiment not found");
    }

    if (experiment.workspaceId !== this.workspaceId) {
      throw new Error("Experiment not found in workspace");
    }
  }

  private async storeResults(experimentId: string): Promise<void> {
    const experiment = await this.getExperiment(experimentId);
    if (!experiment) return;

    const analysis = await this.analyzeExperiment(experimentId);

    // Store results for each variant
    for (const result of analysis.variants) {
      await prisma.experimentResult.create({
        data: {
          experimentId,
          variantId: result.variantId,
          conversionRate: result.conversionRate,
          confidenceLower: result.confidenceInterval.lower,
          confidenceUpper: result.confidenceInterval.upper,
          zScore: result.zScore,
          pValue: result.pValue,
          isSignificant: result.isSignificant,
        },
      });
    }
  }
}

/**
 * Create a Hypothesis Agent instance for a workspace.
 *
 * @param workspaceId - Workspace ID
 * @returns HypothesisAgent instance
 */
export function createHypothesisAgent(workspaceId: string): HypothesisAgent {
  return new HypothesisAgent(workspaceId);
}

// Export core modules for direct access if needed
export { ExperimentManager, VariantManager, EventTracker };
