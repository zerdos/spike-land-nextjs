/**
 * Ad Budget Recommender
 * Generates budget recommendations based on goals and historical performance
 * Issue: #567 (ORB-063)
 */

import type { BudgetRecommendation, TargetingSuggestion } from '@/lib/types/organic-to-ad';

export interface BudgetParams {
  reachGoal: number;
  campaignDuration: number; // days
  targeting: TargetingSuggestion;
  organicEngagementRate: number;
}

export class AdBudgetRecommender {
  /**
   * Generate budget recommendation based on reach goals and targeting
   */
  async recommendBudget(params: BudgetParams): Promise<BudgetRecommendation> {
    const estimatedCPM = this.estimateCPM(params.targeting);
    const estimatedCTR = this.estimateCTR(params.organicEngagementRate);
    
    // Calculate budget needed to reach goal
    const impressionsNeeded = params.reachGoal * 1.2; // 20% buffer for frequency
    const totalBudget = (impressionsNeeded / 1000) * estimatedCPM;
    const dailyBudget = totalBudget / params.campaignDuration;

    return {
      daily: Math.round(dailyBudget * 100) / 100,
      weekly: Math.round(dailyBudget * 7 * 100) / 100,
      monthly: Math.round(dailyBudget * 30 * 100) / 100,
      projectedReach: {
        min: Math.floor(params.reachGoal * 0.8),
        max: Math.floor(params.reachGoal * 1.2),
      },
      projectedEngagement: {
        min: Math.floor(params.reachGoal * estimatedCTR * 0.8),
        max: Math.floor(params.reachGoal * estimatedCTR * 1.2),
      },
      estimatedCostPerResult: estimatedCPM / (estimatedCTR * 1000),
      confidenceLevel: this.calculateConfidenceLevel(params.targeting),
      rationale: this.generateRationale(params, estimatedCPM, estimatedCTR),
    };
  }

  private estimateCPM(targeting: TargetingSuggestion): number {
    // Base CPM varies by platform and targeting specificity
    const baseCPM = 10; // $10 baseline
    const targetingComplexity = targeting.options.length * 0.5;
    
    return baseCPM + targetingComplexity;
  }

  private estimateCTR(organicEngagementRate: number): number {
    // Estimate ad CTR based on organic performance
    // Ads typically get lower engagement than organic
    return organicEngagementRate * 0.3; // 30% of organic rate
  }

  private calculateConfidenceLevel(targeting: TargetingSuggestion): number {
    if (targeting.options.length === 0) return 0.3;
    
    const avgConfidence = targeting.options.reduce(
      (sum, opt) => sum + opt.confidenceScore,
      0
    ) / targeting.options.length;

    return Math.min(0.95, avgConfidence);
  }

  private generateRationale(
    params: BudgetParams,
    cpm: number,
    ctr: number
  ): string {
    return `Budget calculated based on ${params.reachGoal.toLocaleString()} reach goal over ${params.campaignDuration} days. Estimated CPM: $${cpm.toFixed(2)}, estimated CTR: ${(ctr * 100).toFixed(2)}%. Targeting includes ${params.targeting.options.length} criteria for precision.`;
  }
}
