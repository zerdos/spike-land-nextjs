import { getCompetitorSocialData } from './competitor-tracking';
import { describe, it, expect } from 'vitest';

describe('getCompetitorSocialData', () => {
  it('should return mock social media data for a given username', async () => {
    const username = 'testuser';
    const data = await getCompetitorSocialData(username);

    expect(data.username).toBe(username);
    expect(typeof data.posts).toBe('number');
    expect(typeof data.followers).toBe('number');
    expect(typeof data.engagementRate).toBe('string');
  });
});
