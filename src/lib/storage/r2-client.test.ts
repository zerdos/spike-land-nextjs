import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteFromR2, isR2Configured, listR2StorageStats } from "./r2-client";

// Create shared mock function
const mockSend = vi.fn();

// Mock AWS SDK - Vitest 4: Use class constructors for mock classes
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class MockS3Client {
    send = mockSend;
  },
  DeleteObjectCommand: class MockDeleteObjectCommand {
    constructor(public params: unknown) {}
  },
  GetObjectCommand: class MockGetObjectCommand {
    constructor(public params: unknown) {}
  },
  ListObjectsV2Command: class MockListObjectsV2Command {
    constructor(public params: unknown) {}
  },
}));

vi.mock("@aws-sdk/lib-storage", () => ({
  Upload: vi.fn(),
}));

describe("r2-client", () => {
  describe("isR2Configured", () => {
    beforeEach(() => {
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
      delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
      delete process.env.CLOUDFLARE_R2_BUCKET_NAME;
      delete process.env.CLOUDFLARE_R2_ENDPOINT;
      delete process.env.CLOUDFLARE_R2_PUBLIC_URL;
    });

    it("should return true when all required env vars are set", () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = "test-account-id";
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-access-key";
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
      process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
      process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
      process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://pub-test.r2.dev";

      expect(isR2Configured()).toBe(true);
    });

    it("should return false when CLOUDFLARE_ACCOUNT_ID is missing", () => {
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-access-key";
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
      process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
      process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";

      expect(isR2Configured()).toBe(false);
    });

    it("should return false when CLOUDFLARE_R2_ACCESS_KEY_ID is missing", () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = "test-account-id";
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
      process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
      process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";

      expect(isR2Configured()).toBe(false);
    });

    it("should return false when CLOUDFLARE_R2_SECRET_ACCESS_KEY is missing", () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = "test-account-id";
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-access-key";
      process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
      process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";

      expect(isR2Configured()).toBe(false);
    });

    it("should return false when CLOUDFLARE_R2_BUCKET_NAME is missing", () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = "test-account-id";
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-access-key";
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
      process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";

      expect(isR2Configured()).toBe(false);
    });

    it("should return false when CLOUDFLARE_R2_ENDPOINT is missing", () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = "test-account-id";
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-access-key";
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
      process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
      process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://pub-test.r2.dev";

      expect(isR2Configured()).toBe(false);
    });

    it("should return false when CLOUDFLARE_R2_PUBLIC_URL is missing", () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = "test-account-id";
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-access-key";
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
      process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
      process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";

      expect(isR2Configured()).toBe(false);
    });

    it("should return false when no env vars are set", () => {
      expect(isR2Configured()).toBe(false);
    });
  });

  describe("deleteFromR2", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Set up required env vars
      process.env.CLOUDFLARE_ACCOUNT_ID = "test-account-id";
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-access-key";
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
      process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
      process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
    });

    it("should return success result when deletion succeeds", async () => {
      mockSend.mockResolvedValue({});

      const result = await deleteFromR2("test-key.jpg");

      expect(result.success).toBe(true);
      expect(result.key).toBe("test-key.jpg");
      expect(result.error).toBeUndefined();
    });

    it("should return error result when deletion fails", async () => {
      mockSend.mockRejectedValue(new Error("Network error"));

      const result = await deleteFromR2("test-key.jpg");

      expect(result.success).toBe(false);
      expect(result.key).toBe("test-key.jpg");
      expect(result.error).toBe("Network error");
    });

    it("should handle non-Error exceptions", async () => {
      mockSend.mockRejectedValue("String error");

      const result = await deleteFromR2("test-key.jpg");

      expect(result.success).toBe(false);
      expect(result.key).toBe("test-key.jpg");
      expect(result.error).toBe("Unknown error");
    });
  });

  describe("listR2StorageStats", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.spyOn(console, "error").mockImplementation(() => {});
      // Set up required env vars
      process.env.CLOUDFLARE_ACCOUNT_ID = "test-account-id";
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-access-key";
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
      process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
      process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
    });

    it("should return storage stats for a single page of objects", async () => {
      mockSend.mockResolvedValue({
        Contents: [
          { Key: "images/photo1.jpg", Size: 1024 },
          { Key: "images/photo2.png", Size: 2048 },
          { Key: "documents/file.pdf", Size: 4096 },
        ],
        IsTruncated: false,
      });

      const result = await listR2StorageStats();

      expect(result.success).toBe(true);
      expect(result.stats).not.toBeNull();
      expect(result.stats!.totalFiles).toBe(3);
      expect(result.stats!.totalSizeBytes).toBe(7168);
      expect(result.stats!.averageSizeBytes).toBe(Math.round(7168 / 3));
      expect(result.stats!.byFileType.jpg).toEqual({ count: 1, sizeBytes: 1024 });
      expect(result.stats!.byFileType.png).toEqual({ count: 1, sizeBytes: 2048 });
      expect(result.stats!.byFileType.pdf).toEqual({ count: 1, sizeBytes: 4096 });
    });

    it("should handle pagination correctly", async () => {
      mockSend
        .mockResolvedValueOnce({
          Contents: [
            { Key: "photo1.jpg", Size: 1000 },
            { Key: "photo2.jpg", Size: 1000 },
          ],
          IsTruncated: true,
          NextContinuationToken: "token123",
        })
        .mockResolvedValueOnce({
          Contents: [{ Key: "photo3.jpg", Size: 1000 }],
          IsTruncated: false,
        });

      const result = await listR2StorageStats();

      expect(result.success).toBe(true);
      expect(result.stats!.totalFiles).toBe(3);
      expect(result.stats!.totalSizeBytes).toBe(3000);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("should handle empty bucket", async () => {
      mockSend.mockResolvedValue({
        Contents: [],
        IsTruncated: false,
      });

      const result = await listR2StorageStats();

      expect(result.success).toBe(true);
      expect(result.stats!.totalFiles).toBe(0);
      expect(result.stats!.totalSizeBytes).toBe(0);
      expect(result.stats!.averageSizeBytes).toBe(0);
      expect(result.stats!.byFileType).toEqual({});
    });

    it("should handle missing Contents in response", async () => {
      mockSend.mockResolvedValue({
        IsTruncated: false,
      });

      const result = await listR2StorageStats();

      expect(result.success).toBe(true);
      expect(result.stats!.totalFiles).toBe(0);
    });

    it("should handle missing Size in objects", async () => {
      mockSend.mockResolvedValue({
        Contents: [
          { Key: "photo.jpg" }, // Size is undefined
        ],
        IsTruncated: false,
      });

      const result = await listR2StorageStats();

      expect(result.success).toBe(true);
      expect(result.stats!.totalFiles).toBe(1);
      expect(result.stats!.totalSizeBytes).toBe(0);
    });

    it("should handle missing Key in objects", async () => {
      mockSend.mockResolvedValue({
        Contents: [
          { Size: 1000 }, // Key is undefined
        ],
        IsTruncated: false,
      });

      const result = await listR2StorageStats();

      expect(result.success).toBe(true);
      expect(result.stats!.totalFiles).toBe(1);
      expect(result.stats!.byFileType.unknown).toEqual({ count: 1, sizeBytes: 1000 });
    });

    it("should handle files without extensions", async () => {
      mockSend.mockResolvedValue({
        Contents: [
          { Key: "README", Size: 500 },
          { Key: "LICENSE", Size: 1000 },
        ],
        IsTruncated: false,
      });

      const result = await listR2StorageStats();

      expect(result.success).toBe(true);
      expect(result.stats!.byFileType.unknown).toEqual({ count: 2, sizeBytes: 1500 });
    });

    it("should handle error from S3 client", async () => {
      mockSend.mockRejectedValue(new Error("Network error"));

      const result = await listR2StorageStats();

      expect(result.success).toBe(false);
      expect(result.stats).toBeNull();
      expect(result.error).toBe("Network error");
      expect(console.error).toHaveBeenCalledWith(
        "Error listing R2 storage:",
        expect.any(Error),
      );
    });

    it("should handle non-Error exceptions", async () => {
      mockSend.mockRejectedValue("String error");

      const result = await listR2StorageStats();

      expect(result.success).toBe(false);
      expect(result.stats).toBeNull();
      expect(result.error).toBe("Unknown error");
    });

    it("should normalize file extensions to lowercase", async () => {
      mockSend.mockResolvedValue({
        Contents: [
          { Key: "PHOTO.JPG", Size: 1000 },
          { Key: "image.Png", Size: 2000 },
        ],
        IsTruncated: false,
      });

      const result = await listR2StorageStats();

      expect(result.success).toBe(true);
      expect(result.stats!.byFileType.jpg).toEqual({ count: 1, sizeBytes: 1000 });
      expect(result.stats!.byFileType.png).toEqual({ count: 1, sizeBytes: 2000 });
    });
  });
});
