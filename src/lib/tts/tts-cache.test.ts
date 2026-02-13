import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage/audio-r2-client", () => ({
  getAudioMetadata: vi.fn(),
  getAudioPublicUrl: vi.fn(),
  uploadAudioToR2: vi.fn(),
}));

import {
  getAudioMetadata,
  getAudioPublicUrl,
  uploadAudioToR2,
} from "@/lib/storage/audio-r2-client";

import { cacheTTSAudio, generateTTSCacheKey, getCachedTTSUrl } from "./tts-cache";

describe("tts-cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateTTSCacheKey", () => {
    it("should return a key with tts prefix and .mp3 extension", () => {
      const key = generateTTSCacheKey("Hello world");
      expect(key).toMatch(/^tts\/[a-f0-9]{64}\.mp3$/);
    });

    it("should normalize text by trimming and lowercasing", () => {
      const key1 = generateTTSCacheKey("Hello World");
      const key2 = generateTTSCacheKey("  hello world  ");
      expect(key1).toBe(key2);
    });

    it("should produce different keys for different text", () => {
      const key1 = generateTTSCacheKey("Hello");
      const key2 = generateTTSCacheKey("Goodbye");
      expect(key1).not.toBe(key2);
    });

    it("should use SHA-256 hash of normalized text", () => {
      const text = "test input";
      const normalized = text.trim().toLowerCase();
      const expectedHash = crypto
        .createHash("sha256")
        .update(normalized)
        .digest("hex");

      const key = generateTTSCacheKey(text);
      expect(key).toBe(`tts/${expectedHash}.mp3`);
    });

    it("should produce consistent keys for the same input", () => {
      const key1 = generateTTSCacheKey("Same text");
      const key2 = generateTTSCacheKey("Same text");
      expect(key1).toBe(key2);
    });

    it("should produce different keys when voiceId is provided", () => {
      const keyWithout = generateTTSCacheKey("Hello");
      const keyWith = generateTTSCacheKey("Hello", "voice-1");
      expect(keyWithout).not.toBe(keyWith);
    });

    it("should produce different keys for different voiceIds", () => {
      const keyA = generateTTSCacheKey("Hello", "a");
      const keyB = generateTTSCacheKey("Hello", "b");
      expect(keyA).not.toBe(keyB);
    });

    it("should use text::voiceId format for hashing when voiceId provided", () => {
      const text = "test input";
      const voiceId = "my-voice";
      const normalized = text.trim().toLowerCase();
      const expectedHash = crypto
        .createHash("sha256")
        .update(`${normalized}::${voiceId}`)
        .digest("hex");

      const key = generateTTSCacheKey(text, voiceId);
      expect(key).toBe(`tts/${expectedHash}.mp3`);
    });
  });

  describe("getCachedTTSUrl", () => {
    it("should return public URL when cache hit (metadata exists)", async () => {
      vi.mocked(getAudioMetadata).mockResolvedValue({
        key: "tts/abc123.mp3",
        size: 1024,
      });
      vi.mocked(getAudioPublicUrl).mockReturnValue(
        "https://cdn.example.com/tts/abc123.mp3",
      );

      const result = await getCachedTTSUrl("Hello world");

      expect(result).toBe("https://cdn.example.com/tts/abc123.mp3");
      expect(getAudioMetadata).toHaveBeenCalledWith(
        generateTTSCacheKey("Hello world"),
      );
      expect(getAudioPublicUrl).toHaveBeenCalledWith(
        generateTTSCacheKey("Hello world"),
      );
    });

    it("should return null on cache miss (no metadata)", async () => {
      vi.mocked(getAudioMetadata).mockResolvedValue(null);

      const result = await getCachedTTSUrl("New text");

      expect(result).toBeNull();
      expect(getAudioPublicUrl).not.toHaveBeenCalled();
    });

    it("should return null when getAudioMetadata throws", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.mocked(getAudioMetadata).mockRejectedValue(
        new Error("R2 connection failed"),
      );

      const result = await getCachedTTSUrl("Hello");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[TTS_CACHE] Failed to check cache:",
        expect.any(Error),
      );
      expect(getAudioPublicUrl).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should propagate error when getAudioPublicUrl throws synchronously", async () => {
      vi.mocked(getAudioMetadata).mockResolvedValue({
        key: "tts/abc.mp3",
        size: 512,
      });
      // getAudioPublicUrl is called inside Promise.resolve(), so a synchronous throw
      // escapes tryCatch and propagates as a rejection from the async function.
      vi.mocked(getAudioPublicUrl).mockImplementation(() => {
        throw new Error("URL config missing");
      });

      await expect(getCachedTTSUrl("Hello")).rejects.toThrow(
        "URL config missing",
      );
    });

    it("should pass voiceId to generateTTSCacheKey", async () => {
      vi.mocked(getAudioMetadata).mockResolvedValue({
        key: "tts/voice-key.mp3",
        size: 512,
      });
      vi.mocked(getAudioPublicUrl).mockReturnValue(
        "https://cdn.example.com/tts/voice-key.mp3",
      );

      await getCachedTTSUrl("Hello", "custom-voice");

      const expectedKey = generateTTSCacheKey("Hello", "custom-voice");
      expect(getAudioMetadata).toHaveBeenCalledWith(expectedKey);
      expect(getAudioPublicUrl).toHaveBeenCalledWith(expectedKey);
    });

    it("should return null when getAudioPublicUrl returns a rejecting thenable", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.mocked(getAudioMetadata).mockResolvedValue({
        key: "tts/abc.mp3",
        size: 512,
      });
      // Return a thenable that rejects, which Promise.resolve() will unwrap,
      // allowing tryCatch to catch the error and hit the urlError path (lines 49-52).
      vi.mocked(getAudioPublicUrl).mockReturnValue(
        { then: (_: unknown, reject: (reason: Error) => void) => reject(new Error("Async URL failure")) } as unknown as string,
      );

      const result = await getCachedTTSUrl("Hello");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[TTS_CACHE] Failed to get public URL:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe("cacheTTSAudio", () => {
    it("should upload audio and return public URL on success", async () => {
      const buffer = Buffer.from("audio data");
      vi.mocked(uploadAudioToR2).mockResolvedValue({
        success: true,
        key: "tts/hash.mp3",
        url: "https://cdn.example.com/tts/hash.mp3",
        sizeBytes: buffer.length,
      });

      const result = await cacheTTSAudio("Hello world", buffer);

      expect(result).toBe("https://cdn.example.com/tts/hash.mp3");
      expect(uploadAudioToR2).toHaveBeenCalledWith({
        key: generateTTSCacheKey("Hello world"),
        buffer,
        contentType: "audio/mpeg",
        metadata: {
          source: "elevenlabs",
          textLength: String("Hello world".length),
          generatedAt: expect.any(String),
        },
      });
    });

    it("should return null when upload throws an error", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const buffer = Buffer.from("audio data");
      vi.mocked(uploadAudioToR2).mockRejectedValue(
        new Error("Upload failed"),
      );

      const result = await cacheTTSAudio("Hello", buffer);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[TTS_CACHE] Failed to cache audio:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it("should return null when upload returns success: false", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const buffer = Buffer.from("audio data");
      vi.mocked(uploadAudioToR2).mockResolvedValue({
        success: false,
        key: "tts/hash.mp3",
        url: "",
        sizeBytes: 0,
        error: "Bucket not found",
      });

      const result = await cacheTTSAudio("Hello", buffer);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[TTS_CACHE] Upload failed:",
        "Bucket not found",
      );
      consoleSpy.mockRestore();
    });

    it("should pass correct metadata including textLength and generatedAt", async () => {
      const buffer = Buffer.from("x");
      const text = "Test metadata";
      vi.mocked(uploadAudioToR2).mockResolvedValue({
        success: true,
        key: "tts/hash.mp3",
        url: "https://cdn.example.com/tts/hash.mp3",
        sizeBytes: 1,
      });

      await cacheTTSAudio(text, buffer);

      const call = vi.mocked(uploadAudioToR2).mock.calls[0]![0];
      expect(call.metadata!["source"]).toBe("elevenlabs");
      expect(call.metadata!["textLength"]).toBe(String(text.length));
      // generatedAt should be a valid ISO date string
      expect(new Date(call.metadata!["generatedAt"]!).toISOString()).toBe(
        call.metadata!["generatedAt"],
      );
    });

    it("should pass voiceId to generateTTSCacheKey", async () => {
      const buffer = Buffer.from("audio data");
      vi.mocked(uploadAudioToR2).mockResolvedValue({
        success: true,
        key: "tts/voice-hash.mp3",
        url: "https://cdn.example.com/tts/voice-hash.mp3",
        sizeBytes: buffer.length,
      });

      await cacheTTSAudio("Hello world", buffer, "custom-voice");

      const expectedKey = generateTTSCacheKey("Hello world", "custom-voice");
      expect(vi.mocked(uploadAudioToR2).mock.calls[0]![0].key).toBe(
        expectedKey,
      );
    });

    it("should use the correct cache key derived from text", async () => {
      const buffer = Buffer.from("audio");
      const text = "  Specific Text  ";
      vi.mocked(uploadAudioToR2).mockResolvedValue({
        success: true,
        key: "tts/hash.mp3",
        url: "https://cdn.example.com/tts/hash.mp3",
        sizeBytes: 5,
      });

      await cacheTTSAudio(text, buffer);

      const expectedKey = generateTTSCacheKey(text);
      expect(vi.mocked(uploadAudioToR2).mock.calls[0]![0].key).toBe(
        expectedKey,
      );
    });
  });
});
