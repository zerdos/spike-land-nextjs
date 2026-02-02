
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YouTubeResumableUploader } from "./resumable-uploader";

describe("YouTubeResumableUploader", () => {
  let uploader: YouTubeResumableUploader;

  beforeEach(() => {
    uploader = new YouTubeResumableUploader();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initiate", () => {
    it("should initiate upload session and return details", async () => {
      const mockUploadUrl = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=session123";

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (key: string) => key === "Location" ? mockUploadUrl : null,
        },
      });

      const result = await uploader.initiate("token123", {
        fileSize: 1000,
        title: "Test Video",
        privacyStatus: "private",
      });

      expect(result.uploadUrl).toBe(mockUploadUrl);
      expect(result.sessionId).toBe("session123");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("uploadType=resumable"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer token123",
            "X-Upload-Content-Length": "1000",
          }),
        })
      );
    });

    it("should throw error if API call fails", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
        text: async () => JSON.stringify({ error: { message: "Invalid metadata" } }),
      });

      await expect(uploader.initiate("token123", {
        fileSize: 1000,
        title: "Test Video",
        privacyStatus: "private",
      })).rejects.toThrow("Failed to initiate upload: Invalid metadata");
    });
  });

  describe("uploadChunk", () => {
    it("should return status 'uploading' on 308 response", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false, // 308 is technically not "ok" in fetch
        status: 308,
      });

      const chunk = Buffer.from("test chunk");
      const result = await uploader.uploadChunk("http://upload-url", chunk, 0, 100);

      expect(result.status).toBe("uploading");
      expect(global.fetch).toHaveBeenCalledWith(
        "http://upload-url",
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Length": chunk.length.toString(),
            "Content-Range": `bytes 0-${chunk.length - 1}/100`,
          }),
        })
      );
    });

    it("should return status 'complete' on 200 response", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "video123" }),
      });

      const chunk = Buffer.from("last chunk");
      const result = await uploader.uploadChunk("http://upload-url", chunk, 90, 100);

      expect(result.status).toBe("complete");
      expect(result.videoId).toBe("video123");
    });

    it("should throw error on upload failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Server Error",
      });

      const chunk = Buffer.from("chunk");
      await expect(uploader.uploadChunk("http://upload-url", chunk, 0, 100))
        .rejects.toThrow("Failed to upload chunk");
    });
  });

  describe("resumeUpload", () => {
    it("should return uploaded bytes from Range header", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 308,
        headers: {
          get: (key: string) => key === "Range" ? "bytes=0-999" : null,
        },
      });

      const result = await uploader.resumeUpload("http://upload-url");
      expect(result.uploadedBytes).toBe(1000);
    });

    it("should return 0 bytes if no Range header", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 308,
        headers: {
          get: () => null,
        },
      });

      const result = await uploader.resumeUpload("http://upload-url");
      expect(result.uploadedBytes).toBe(0);
    });

    it("should throw error if session expired (404)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 404,
      });

      await expect(uploader.resumeUpload("http://upload-url"))
        .rejects.toThrow("Upload session expired");
    });
  });
});
