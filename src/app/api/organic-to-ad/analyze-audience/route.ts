/**
 * API Route: Analyze Audience
 * Issue: #567 (ORB-063)
 */

import { NextResponse } from 'next/server';
import { AudienceAnalyzer } from '@/lib/ai/audience-analyzer';
import type { SocialPlatform } from '@/lib/types/organic-to-ad';

export async function POST(request: Request) {
  try {
    const { platform, engagementData } = await request.json();

    if (!platform || !engagementData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const analyzer = new AudienceAnalyzer();
    const targeting = await analyzer.analyzeAudience(
      platform as SocialPlatform,
      engagementData
    );

    return NextResponse.json({
      success: true,
      data: targeting,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to analyze audience', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
