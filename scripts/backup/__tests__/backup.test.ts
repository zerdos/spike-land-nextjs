/**
 * Unit tests for Database Backup Script
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BackupConfig } from "../backup";
import { filterValidBackups, getConfigFromEnv, parseArgs, sleep, withRetry } from "../backup";

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

    expect(() => getConfigFromEnv()).toThrow("Missing environment variables");
  });

  it("throws error when CLOUDFLARE_R2_ENDPOINT is missing", () => {
    process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-key-id";
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.DATABASE_URL = "postgresql://test:5432/testdb";
    delete process.env.CLOUDFLARE_R2_ENDPOINT;

    expect(() => getConfigFromEnv()).toThrow("Missing environment variables");
  });

  it("throws error when CLOUDFLARE_R2_ACCESS_KEY_ID is missing", () => {
    process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
    process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.DATABASE_URL = "postgresql://test:5432/testdb";
    delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;

    expect(() => getConfigFromEnv()).toThrow("Missing environment variables");
  });

  it("throws error when CLOUDFLARE_R2_SECRET_ACCESS_KEY is missing", () => {
    process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
    process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-key-id";
    process.env.DATABASE_URL = "postgresql://test:5432/testdb";
    delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    expect(() => getConfigFromEnv()).toThrow("Missing environment variables");
  });

  it("throws error when DATABASE_URL is missing", () => {
    process.env.CLOUDFLARE_R2_BUCKET_NAME = "test-bucket";
    process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-key-id";
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
    delete process.env.DATABASE_URL;

    expect(() => getConfigFromEnv()).toThrow("Missing environment variables");
  });

  it("throws error listing all missing variables", () => {
    delete process.env.CLOUDFLARE_R2_BUCKET_NAME;
    delete process.env.CLOUDFLARE_R2_ENDPOINT;
    delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    delete process.env.DATABASE_URL;

    expect(() => getConfigFromEnv()).toThrow(/CLOUDFLARE_R2_BUCKET_NAME/);
  });

  it("throws error when CLOUDFLARE_R2_BUCKET_NAME is empty string", () => {
    process.env.CLOUDFLARE_R2_BUCKET_NAME = "";
    process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-key-id";
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.DATABASE_URL = "postgresql://test:5432/testdb";

    expect(() => getConfigFromEnv()).toThrow(
      /Empty environment variables.*CLOUDFLARE_R2_BUCKET_NAME/,
    );
  });

  it("throws error when multiple environment variables are empty", () => {
    process.env.CLOUDFLARE_R2_BUCKET_NAME = "";
    process.env.CLOUDFLARE_R2_ENDPOINT = "   "; // whitespace only
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-key-id";
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.DATABASE_URL = "postgresql://test:5432/testdb";

    expect(() => getConfigFromEnv()).toThrow(
      /Empty environment variables.*check GitHub secrets configuration/,
    );
  });

  it("throws error with both missing and empty variables", () => {
    process.env.CLOUDFLARE_R2_BUCKET_NAME = "";
    process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-key-id";
    delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    process.env.DATABASE_URL = "postgresql://test:5432/testdb";

    const error = (() => {
      try {
        getConfigFromEnv();
        return null;
      } catch (e) {
        return e as Error;
      }
    })();

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(
      /Missing environment variables.*CLOUDFLARE_R2_SECRET_ACCESS_KEY/,
    );
    expect(error!.message).toMatch(/Empty environment variables.*CLOUDFLARE_R2_BUCKET_NAME/);
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

describe("sleep", () => {
  it("resolves after specified time", async () => {
    vi.useFakeTimers();
    const promise = sleep(1000);
    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns result on first successful attempt", async () => {
    const operation = vi.fn().mockResolvedValue("success");

    const resultPromise = withRetry(operation, {
      maxRetries: 3,
      initialDelayMs: 100,
      operationName: "Test",
    });

    const result = await resultPromise;
    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds eventually", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("First failure"))
      .mockRejectedValueOnce(new Error("Second failure"))
      .mockResolvedValue("success");

    const resultPromise = withRetry(operation, {
      maxRetries: 3,
      initialDelayMs: 100,
      operationName: "Test",
    });

    // First attempt fails, wait for retry delay
    await vi.advanceTimersByTimeAsync(100);
    // Second attempt fails, wait for retry delay (exponential: 200ms)
    await vi.advanceTimersByTimeAsync(200);

    const result = await resultPromise;
    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("throws after all retries exhausted", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("Always fails"));

    // Start the operation and immediately attach error handler to prevent unhandled rejection
    const resultPromise = withRetry(operation, {
      maxRetries: 3,
      initialDelayMs: 100,
      operationName: "Test Operation",
    });

    // Attach a catch handler immediately to prevent unhandled rejection warning
    let caughtError: Error | undefined;
    const handledPromise = resultPromise.catch((err: Error) => {
      caughtError = err;
    });

    // Advance through all retry delays
    await vi.advanceTimersByTimeAsync(100); // First retry delay
    await vi.advanceTimersByTimeAsync(200); // Second retry delay

    // Wait for the promise to complete
    await handledPromise;

    // Verify the error was thrown with correct message
    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError!.message).toBe("Test Operation failed after 3 attempts: Always fails");
    expect(operation).toHaveBeenCalledTimes(3);
  });
});

describe("parseArgs", () => {
  it("returns empty options for no arguments", () => {
    const result = parseArgs([]);
    expect(result).toEqual({});
  });

  it("parses --dry-run flag", () => {
    const result = parseArgs(["--dry-run"]);
    expect(result.dryRun).toBe(true);
  });

  it("parses --max-retries option", () => {
    const result = parseArgs(["--max-retries=5"]);
    expect(result.maxRetries).toBe(5);
  });

  it("parses --retry-delay option", () => {
    const result = parseArgs(["--retry-delay=2000"]);
    expect(result.initialRetryDelayMs).toBe(2000);
  });

  it("parses multiple options", () => {
    const result = parseArgs(["--dry-run", "--max-retries=5", "--retry-delay=2000"]);
    expect(result.dryRun).toBe(true);
    expect(result.maxRetries).toBe(5);
    expect(result.initialRetryDelayMs).toBe(2000);
  });

  it("ignores invalid --max-retries values", () => {
    const result = parseArgs(["--max-retries=invalid"]);
    expect(result.maxRetries).toBeUndefined();
  });

  it("ignores non-positive --max-retries values", () => {
    const result = parseArgs(["--max-retries=0"]);
    expect(result.maxRetries).toBeUndefined();
  });

  it("ignores invalid --retry-delay values", () => {
    const result = parseArgs(["--retry-delay=invalid"]);
    expect(result.initialRetryDelayMs).toBeUndefined();
  });

  it("ignores non-positive --retry-delay values", () => {
    const result = parseArgs(["--retry-delay=-100"]);
    expect(result.initialRetryDelayMs).toBeUndefined();
  });

  it("ignores unknown arguments", () => {
    const result = parseArgs(["--unknown", "value"]);
    expect(result).toEqual({});
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
