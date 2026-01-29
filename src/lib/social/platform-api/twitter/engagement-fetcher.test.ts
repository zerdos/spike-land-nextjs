/**
 * Tests for Twitter Engagement Fetcher
 * Issue: #567 (ORB-063)
 */

import { describe, it, expect } from 'vitest';
import { TwitterEngagementFetcher } from './engagement-fetcher';

describe('TwitterEngagementFetcher', () => {
  it('should have correct platform identifier', () => {
    const fetcher = new TwitterEngagementFetcher();
    expect(fetcher.platform).toBe('TWITTER');
  });

  it('should fetch engagement data', async () => {
    const fetcher = new TwitterEngagementFetcher();
    const data = await fetcher.fetchEngagement('test-post-id', 'test-token');
    
    expect(data).toHaveProperty('likes');
    expect(data).toHaveProperty('comments');
    expect(data).toHaveProperty('shares');
    expect(data).toHaveProperty('impressions');
    expect(data).toHaveProperty('reach');
    expect(data).toHaveProperty('engagementRate');
  });

  it('should fetch audience insights', async () => {
    const fetcher = new TwitterEngagementFetcher();
    const insights = await fetcher.fetchAudienceInsights('test-post-id', 'test-token');
    
    expect(insights).toHaveProperty('ageRanges');
    expect(insights).toHaveProperty('genders');
    expect(insights).toHaveProperty('locations');
    expect(insights).toHaveProperty('interests');
    expect(Array.isArray(insights.interests)).toBe(true);
  });
});
