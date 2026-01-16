import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Create shared mock functions using vi.hoisted
const { mockSend, mockUploadDone, MockUpload, MockS3Client } = vi.hoisted(
  () => {
    const mockSend = vi.fn();
    const mockUploadDone = vi.fn();

    class MockUpload {
      static mock = { instances: [] as MockUpload[], params: [] as unknown[] };
      done = mockUploadDone;
      constructor(public config: unknown) {
        MockUpload.mock.instances.push(this);
        MockUpload.mock.params.push(config);
      }
    }

    class MockS3Client {
      static mock = { instances: [] as MockS3Client[] };
      send = mockSend;
      constructor() {
        MockS3Client.mock.instances.push(this);
      }
    }

    return { mockSend, mockUploadDone, MockUpload, MockS3Client };
  },
);

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: MockS3Client,
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
  Upload: MockUpload,
}));

// Dynamic imports to allow module reset
async function importModule() {
  return await import("./r2-client");
}

describe("r2-client", () => {
  const originalEnv = { ...process.env };

  const setValidEnvVars = () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "test-account-id";
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-access-key";
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
    process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
    process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://pub-test.r2.dev";
  };

  const clearEnvVars = () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    delete process.env.CLOUDFLARE_R2_BUCKET_NAME;
    delete process.env.CLOUDFLARE_R2_ENDPOINT;
    delete process.env.CLOUDFLARE_R2_PUBLIC_URL;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    MockUpload.mock.instances = [];
    MockUpload.mock.params = [];
    MockS3Client.mock.instances = [];
    clearEnvVars();
    // Reset global cache
    (global as Record<string, unknown>)["__r2Client"] = undefined;
    (global as Record<string, unknown>)["__r2BucketName"] = undefined;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    // Reset global cache
    (global as Record<string, unknown>)["__r2Client"] = undefined;
    (global as Record<string, unknown>)["__r2BucketName"] = undefined;
  });

  describe("isR2Configured", () => {
    it("should return true when all required env vars are set", async () => {
      setValidEnvVars();
      const { isR2Configured } = await importModule();
      expect(isR2Configured()).toBe(true);
    });

    it("should return false when CLOUDFLARE_ACCOUNT_ID is missing", async () => {
      setValidEnvVars();
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      const { isR2Configured } = await importModule();
      expect(isR2Configured()).toBe(false);
    });

    it("should return false when CLOUDFLARE_R2_ACCESS_KEY_ID is missing", async () => {
      setValidEnvVars();
      delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
      const { isR2Configured } = await importModule();
      expect(isR2Configured()).toBe(false);
    });

    it("should return false when CLOUDFLARE_R2_SECRET_ACCESS_KEY is missing", async () => {
      setValidEnvVars();
      delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
      const { isR2Configured } = await importModule();
      expect(isR2Configured()).toBe(false);
    });

    it("should return false when CLOUDFLARE_R2_BUCKET_NAME is missing", async () => {
      setValidEnvVars();
      delete process.env.CLOUDFLARE_R2_BUCKET_NAME;
      const { isR2Configured } = await importModule();
      expect(isR2Configured()).toBe(false);
    });

    it("should return false when CLOUDFLARE_R2_ENDPOINT is missing", async () => {
      setValidEnvVars();
      delete process.env.CLOUDFLARE_R2_ENDPOINT;
      const { isR2Configured } = await importModule();
      expect(isR2Configured()).toBe(false);
    });

    it("should return false when CLOUDFLARE_R2_PUBLIC_URL is missing", async () => {
      setValidEnvVars();
      delete process.env.CLOUDFLARE_R2_PUBLIC_URL;
      const { isR2Configured } = await importModule();
      expect(isR2Configured()).toBe(false);
    });

    it("should return false when no env vars are set", async () => {
      const { isR2Configured } = await importModule();
      expect(isR2Configured()).toBe(false);
    });
  });

  describe("uploadToR2", () => {
    beforeEach(() => {
      setValidEnvVars();
    });

    it("should successfully upload a file and return the public URL", async () => {
      mockUploadDone.mockResolvedValueOnce({});

      const { uploadToR2 } = await importModule();
      const result = await uploadToR2({
        key: "test/image.jpg",
        buffer: Buffer.from("test image data"),
        contentType: "image/jpeg",
      });

      expect(result.success).toBe(true);
      expect(result.key).toBe("test/image.jpg");
      expect(result.url).toBe("https://pub-test.r2.dev/test/image.jpg");
      expect(result.error).toBeUndefined();
    });

    it("should pass correct parameters to Upload", async () => {
      mockUploadDone.mockResolvedValueOnce({});

      const { uploadToR2 } = await importModule();
      await uploadToR2({
        key: "users/123/image.png",
        buffer: Buffer.from("test data"),
        contentType: "image/png",
        metadata: { userId: "123", originalFilename: "photo.png" },
      });

      expect(MockUpload.mock.params.length).toBe(1);
      const uploadConfig = MockUpload.mock.params[0] as {
        params: {
          Bucket: string;
          Key: string;
          ContentType: string;
          Metadata: Record<string, string>;
        };
      };
      expect(uploadConfig.params.Bucket).toBe("test-bucket");
      expect(uploadConfig.params.Key).toBe("users/123/image.png");
      expect(uploadConfig.params.ContentType).toBe("image/png");
      expect(uploadConfig.params.Metadata).toEqual({
        userId: "123",
        originalFilename: "photo.png",
      });
    });

    it("should return error result when upload fails", async () => {
      mockUploadDone.mockRejectedValueOnce(new Error("Upload failed"));

      const { uploadToR2 } = await importModule();
      const result = await uploadToR2({
        key: "test/image.jpg",
        buffer: Buffer.from("test data"),
        contentType: "image/jpeg",
      });

      expect(result.success).toBe(false);
      expect(result.key).toBe("test/image.jpg");
      expect(result.url).toBe("");
      expect(result.error).toBe("Upload failed");
    });

    it("should handle non-Error exceptions", async () => {
      mockUploadDone.mockRejectedValueOnce("String error");

      const { uploadToR2 } = await importModule();
      const result = await uploadToR2({
        key: "test/image.jpg",
        buffer: Buffer.from("test data"),
        contentType: "image/jpeg",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("should return error when CLOUDFLARE_R2_PUBLIC_URL is not configured", async () => {
      delete process.env.CLOUDFLARE_R2_PUBLIC_URL;
      mockUploadDone.mockResolvedValueOnce({});

      const { uploadToR2 } = await importModule();
      const result = await uploadToR2({
        key: "test/image.jpg",
        buffer: Buffer.from("test data"),
        contentType: "image/jpeg",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("CLOUDFLARE_R2_PUBLIC_URL is not configured");
    });

    it("should throw error when R2 credentials are not configured", async () => {
      clearEnvVars();

      const { uploadToR2 } = await importModule();
      const result = await uploadToR2({
        key: "test/image.jpg",
        buffer: Buffer.from("test data"),
        contentType: "image/jpeg",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cloudflare R2 credentials are not configured");
    });

    it("should handle upload without metadata", async () => {
      mockUploadDone.mockResolvedValueOnce({});

      const { uploadToR2 } = await importModule();
      const result = await uploadToR2({
        key: "test/image.jpg",
        buffer: Buffer.from("test data"),
        contentType: "image/jpeg",
      });

      expect(result.success).toBe(true);
      const uploadConfig = MockUpload.mock.params[0] as {
        params: { Metadata: unknown; };
      };
      expect(uploadConfig.params.Metadata).toBeUndefined();
    });
  });

  describe("downloadFromR2", () => {
    beforeEach(() => {
      setValidEnvVars();
    });

    it("should successfully download a file", async () => {
      const mockBody = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from("chunk1");
          yield Buffer.from("chunk2");
        },
      };
      mockSend.mockResolvedValueOnce({ Body: mockBody });

      const { downloadFromR2 } = await importModule();
      const result = await downloadFromR2("test/image.jpg");

      expect(result).not.toBeNull();
      expect(result?.toString()).toBe("chunk1chunk2");
    });

    it("should return empty buffer when Body is empty", async () => {
      mockSend.mockResolvedValueOnce({ Body: null });

      const { downloadFromR2 } = await importModule();
      const result = await downloadFromR2("test/image.jpg");

      expect(result).not.toBeNull();
      expect(result?.length).toBe(0);
    });

    it("should return null when download fails", async () => {
      mockSend.mockRejectedValueOnce(new Error("Download failed"));

      const { downloadFromR2 } = await importModule();
      const result = await downloadFromR2("test/image.jpg");

      expect(result).toBeNull();
    });

    it("should return null when R2 credentials are not configured", async () => {
      clearEnvVars();

      const { downloadFromR2 } = await importModule();
      const result = await downloadFromR2("test/image.jpg");

      expect(result).toBeNull();
    });

    it("should handle single chunk download", async () => {
      const mockBody = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from("single chunk");
        },
      };
      mockSend.mockResolvedValueOnce({ Body: mockBody });

      const { downloadFromR2 } = await importModule();
      const result = await downloadFromR2("test/image.jpg");

      expect(result?.toString()).toBe("single chunk");
    });
  });

  describe("deleteFromR2", () => {
    beforeEach(() => {
      setValidEnvVars();
    });

    it("should return success result when deletion succeeds", async () => {
      mockSend.mockResolvedValueOnce({});

      const { deleteFromR2 } = await importModule();
      const result = await deleteFromR2("test-key.jpg");

      expect(result.success).toBe(true);
      expect(result.key).toBe("test-key.jpg");
      expect(result.error).toBeUndefined();
    });

    it("should return error result when deletion fails", async () => {
      mockSend.mockRejectedValueOnce(new Error("Network error"));

      const { deleteFromR2 } = await importModule();
      const result = await deleteFromR2("test-key.jpg");

      expect(result.success).toBe(false);
      expect(result.key).toBe("test-key.jpg");
      expect(result.error).toBe("Network error");
    });

    it("should handle non-Error exceptions", async () => {
      mockSend.mockRejectedValueOnce("String error");

      const { deleteFromR2 } = await importModule();
      const result = await deleteFromR2("test-key.jpg");

      expect(result.success).toBe(false);
      expect(result.key).toBe("test-key.jpg");
      expect(result.error).toBe("Unknown error");
    });

    it("should return error when R2 credentials are not configured", async () => {
      clearEnvVars();

      const { deleteFromR2 } = await importModule();
      const result = await deleteFromR2("test-key.jpg");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cloudflare R2 credentials are not configured");
    });
  });

  describe("listR2StorageStats", () => {
    beforeEach(() => {
      setValidEnvVars();
    });

    it("should return storage stats for files in bucket", async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [
          { Key: "image1.jpg", Size: 1000 },
          { Key: "image2.png", Size: 2000 },
          { Key: "image3.jpg", Size: 1500 },
        ],
        IsTruncated: false,
      });

      const { listR2StorageStats } = await importModule();
      const result = await listR2StorageStats();

      expect(result.success).toBe(true);
      expect(result.stats).not.toBeNull();
      expect(result.stats?.totalFiles).toBe(3);
      expect(result.stats?.totalSizeBytes).toBe(4500);
      expect(result.stats?.averageSizeBytes).toBe(1500);
      expect(result.stats?.byFileType).toEqual({
        jpg: { count: 2, sizeBytes: 2500 },
        png: { count: 1, sizeBytes: 2000 },
      });
    });

    it("should handle pagination correctly", async () => {
      // First page
      mockSend.mockResolvedValueOnce({
        Contents: [
          { Key: "image1.jpg", Size: 1000 },
          { Key: "image2.jpg", Size: 1000 },
        ],
        IsTruncated: true,
        NextContinuationToken: "token123",
      });
      // Second page
      mockSend.mockResolvedValueOnce({
        Contents: [
          { Key: "image3.jpg", Size: 1000 },
        ],
        IsTruncated: false,
      });

      const { listR2StorageStats } = await importModule();
      const result = await listR2StorageStats();

      expect(result.success).toBe(true);
      expect(result.stats?.totalFiles).toBe(3);
      expect(result.stats?.totalSizeBytes).toBe(3000);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("should handle empty bucket", async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [],
        IsTruncated: false,
      });

      const { listR2StorageStats } = await importModule();
      const result = await listR2StorageStats();

      expect(result.success).toBe(true);
      expect(result.stats?.totalFiles).toBe(0);
      expect(result.stats?.totalSizeBytes).toBe(0);
      expect(result.stats?.averageSizeBytes).toBe(0);
      expect(result.stats?.byFileType).toEqual({});
    });

    it("should handle files without extension", async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [
          { Key: "noextension", Size: 500 },
          { Key: "file.txt", Size: 500 },
        ],
        IsTruncated: false,
      });

      const { listR2StorageStats } = await importModule();
      const result = await listR2StorageStats();

      expect(result.success).toBe(true);
      expect(result.stats?.byFileType["unknown"]).toEqual({
        count: 1,
        sizeBytes: 500,
      });
      expect(result.stats?.byFileType["txt"]).toEqual({
        count: 1,
        sizeBytes: 500,
      });
    });

    it("should handle files with empty key", async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [
          { Key: "", Size: 100 },
          { Key: "valid.jpg", Size: 200 },
        ],
        IsTruncated: false,
      });

      const { listR2StorageStats } = await importModule();
      const result = await listR2StorageStats();

      expect(result.success).toBe(true);
      expect(result.stats?.byFileType["unknown"]).toEqual({
        count: 1,
        sizeBytes: 100,
      });
    });

    it("should handle files with undefined size", async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [
          { Key: "image.jpg", Size: undefined },
          { Key: "image2.jpg", Size: 1000 },
        ],
        IsTruncated: false,
      });

      const { listR2StorageStats } = await importModule();
      const result = await listR2StorageStats();

      expect(result.success).toBe(true);
      expect(result.stats?.totalSizeBytes).toBe(1000);
      expect(result.stats?.byFileType["jpg"]?.sizeBytes).toBe(1000);
    });

    it("should handle uppercase extensions", async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [
          { Key: "image.JPG", Size: 1000 },
          { Key: "image2.PNG", Size: 2000 },
        ],
        IsTruncated: false,
      });

      const { listR2StorageStats } = await importModule();
      const result = await listR2StorageStats();

      expect(result.success).toBe(true);
      expect(result.stats?.byFileType["jpg"]).toEqual({
        count: 1,
        sizeBytes: 1000,
      });
      expect(result.stats?.byFileType["png"]).toEqual({
        count: 1,
        sizeBytes: 2000,
      });
    });

    it("should return error when listing fails", async () => {
      mockSend.mockRejectedValueOnce(new Error("Access denied"));

      const { listR2StorageStats } = await importModule();
      const result = await listR2StorageStats();

      expect(result.success).toBe(false);
      expect(result.stats).toBeNull();
      expect(result.error).toBe("Access denied");
    });

    it("should handle non-Error exceptions", async () => {
      mockSend.mockRejectedValueOnce("String error");

      const { listR2StorageStats } = await importModule();
      const result = await listR2StorageStats();

      expect(result.success).toBe(false);
      expect(result.stats).toBeNull();
      expect(result.error).toBe("Unknown error");
    });

    it("should return error when R2 credentials are not configured", async () => {
      clearEnvVars();

      const { listR2StorageStats } = await importModule();
      const result = await listR2StorageStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cloudflare R2 credentials are not configured");
    });

    it("should handle undefined Contents in response", async () => {
      mockSend.mockResolvedValueOnce({
        Contents: undefined,
        IsTruncated: false,
      });

      const { listR2StorageStats } = await importModule();
      const result = await listR2StorageStats();

      expect(result.success).toBe(true);
      expect(result.stats?.totalFiles).toBe(0);
    });
  });

  describe("getR2Client caching behavior", () => {
    beforeEach(() => {
      setValidEnvVars();
    });

    it("should create new client in development mode", async () => {
      (process.env as { NODE_ENV?: string; }).NODE_ENV = "development";
      mockSend.mockResolvedValue({});

      const { deleteFromR2 } = await importModule();

      await deleteFromR2("key1.jpg");
      await deleteFromR2("key2.jpg");

      // In development mode, new client is created each time
      expect(MockS3Client.mock.instances.length).toBeGreaterThanOrEqual(2);
    });

    it("should use cached client in production mode", async () => {
      (process.env as { NODE_ENV?: string; }).NODE_ENV = "production";
      mockSend.mockResolvedValue({});

      const { deleteFromR2 } = await importModule();

      await deleteFromR2("key1.jpg");
      await deleteFromR2("key2.jpg");

      // In production mode, client should be cached (only created once per test)
      // Note: Due to module caching, we check that global cache is used
      expect((global as Record<string, unknown>)["__r2Client"]).toBeDefined();
    });

    it("should cache bucket name in production mode", async () => {
      (process.env as { NODE_ENV?: string; }).NODE_ENV = "production";
      mockSend.mockResolvedValue({});

      const { deleteFromR2 } = await importModule();

      await deleteFromR2("key1.jpg");

      expect((global as Record<string, unknown>)["__r2BucketName"]).toBe(
        "test-bucket",
      );
    });

    it("should reuse cached bucket name in production mode on subsequent calls", async () => {
      (process.env as { NODE_ENV?: string; }).NODE_ENV = "production";
      mockSend.mockResolvedValue({});

      // Pre-set the global bucket name to simulate it was already cached
      (global as Record<string, unknown>)["__r2BucketName"] = "test-bucket";

      const { deleteFromR2 } = await importModule();

      await deleteFromR2("key1.jpg");
      await deleteFromR2("key2.jpg");

      // Bucket name should still be the cached value
      expect((global as Record<string, unknown>)["__r2BucketName"]).toBe(
        "test-bucket",
      );
    });

    it("should set bucket name when global cache is empty in production", async () => {
      (process.env as { NODE_ENV?: string; }).NODE_ENV = "production";
      mockSend.mockResolvedValue({});

      // Ensure global is undefined
      (global as Record<string, unknown>)["__r2BucketName"] = undefined;
      (global as Record<string, unknown>)["__r2Client"] = undefined;

      const { deleteFromR2 } = await importModule();

      // First call should trigger caching
      await deleteFromR2("key1.jpg");

      // Verify the bucket name was cached
      expect((global as Record<string, unknown>)["__r2BucketName"]).toBe(
        "test-bucket",
      );
    });

    it("should set bucket name from config when client exists but bucket name is not cached in production", async () => {
      (process.env as { NODE_ENV?: string; }).NODE_ENV = "production";
      mockSend.mockResolvedValue({});

      // Set up a scenario where client exists but bucket name is not cached
      // First, create a client by calling an R2 function
      const { deleteFromR2 } = await importModule();
      await deleteFromR2("key1.jpg");

      // Now simulate the scenario where client is cached but bucket name is cleared
      // This can happen in edge cases
      (global as Record<string, unknown>)["__r2BucketName"] = undefined;

      // Second call should re-cache the bucket name via getBucketName() line 68
      await deleteFromR2("key2.jpg");

      // Verify the bucket name was cached from config
      expect((global as Record<string, unknown>)["__r2BucketName"]).toBe(
        "test-bucket",
      );
    });
  });

  describe("environment variable trimming", () => {
    it("should trim whitespace from environment variables", async () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = "  test-account-id  ";
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "  test-access-key  ";
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "  test-secret  ";
      process.env.CLOUDFLARE_R2_BUCKET_NAME = "  test-bucket  ";
      process.env.CLOUDFLARE_R2_ENDPOINT = "  https://test.r2.cloudflarestorage.com  ";
      process.env.CLOUDFLARE_R2_PUBLIC_URL = "  https://pub-test.r2.dev  ";
      mockUploadDone.mockResolvedValueOnce({});

      const { uploadToR2 } = await importModule();
      const result = await uploadToR2({
        key: "test/image.jpg",
        buffer: Buffer.from("test data"),
        contentType: "image/jpeg",
      });

      expect(result.success).toBe(true);
      // URL should be trimmed
      expect(result.url).toBe("https://pub-test.r2.dev/test/image.jpg");
    });
  });
});
