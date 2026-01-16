/**
 * Unit tests for Database Backup Script
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BackupConfig } from "../backup";
import { filterValidBackups, getConfigFromEnv } from "../backup";

describe("getConfigFromEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns config when all required environment variables are set", () => {
    process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
    process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-key-id";
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.DATABASE_URL = "postgresql://test:5432/testdb";

    const config = getConfigFromEnv();

    expect(config).toEqual({
      bucketName: "test-bucket",
      endpoint: "https://test.r2.cloudflarestorage.com",
      accessKeyId: "test-key-id",
      secretAccessKey: "test-secret",
    });
  });

  it("throws error when CLOUDFLARE_R2_BUCKET_NAME is missing", () => {
    process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-key-id";
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.DATABASE_URL = "postgresql://test:5432/testdb";
    delete process.env.CLOUDFLARE_R2_BUCKET_NAME;

    expect(() => getConfigFromEnv()).toThrow("Missing required environment variables");
  });

  it("throws error when CLOUDFLARE_R2_ENDPOINT is missing", () => {
    process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-key-id";
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.DATABASE_URL = "postgresql://test:5432/testdb";
    delete process.env.CLOUDFLARE_R2_ENDPOINT;

    expect(() => getConfigFromEnv()).toThrow("Missing required environment variables");
  });

  it("throws error when CLOUDFLARE_R2_ACCESS_KEY_ID is missing", () => {
    process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
    process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.DATABASE_URL = "postgresql://test:5432/testdb";
    delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;

    expect(() => getConfigFromEnv()).toThrow("Missing required environment variables");
  });

  it("throws error when CLOUDFLARE_R2_SECRET_ACCESS_KEY is missing", () => {
    process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
    process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-key-id";
    process.env.DATABASE_URL = "postgresql://test:5432/testdb";
    delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    expect(() => getConfigFromEnv()).toThrow("Missing required environment variables");
  });

  it("throws error when DATABASE_URL is missing", () => {
    process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
    process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-key-id";
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
    delete process.env.DATABASE_URL;

    expect(() => getConfigFromEnv()).toThrow("Missing required environment variables");
  });

  it("throws error when all environment variables are missing", () => {
    delete process.env.CLOUDFLARE_R2_BUCKET_NAME;
    delete process.env.CLOUDFLARE_R2_ENDPOINT;
    delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    delete process.env.DATABASE_URL;

    expect(() => getConfigFromEnv()).toThrow("Missing required environment variables");
  });
});

describe("filterValidBackups", () => {
  it("returns empty array when contents is undefined", () => {
    const result = filterValidBackups(undefined);
    expect(result).toEqual([]);
  });

  it("returns empty array when contents is empty", () => {
    const result = filterValidBackups([]);
    expect(result).toEqual([]);
  });

  it("filters out objects without Key property", () => {
    const contents = [
      { LastModified: new Date("2024-01-01") },
      { Key: "backup-2024-01-02.sql.gz", LastModified: new Date("2024-01-02") },
    ];

    const result = filterValidBackups(contents);

    expect(result).toHaveLength(1);
    expect(result[0]!.Key).toBe("backup-2024-01-02.sql.gz");
  });

  it("filters out objects without LastModified property", () => {
    const contents = [
      { Key: "backup-2024-01-01.sql.gz" },
      { Key: "backup-2024-01-02.sql.gz", LastModified: new Date("2024-01-02") },
    ];

    const result = filterValidBackups(contents);

    expect(result).toHaveLength(1);
    expect(result[0]!.Key).toBe("backup-2024-01-02.sql.gz");
  });

  it("filters out non-backup files (wrong extension)", () => {
    const contents = [
      { Key: "backup-2024-01-01.sql.gz", LastModified: new Date("2024-01-01") },
      { Key: "backup-2024-01-02.sql", LastModified: new Date("2024-01-02") },
      { Key: "some-file.txt", LastModified: new Date("2024-01-03") },
      { Key: "backup-2024-01-04.tar.gz", LastModified: new Date("2024-01-04") },
    ];

    const result = filterValidBackups(contents);

    expect(result).toHaveLength(1);
    expect(result[0]!.Key).toBe("backup-2024-01-01.sql.gz");
  });

  it("includes all valid backup files", () => {
    const contents = [
      { Key: "backup-2024-01-01T00-00-00-000Z.sql.gz", LastModified: new Date("2024-01-01") },
      { Key: "backup-2024-01-02T00-00-00-000Z.sql.gz", LastModified: new Date("2024-01-02") },
      { Key: "backup-2024-01-03T00-00-00-000Z.sql.gz", LastModified: new Date("2024-01-03") },
    ];

    const result = filterValidBackups(contents);

    expect(result).toHaveLength(3);
    expect(result.map((b) => b.Key)).toEqual([
      "backup-2024-01-01T00-00-00-000Z.sql.gz",
      "backup-2024-01-02T00-00-00-000Z.sql.gz",
      "backup-2024-01-03T00-00-00-000Z.sql.gz",
    ]);
  });

  it("handles mixed valid and invalid objects", () => {
    const contents = [
      { Key: "backup-2024-01-01.sql.gz", LastModified: new Date("2024-01-01") },
      { Key: "readme.md", LastModified: new Date("2024-01-02") },
      { LastModified: new Date("2024-01-03") }, // Missing Key
      { Key: "backup-2024-01-04.sql.gz" }, // Missing LastModified
      { Key: "backup-2024-01-05.sql.gz", LastModified: new Date("2024-01-05") },
      { Key: undefined, LastModified: new Date("2024-01-06") },
    ];

    const result = filterValidBackups(contents);

    expect(result).toHaveLength(2);
    expect(result.map((b) => b.Key)).toEqual([
      "backup-2024-01-01.sql.gz",
      "backup-2024-01-05.sql.gz",
    ]);
  });
});

describe("BackupConfig interface", () => {
  it("accepts valid config object", () => {
    const config: BackupConfig = {
      bucketName: "test-bucket",
      endpoint: "https://test.r2.cloudflarestorage.com",
      accessKeyId: "test-key-id",
      secretAccessKey: "test-secret",
    };

    expect(config.bucketName).toBe("test-bucket");
    expect(config.endpoint).toBe("https://test.r2.cloudflarestorage.com");
    expect(config.accessKeyId).toBe("test-key-id");
    expect(config.secretAccessKey).toBe("test-secret");
  });
});
