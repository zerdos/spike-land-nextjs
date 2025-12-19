/**
 * Audio R2 Client Tests
 * Resolves #332
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Set up environment variables before any imports
beforeEach(() => {
  vi.resetModules();
  process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
  process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-key";
  process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
  process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
  process.env.CLOUDFLARE_R2_AUDIO_BUCKET_NAME = "audio-mixer";
  process.env.CLOUDFLARE_R2_AUDIO_PUBLIC_URL = "https://audio.example.com";
});

describe("audio-r2-client", () => {
  describe("generateAudioKey", () => {
    it("generates correct key pattern", async () => {
      const { generateAudioKey } = await import("./audio-r2-client");

      const key = generateAudioKey(
        "user-123",
        "project-456",
        "track-789",
        "wav",
      );
      expect(key).toBe(
        "users/user-123/audio-projects/project-456/tracks/track-789.wav",
      );
    });

    it("handles different formats", async () => {
      const { generateAudioKey } = await import("./audio-r2-client");

      expect(generateAudioKey("u", "p", "t", "mp3")).toContain(".mp3");
      expect(generateAudioKey("u", "p", "t", "webm")).toContain(".webm");
      expect(generateAudioKey("u", "p", "t", "ogg")).toContain(".ogg");
    });
  });

  describe("generateProjectMetadataKey", () => {
    it("generates correct metadata key pattern", async () => {
      const { generateProjectMetadataKey } = await import("./audio-r2-client");

      const key = generateProjectMetadataKey("user-123", "project-456");
      expect(key).toBe(
        "users/user-123/audio-projects/project-456/metadata.json",
      );
    });
  });

  describe("validateAudioFile", () => {
    it("accepts valid audio files", async () => {
      const { validateAudioFile } = await import("./audio-r2-client");

      const buffer = Buffer.alloc(1024);
      const result = validateAudioFile(buffer, "audio/wav");
      expect(result.valid).toBe(true);
    });

    it("rejects files exceeding max size", async () => {
      const { validateAudioFile } = await import("./audio-r2-client");

      // Create buffer larger than 500MB
      const buffer = Buffer.alloc(501 * 1024 * 1024);
      const result = validateAudioFile(buffer, "audio/wav");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("exceeds maximum allowed size");
    });

    it("rejects invalid content types", async () => {
      const { validateAudioFile } = await import("./audio-r2-client");

      const buffer = Buffer.alloc(1024);
      const result = validateAudioFile(buffer, "video/mp4");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not allowed");
    });

    it("accepts various audio formats", async () => {
      const { validateAudioFile } = await import("./audio-r2-client");

      const buffer = Buffer.alloc(1024);
      const formats = [
        "audio/wav",
        "audio/wave",
        "audio/x-wav",
        "audio/mp3",
        "audio/mpeg",
        "audio/webm",
        "audio/ogg",
        "audio/flac",
        "audio/aac",
      ];

      for (const format of formats) {
        const result = validateAudioFile(buffer, format);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe("isAudioR2Configured", () => {
    it("returns true when all required env vars are set", async () => {
      const { isAudioR2Configured } = await import("./audio-r2-client");

      expect(isAudioR2Configured()).toBe(true);
    });

    it("returns false when required env vars are missing", async () => {
      delete process.env.CLOUDFLARE_ACCOUNT_ID;

      vi.resetModules();
      const { isAudioR2Configured } = await import("./audio-r2-client");

      expect(isAudioR2Configured()).toBe(false);
    });

    it("accepts regular R2 public URL as fallback", async () => {
      delete process.env.CLOUDFLARE_R2_AUDIO_PUBLIC_URL;
      process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://r2.example.com";

      vi.resetModules();
      const { isAudioR2Configured } = await import("./audio-r2-client");

      expect(isAudioR2Configured()).toBe(true);
    });
  });

  describe("getAudioPublicUrl", () => {
    it("returns correct public URL", async () => {
      const { getAudioPublicUrl } = await import("./audio-r2-client");

      const url = getAudioPublicUrl("test-key.wav");
      expect(url).toBe("https://audio.example.com/test-key.wav");
    });

    it("uses fallback public URL", async () => {
      delete process.env.CLOUDFLARE_R2_AUDIO_PUBLIC_URL;
      process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://r2.example.com";

      vi.resetModules();
      const { getAudioPublicUrl } = await import("./audio-r2-client");

      const url = getAudioPublicUrl("test-key.wav");
      expect(url).toBe("https://r2.example.com/test-key.wav");
    });

    it("throws error when no public URL configured", async () => {
      delete process.env.CLOUDFLARE_R2_AUDIO_PUBLIC_URL;
      delete process.env.CLOUDFLARE_R2_PUBLIC_URL;

      vi.resetModules();
      const { getAudioPublicUrl } = await import("./audio-r2-client");

      expect(() => getAudioPublicUrl("test-key.wav")).toThrow(
        "CLOUDFLARE_R2_AUDIO_PUBLIC_URL is not configured",
      );
    });
  });
});

// Test upload/download/delete with mocked AWS SDK
describe("audio-r2-client - R2 operations", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-key";
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
    process.env.CLOUDFLARE_R2_AUDIO_BUCKET_NAME = "audio-mixer";
    process.env.CLOUDFLARE_R2_AUDIO_PUBLIC_URL = "https://audio.example.com";
  });

  it("uploadAudioToR2 validates before upload", async () => {
    const { uploadAudioToR2 } = await import("./audio-r2-client");

    const result = await uploadAudioToR2({
      key: "test-key.mp4",
      buffer: Buffer.alloc(1024),
      contentType: "video/mp4",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not allowed");
  });

  it("uploadAudioToR2 rejects oversized files", async () => {
    const { uploadAudioToR2 } = await import("./audio-r2-client");

    const result = await uploadAudioToR2({
      key: "test-key.wav",
      buffer: Buffer.alloc(501 * 1024 * 1024),
      contentType: "audio/wav",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("exceeds maximum allowed size");
  });
});
