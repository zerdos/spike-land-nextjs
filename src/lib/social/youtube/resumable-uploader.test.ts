
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { YouTubeResumableUploader } from './resumable-uploader';

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('YouTubeResumableUploader', () => {
  let uploader: YouTubeResumableUploader;

  beforeEach(() => {
    uploader = new YouTubeResumableUploader();
    fetchMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initiate', () => {
    it('should initiate upload and return uploadUrl and sessionId', async () => {
      const mockUploadUrl = 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=test_session_id';

      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (key: string) => key === 'Location' ? mockUploadUrl : null,
        },
      });

      const result = await uploader.initiate('fake_token', {
        file: Buffer.from('test'),
        title: 'Test Video',
        privacyStatus: 'private',
      });

      expect(result).toEqual({
        uploadUrl: mockUploadUrl,
        sessionId: 'test_session_id',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('uploadType=resumable'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Upload-Content-Type': 'video/*',
          }),
        })
      );
    });

    it('should throw error if response is not ok', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ error: { message: 'Invalid metadata' } }),
      });

      await expect(uploader.initiate('fake_token', {
        file: Buffer.from('test'),
        title: 'Test Video',
        privacyStatus: 'private',
      })).rejects.toThrow('Failed to initiate upload: Invalid metadata');
    });
  });

  describe('uploadChunk', () => {
    it('should upload chunk and return status "uploading"', async () => {
      fetchMock.mockResolvedValueOnce({
        status: 308,
      });

      const result = await uploader.uploadChunk(
        'https://upload.url',
        Buffer.from('chunk'),
        0,
        100
      );

      expect(result).toEqual({
        status: 'uploading',
        bytesUploaded: 5, // 0 + 5 (length of 'chunk')
      });
    });

    it('should upload last chunk and return status "complete"', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'video_123' }),
      });

      const result = await uploader.uploadChunk(
        'https://upload.url',
        Buffer.from('last'),
        96,
        100
      );

      expect(result).toEqual({
        status: 'complete',
        videoId: 'video_123',
      });
    });
  });

  describe('resumeUpload', () => {
    it('should return uploaded bytes if status is 308', async () => {
      fetchMock.mockResolvedValueOnce({
        status: 308,
        headers: {
          get: (key: string) => key === 'Range' ? 'bytes=0-99' : null,
        },
      });

      const result = await uploader.resumeUpload('https://upload.url');

      expect(result).toEqual({
        uploadedBytes: 100,
      });
    });

    it('should return -1 if upload is already complete', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await uploader.resumeUpload('https://upload.url');

      expect(result).toEqual({
        uploadedBytes: -1,
      });
    });
  });
});
