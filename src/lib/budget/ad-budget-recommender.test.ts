/**
 * Tests for Ad Budget Recommender
 * Issue: #567 (ORB-063)
 */

import { describe, it, expect } from 'vitest';
import { AdBudgetRecommender } from './ad-budget-recommender';

describe('AdBudgetRecommender', () => {
  const recommender = new AdBudgetRecommender();

  const mockTargeting = {
    platform: 'FACEBOOK' as const,
    options: [
      { type: 'demographic' as const, key: 'age', value: '25-34', confidenceScore: 0.8, source: 'ai' as const },
      { type: 'interest' as const, key: 'interest', value: 'technology', confidenceScore: 0.7, source: 'ai' as const },
    ],
    audienceSize: { min: 100000, max: 500000 },
    generatedAt: new Date(),
  };

  it('should generate budget recommendation', async () => {
    const result = await recommender.recommendBudget({
      reachGoal: 10000,
      campaignDuration: 7,
      targeting: mockTargeting,
      organicEngagementRate: 0.05,
    });

    expect(result.daily).toBeGreaterThan(0);
    expect(result.weekly).toBeGreaterThan(0);
    expect(result.monthly).toBeGreaterThan(0);
    expect(result.projectedReach.min).toBeGreaterThan(0);
    expect(result.projectedReach.max).toBeGreaterThan(result.projectedReach.min);
  });

  it('should calculate daily budget correctly', async () => {
    const result = await recommender.recommendBudget({
      reachGoal: 10000,
      campaignDuration: 10,
      targeting: mockTargeting,
      organicEngagementRate: 0.05,
    });

    // Weekly should be 7x daily
    expect(result.weekly).toBeCloseTo(result.daily * 7, 1);
  });

  it('should provide projected reach range', async () => {
    const reachGoal = 10000;
    
    const result = await recommender.recommendBudget({
      reachGoal,
      campaignDuration: 7,
      targeting: mockTargeting,
      organicEngagementRate: 0.05,
    });

    // Min should be ~80% of goal, max ~120%
    expect(result.projectedReach.min).toBeCloseTo(reachGoal * 0.8, -2);
    expect(result.projectedReach.max).toBeCloseTo(reachGoal * 1.2, -2);
  });

  it('should calculate confidence level based on targeting', async () => {
    const result = await recommender.recommendBudget({
      reachGoal: 10000,
      campaignDuration: 7,
      targeting: mockTargeting,
      organicEngagementRate: 0.05,
    });

    expect(result.confidenceLevel).toBeGreaterThan(0);
    expect(result.confidenceLevel).toBeLessThanOrEqual(1);
  });

  it('should generate rationale', async () => {
    const result = await recommender.recommendBudget({
      reachGoal: 10000,
      campaignDuration: 7,
      targeting: mockTargeting,
      organicEngagementRate: 0.05,
    });

    expect(result.rationale).toContain('10,000');
    expect(result.rationale).toContain('7 days');
  });

  it('should handle zero targeting options', async () => {
    const emptyTargeting = {
      ...mockTargeting,
      options: [],
    };

    const result = await recommender.recommendBudget({
      reachGoal: 10000,
      campaignDuration: 7,
      targeting: emptyTargeting,
      organicEngagementRate: 0.05,
    });

    expect(result.confidenceLevel).toBe(0.3);
  });
});
