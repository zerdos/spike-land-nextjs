import { beforeEach, describe, expect, it, vi } from "vitest";
import { YouTubeResumableUploader } from "./resumable-uploader";

// Mock fetch global
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("YouTubeResumableUploader", () => {
  let uploader: YouTubeResumableUploader;
  const mockAccessToken = "mock-access-token";

  beforeEach(() => {
    uploader = new YouTubeResumableUploader();
    vi.clearAllMocks();
  });

  describe("initiate", () => {
    it("should initiate upload and return uploadUrl and sessionId", async () => {
      const mockUploadUrl =
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=session123";

      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (key: string) => key === "Location" ? mockUploadUrl : null,
        },
      });

      const metadata = {
        file: Buffer.from("test content"),
        title: "Test Video",
        description: "Test Description",
        privacyStatus: "private" as const,
      };

      const result = await uploader.initiate(mockAccessToken, metadata);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("uploadType=resumable"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
            "X-Upload-Content-Length": "12",
          }),
        }),
      );

      expect(result).toEqual({
        uploadUrl: mockUploadUrl,
        sessionId: "session123",
      });
    });

    it("should throw error if uploadUrl is missing", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => null,
        },
      });

      const metadata = {
        file: Buffer.from("test"),
        title: "Test",
        privacyStatus: "private" as const,
      };

      await expect(uploader.initiate(mockAccessToken, metadata)).rejects.toThrow(
        "YouTube API did not return an upload URL",
      );
    });
  });

  it("should throw error if upload_id is missing from URL", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (key: string) =>
          key === "Location"
            ? "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable"
            : null, // Missing upload_id
      },
    });

    const metadata = {
      file: Buffer.from("test"),
      title: "Test",
      privacyStatus: "private" as const,
    };

    await expect(uploader.initiate(mockAccessToken, metadata)).rejects.toThrow(
      "Could not extract session ID from upload URL",
    );
  });

  it("should validate content type", async () => {
    const metadata = {
      file: Buffer.from("test"),
      title: "Test",
      privacyStatus: "private" as const,
      contentType: "image/png", // Invalid
    };

    await expect(uploader.initiate(mockAccessToken, metadata)).rejects.toThrow(
      "Invalid content type. Must be video/*",
    );
  });

  describe("uploadChunk", () => {
    const uploadUrl = "https://mock-upload-url";
    const chunk = Buffer.from("chunk data");
    const total = 100;
    const start = 0;

    it("should handle 308 Resume Incomplete", async () => {
      fetchMock.mockResolvedValueOnce({
        status: 308,
        headers: {
          get: () => null,
        },
      });

      const result = await uploader.uploadChunk(uploadUrl, chunk, start, total);

      expect(result).toEqual({ status: "uploading", uploadedBytes: 10 });
      expect(fetchMock).toHaveBeenCalledWith(
        uploadUrl,
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Range": "bytes 0-9/100",
          }),
        }),
      );
    });

    it("should handle 200 OK (Complete)", async () => {
      fetchMock.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ id: "video123" }),
      });

      const result = await uploader.uploadChunk(uploadUrl, chunk, start, total);

      expect(result).toEqual({ status: "complete", videoId: "video123" });
    });

    it("should throw on 500 error", async () => {
      fetchMock.mockResolvedValueOnce({
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(uploader.uploadChunk(uploadUrl, chunk, start, total)).rejects.toThrow(
        "Upload failed with status 500",
      );
    });
  });

  describe("resumeUpload", () => {
    const uploadUrl = "https://mock-upload-url";
    const totalSize = 1000;

    it("should return uploaded bytes from Range header", async () => {
      fetchMock.mockResolvedValueOnce({
        status: 308,
        headers: {
          get: (key: string) => key === "Range" ? "bytes=0-499" : null,
        },
      });

      const result = await uploader.resumeUpload(uploadUrl, totalSize);

      expect(result).toEqual({ uploadedBytes: 500 });
      expect(fetchMock).toHaveBeenCalledWith(
        uploadUrl,
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Range": "bytes */1000" },
        }),
      );
    });

    it("should return 0 bytes if no Range header", async () => {
      fetchMock.mockResolvedValueOnce({
        status: 308,
        headers: {
          get: () => null,
        },
      });

      const result = await uploader.resumeUpload(uploadUrl, totalSize);

      expect(result).toEqual({ uploadedBytes: 0 });
    });

    it("should return total size if already complete (200)", async () => {
      fetchMock.mockResolvedValueOnce({
        status: 200,
      });

      const result = await uploader.resumeUpload(uploadUrl, totalSize);

      expect(result).toEqual({ uploadedBytes: totalSize });
    });

    it("should throw on 404 (Expired Session)", async () => {
      fetchMock.mockResolvedValueOnce({
        status: 404,
      });

      await expect(uploader.resumeUpload(uploadUrl, totalSize)).rejects.toThrow(
        "Upload session expired or invalid",
      );
    });
  });
});
