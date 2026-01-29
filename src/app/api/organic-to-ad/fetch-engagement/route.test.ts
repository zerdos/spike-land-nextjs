/**
 * Tests for Fetch Engagement API Route
 * Issue: #567 (ORB-063)
 */

import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';

// Mock the engagement fetcher factory
vi.mock('@/lib/social/platform-api/engagement-fetcher-factory', () => ({
  EngagementFetcherFactory: {
    getFetcher: vi.fn(() => ({
      fetchEngagement: vi.fn().mockResolvedValue({
        likes: 100,
        comments: 50,
        shares: 25,
        impressions: 1000,
        reach: 800,
        engagementRate: 0.15,
      }),
      fetchAudienceInsights: vi.fn().mockResolvedValue({
        ageRanges: { '18-24': 0.3, '25-34': 0.5 },
        genders: { 'male': 0.4, 'female': 0.6 },
        locations: { 'US': 0.7 },
        interests: ['technology'],
      }),
    })),
  },
}));

describe('POST /api/organic-to-ad/fetch-engagement', () => {
  it('should return engagement data for valid request', async () => {
    const request = new Request('http://localhost:3000/api/organic-to-ad/fetch-engagement', {
      method: 'POST',
      body: JSON.stringify({
        postId: 'test-post',
        platform: 'FACEBOOK',
        accessToken: 'test-token',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.engagement).toBeDefined();
    expect(data.data.insights).toBeDefined();
  });

  it('should return 400 for missing fields', async () => {
    const request = new Request('http://localhost:3000/api/organic-to-ad/fetch-engagement', {
      method: 'POST',
      body: JSON.stringify({ postId: 'test' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
