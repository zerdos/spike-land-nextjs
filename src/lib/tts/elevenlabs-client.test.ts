import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch globally before importing the module
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import at module scope - vi.mock calls are hoisted
import {
  MAX_TEXT_LENGTH,
  synthesizeSpeech,
  synthesizeSpeechWithTimestamps,
  characterTimestampsToWords,
} from "./elevenlabs-client";

describe("elevenlabs-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("ELEVENLABS_API_KEY", "test-api-key");
  });

  describe("synthesizeSpeech", () => {
    it("should throw when ELEVENLABS_API_KEY is not set", async () => {
      vi.stubEnv("ELEVENLABS_API_KEY", "");

      await expect(synthesizeSpeech("Hello")).rejects.toThrow(
        "ELEVENLABS_API_KEY is not configured",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should throw when ELEVENLABS_API_KEY is undefined", async () => {
      delete process.env.ELEVENLABS_API_KEY;

      await expect(synthesizeSpeech("Hello")).rejects.toThrow(
        "ELEVENLABS_API_KEY is not configured",
      );
    });

    it("should throw when ELEVENLABS_API_KEY is whitespace only", async () => {
      vi.stubEnv("ELEVENLABS_API_KEY", "   ");

      await expect(synthesizeSpeech("Hello")).rejects.toThrow(
        "ELEVENLABS_API_KEY is not configured",
      );
    });

    it("should throw when text is empty string", async () => {
      await expect(synthesizeSpeech("")).rejects.toThrow(
        "Text cannot be empty",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should throw when text is whitespace only", async () => {
      await expect(synthesizeSpeech("   ")).rejects.toThrow(
        "Text cannot be empty",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should throw when text exceeds MAX_TEXT_LENGTH", async () => {
      const longText = "a".repeat(MAX_TEXT_LENGTH + 1);

      await expect(synthesizeSpeech(longText)).rejects.toThrow(
        `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`,
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should accept text exactly at MAX_TEXT_LENGTH", async () => {
      const exactText = "a".repeat(MAX_TEXT_LENGTH);
      const audioData = new Uint8Array([1, 2, 3]);

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(audioData.buffer),
      });

      const result = await synthesizeSpeech(exactText);
      expect(result).toBeInstanceOf(Buffer);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should make request with default voice and model", async () => {
      const audioData = new Uint8Array([10, 20, 30]);

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(audioData.buffer),
      });

      const result = await synthesizeSpeech("Hello world");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.elevenlabs.io/v1/text-to-speech/jRAAK67SEFE9m7ci5DhD",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": "test-api-key",
          },
          body: JSON.stringify({
            text: "Hello world",
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        },
      );

      expect(result).toBeInstanceOf(Buffer);
      expect(Buffer.from(audioData)).toEqual(result);
    });

    it("should trim text before sending", async () => {
      const audioData = new Uint8Array([1]);

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(audioData.buffer),
      });

      await synthesizeSpeech("  Hello world  ");

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      const callBody = JSON.parse(callArgs[1].body as string);
      expect(callBody.text).toBe("Hello world");
    });

    it("should use custom voiceId from options", async () => {
      const audioData = new Uint8Array([1]);

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(audioData.buffer),
      });

      await synthesizeSpeech("Hello", { voiceId: "custom-voice-123" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.elevenlabs.io/v1/text-to-speech/custom-voice-123",
        expect.any(Object),
      );
    });

    it("should use ELEVENLABS_VOICE_ID env when no voiceId option", async () => {
      vi.stubEnv("ELEVENLABS_VOICE_ID", "env-voice-id");
      const audioData = new Uint8Array([1]);

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(audioData.buffer),
      });

      await synthesizeSpeech("Hello");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.elevenlabs.io/v1/text-to-speech/env-voice-id",
        expect.any(Object),
      );
    });

    it("should prefer options.voiceId over env ELEVENLABS_VOICE_ID", async () => {
      vi.stubEnv("ELEVENLABS_VOICE_ID", "env-voice-id");
      const audioData = new Uint8Array([1]);

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(audioData.buffer),
      });

      await synthesizeSpeech("Hello", { voiceId: "option-voice-id" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.elevenlabs.io/v1/text-to-speech/option-voice-id",
        expect.any(Object),
      );
    });

    it("should use custom modelId from options", async () => {
      const audioData = new Uint8Array([1]);

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(audioData.buffer),
      });

      await synthesizeSpeech("Hello", { modelId: "eleven_turbo_v2" });

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      const callBody = JSON.parse(callArgs[1].body as string);
      expect(callBody.model_id).toBe("eleven_turbo_v2");
    });

    it("should throw on network error (fetch rejects)", async () => {
      mockFetch.mockRejectedValue(new Error("Network timeout"));

      await expect(synthesizeSpeech("Hello")).rejects.toThrow(
        "ElevenLabs API request failed: Network timeout",
      );
    });

    it("should throw on non-ok response with error body", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue("Invalid API key"),
      });

      await expect(synthesizeSpeech("Hello")).rejects.toThrow(
        "ElevenLabs API returned 401: Invalid API key",
      );
    });

    it("should throw on non-ok response with 429 rate limit", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: vi.fn().mockResolvedValue("Rate limit exceeded"),
      });

      await expect(synthesizeSpeech("Hello")).rejects.toThrow(
        "ElevenLabs API returned 429: Rate limit exceeded",
      );
    });

    it("should throw with 'Unknown error' when error body read fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockRejectedValue(new Error("Body read failed")),
      });

      await expect(synthesizeSpeech("Hello")).rejects.toThrow(
        "ElevenLabs API returned 500: Unknown error",
      );
    });

    it("should return Buffer from successful response", async () => {
      const audioBytes = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(audioBytes.buffer),
      });

      const result = await synthesizeSpeech("Hello world");

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(4);
      expect(result[0]).toBe(0xff);
      expect(result[1]).toBe(0xfb);
    });

    it("should trim API key from env before use", async () => {
      vi.stubEnv("ELEVENLABS_API_KEY", "  trimmed-key  ");
      const audioData = new Uint8Array([1]);

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(audioData.buffer),
      });

      await synthesizeSpeech("Hello");

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = callArgs[1].headers as Record<string, string>;
      expect(headers["xi-api-key"]).toBe("trimmed-key");
    });
  });

  describe("characterTimestampsToWords", () => {
    it("should convert character-level timestamps to word-level", () => {
      const alignment = {
        characters: ["H", "i", " ", "y", "o"],
        character_start_times_seconds: [0.0, 0.1, 0.2, 0.3, 0.4],
        character_end_times_seconds: [0.1, 0.2, 0.3, 0.4, 0.5],
      };

      const words = characterTimestampsToWords(alignment);

      expect(words).toEqual([
        { word: "Hi", start: 0.0, end: 0.2 },
        { word: "yo", start: 0.3, end: 0.5 },
      ]);
    });

    it("should handle empty input", () => {
      const alignment = {
        characters: [],
        character_start_times_seconds: [],
        character_end_times_seconds: [],
      };

      expect(characterTimestampsToWords(alignment)).toEqual([]);
    });

    it("should handle single word without trailing space", () => {
      const alignment = {
        characters: ["H", "i"],
        character_start_times_seconds: [0.0, 0.1],
        character_end_times_seconds: [0.1, 0.2],
      };

      const words = characterTimestampsToWords(alignment);
      expect(words).toEqual([{ word: "Hi", start: 0.0, end: 0.2 }]);
    });

    it("should handle multiple consecutive spaces", () => {
      const alignment = {
        characters: ["a", " ", " ", "b"],
        character_start_times_seconds: [0.0, 0.1, 0.2, 0.3],
        character_end_times_seconds: [0.1, 0.2, 0.3, 0.4],
      };

      const words = characterTimestampsToWords(alignment);
      expect(words).toEqual([
        { word: "a", start: 0.0, end: 0.1 },
        { word: "b", start: 0.3, end: 0.4 },
      ]);
    });
  });

  describe("synthesizeSpeechWithTimestamps", () => {
    it("should throw when ELEVENLABS_API_KEY is not set", async () => {
      vi.stubEnv("ELEVENLABS_API_KEY", "");

      await expect(synthesizeSpeechWithTimestamps("Hello")).rejects.toThrow(
        "ELEVENLABS_API_KEY is not configured",
      );
    });

    it("should throw when text is empty", async () => {
      await expect(synthesizeSpeechWithTimestamps("")).rejects.toThrow(
        "Text cannot be empty",
      );
    });

    it("should call the with-timestamps endpoint", async () => {
      const base64Audio = Buffer.from([0xff, 0xfb]).toString("base64");

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          audio_base64: base64Audio,
          alignment: {
            characters: ["H", "i"],
            character_start_times_seconds: [0.0, 0.1],
            character_end_times_seconds: [0.1, 0.2],
          },
        }),
      });

      const result = await synthesizeSpeechWithTimestamps("Hi");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.elevenlabs.io/v1/text-to-speech/jRAAK67SEFE9m7ci5DhD/with-timestamps",
        expect.any(Object),
      );
      expect(result.audio).toBeInstanceOf(Buffer);
      expect(result.words).toEqual([{ word: "Hi", start: 0.0, end: 0.2 }]);
      expect(result.audioDurationSeconds).toBe(0.2);
    });

    it("should return 0 duration for empty alignment", async () => {
      const base64Audio = Buffer.from([0xff]).toString("base64");

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          audio_base64: base64Audio,
          alignment: {
            characters: [],
            character_start_times_seconds: [],
            character_end_times_seconds: [],
          },
        }),
      });

      const result = await synthesizeSpeechWithTimestamps("test");
      expect(result.audioDurationSeconds).toBe(0);
      expect(result.words).toEqual([]);
    });

    it("should throw on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue("Server error"),
      });

      await expect(synthesizeSpeechWithTimestamps("Hello")).rejects.toThrow(
        "ElevenLabs API returned 500: Server error",
      );
    });
  });

  describe("MAX_TEXT_LENGTH export", () => {
    it("should export MAX_TEXT_LENGTH as 5000", () => {
      expect(MAX_TEXT_LENGTH).toBe(5000);
    });
  });
});
