/**
 * API Route: Recommend Budget
 * Issue: #567 (ORB-063)
 */

import { NextResponse } from 'next/server';
import { AdBudgetRecommender } from '@/lib/budget/ad-budget-recommender';

export async function POST(request: Request) {
  try {
    const { reachGoal, campaignDuration, targeting, organicEngagementRate } = await request.json();

    if (!reachGoal || !campaignDuration || !targeting || organicEngagementRate === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const recommender = new AdBudgetRecommender();
    const budget = await recommender.recommendBudget({
      reachGoal,
      campaignDuration,
      targeting,
      organicEngagementRate,
    });

    return NextResponse.json({
      success: true,
      data: budget,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to recommend budget', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
