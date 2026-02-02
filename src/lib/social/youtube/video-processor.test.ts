
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pollVideoProcessingStatus } from './video-processor';

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('video-processor', () => {
  beforeEach(() => {
    fetchMock.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should return processed status when processingStatus is succeeded', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          processingDetails: {
            processingStatus: 'succeeded',
          },
        }],
      }),
    });

    const promise = pollVideoProcessingStatus('token', 'vid1', { intervalMs: 100 });
    vi.advanceTimersByTime(100);
    const result = await promise;

    expect(result.status).toBe('processed');
  });

  it('should return failed status when processingStatus is failed', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          processingDetails: {
            processingStatus: 'failed',
            processingFailureReason: 'bad format',
          },
        }],
      }),
    });

    const promise = pollVideoProcessingStatus('token', 'vid1', { intervalMs: 100 });
    vi.advanceTimersByTime(100);
    const result = await promise;

    expect(result.status).toBe('failed');
  });

  it('should retry until processed', async () => {
    // First attempt: processing
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          processingDetails: {
            processingStatus: 'processing',
          },
        }],
      }),
    });

    // Second attempt: succeeded
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          processingDetails: {
            processingStatus: 'succeeded',
          },
        }],
      }),
    });

    const promise = pollVideoProcessingStatus('token', 'vid1', { intervalMs: 100 });

    // Advance time for first retry
    await vi.advanceTimersByTimeAsync(150);

    const result = await promise;
    expect(result.status).toBe('processed');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should timeout after max attempts or time', async () => {
     // Always processing
     fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{
          processingDetails: {
            processingStatus: 'processing',
          },
        }],
      }),
    });

    const promise = pollVideoProcessingStatus('token', 'vid1', {
      timeoutMs: 500,
      intervalMs: 100
    });

    await vi.advanceTimersByTimeAsync(600);
    const result = await promise;

    expect(result.status).toBe('timeout');
  });
});
