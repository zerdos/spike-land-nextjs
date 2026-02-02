
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { YouTubeAnalyticsClient } from './analytics-client';

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('YouTubeAnalyticsClient', () => {
  let client: YouTubeAnalyticsClient;

  beforeEach(() => {
    client = new YouTubeAnalyticsClient('token');
    fetchMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getWatchTime', () => {
    it('should return watch time metrics', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rows: [[100, 200, 2]],
        }),
      });

      const result = await client.getWatchTime('channel1', new Date('2024-01-01'), new Date('2024-01-31'));

      expect(result).toEqual({
        views: 100,
        totalWatchTimeMinutes: 200,
        averageViewDuration: 2,
      });
    });
  });

  describe('getTrafficSources', () => {
    it('should return traffic sources', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rows: [
            ['SEARCH', 60],
            ['EXTERNAL', 40],
          ],
        }),
      });

      const result = await client.getTrafficSources('channel1', new Date(), new Date());

      expect(result.sources).toEqual([
        { source: 'SEARCH', views: 60, percentage: 60 },
        { source: 'EXTERNAL', views: 40, percentage: 40 },
      ]);
    });
  });
});
