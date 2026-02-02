
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YouTubeScheduler } from './scheduler';
import { YouTubeClient } from '../clients/youtube';

// Mock dependencies
vi.mock('../clients/youtube', () => ({
  YouTubeClient: vi.fn(),
}));

// Mock timezone handler
vi.mock('./timezone-handler', () => ({
  convertToYouTubePublishTime: vi.fn().mockReturnValue('2026-01-01T15:00:00.000Z'),
}));

describe('YouTubeScheduler', () => {
  let scheduler: YouTubeScheduler;
  let mockClient: any;

  beforeEach(() => {
    scheduler = new YouTubeScheduler();
    mockClient = {
      updateVideo: vi.fn(),
    };
  });

  describe('schedulePublish', () => {
    it('should call client.updateVideo with converted time and private status', async () => {
      const publishAt = new Date('2026-01-01T10:00:00'); // Local time context in test
      const timezone = 'America/New_York';
      const videoId = 'vid123';

      await scheduler.schedulePublish(mockClient, videoId, publishAt, timezone);

      expect(mockClient.updateVideo).toHaveBeenCalledWith(videoId, {
        publishAt: '2026-01-01T15:00:00.000Z',
        privacyStatus: 'private',
      });
    });
  });
});
