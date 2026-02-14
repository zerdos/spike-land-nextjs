import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetCachedTTSUrl = vi.fn();
const mockCacheTTSAudio = vi.fn();
const mockSynthesizeSpeech = vi.fn();

vi.mock("@/lib/prisma", () => ({ default: {} }));

vi.mock("@/lib/tts/tts-cache", () => ({
  getCachedTTSUrl: mockGetCachedTTSUrl,
  cacheTTSAudio: mockCacheTTSAudio,
}));

vi.mock("@/lib/tts/elevenlabs-client", () => ({
  synthesizeSpeech: mockSynthesizeSpeech,
}));

import type { ToolRegistry } from "../tool-registry";
import { registerTtsTools } from "./tts";

function createMockRegistry(): ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> } {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const registry = {
    register: vi.fn((def: { name: string; handler: (...args: unknown[]) => unknown }) => { handlers.set(def.name, def.handler); }),
    handlers,
  };
  return registry as unknown as ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> };
}

function getText(result: unknown): string {
  return (result as { content: Array<{ text: string }> }).content[0]!.text;
}

describe("tts tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => { vi.clearAllMocks(); registry = createMockRegistry(); registerTtsTools(registry, userId); });

  it("should register 1 tts tool", () => {
    expect(registry.register).toHaveBeenCalledTimes(1);
  });

  describe("tts_synthesize", () => {
    it("should return cached result when available", async () => {
      mockGetCachedTTSUrl.mockResolvedValue("https://r2.spike.land/tts/cached-audio.mp3");
      const handler = registry.handlers.get("tts_synthesize")!;
      const result = await handler({ text: "Hello world" });
      expect(getText(result)).toContain("TTS Result (cached)");
      expect(getText(result)).toContain("https://r2.spike.land/tts/cached-audio.mp3");
      expect(getText(result)).toContain("11 characters");
      expect(getText(result)).toContain("cache");
      expect(mockSynthesizeSpeech).not.toHaveBeenCalled();
    });

    it("should synthesize and cache when not in cache", async () => {
      mockGetCachedTTSUrl.mockResolvedValue(null);
      const audioBuffer = Buffer.from("fake-audio-data");
      mockSynthesizeSpeech.mockResolvedValue(audioBuffer);
      mockCacheTTSAudio.mockResolvedValue("https://r2.spike.land/tts/new-audio.mp3");
      const handler = registry.handlers.get("tts_synthesize")!;
      const result = await handler({ text: "Hello world" });
      expect(getText(result)).toContain("TTS Result");
      expect(getText(result)).not.toContain("cached");
      expect(getText(result)).toContain("https://r2.spike.land/tts/new-audio.mp3");
      expect(getText(result)).toContain("11 characters");
      expect(getText(result)).toContain(`${audioBuffer.length} bytes`);
      expect(getText(result)).toContain("generated");
      expect(mockSynthesizeSpeech).toHaveBeenCalledWith("Hello world", {});
    });

    it("should pass voice_id option when provided", async () => {
      mockGetCachedTTSUrl.mockResolvedValue(null);
      mockSynthesizeSpeech.mockResolvedValue(Buffer.from("audio"));
      mockCacheTTSAudio.mockResolvedValue("https://r2.spike.land/tts/voice.mp3");
      const handler = registry.handlers.get("tts_synthesize")!;
      await handler({ text: "Custom voice", voice_id: "voice-abc-123" });
      expect(mockSynthesizeSpeech).toHaveBeenCalledWith("Custom voice", { voiceId: "voice-abc-123" });
    });

    it("should handle cache failure gracefully", async () => {
      mockGetCachedTTSUrl.mockResolvedValue(null);
      const audioBuffer = Buffer.from("audio-content-here");
      mockSynthesizeSpeech.mockResolvedValue(audioBuffer);
      mockCacheTTSAudio.mockResolvedValue(null);
      const handler = registry.handlers.get("tts_synthesize")!;
      const result = await handler({ text: "Test caching failure" });
      expect(getText(result)).toContain("TTS Result");
      expect(getText(result)).toContain("20 characters");
      expect(getText(result)).toContain(`${audioBuffer.length} bytes`);
      expect(getText(result)).toContain("generated");
      expect(getText(result)).toContain("R2 caching failed");
    });

    it("should handle synthesis API errors gracefully via safeToolCall", async () => {
      mockGetCachedTTSUrl.mockResolvedValue(null);
      mockSynthesizeSpeech.mockRejectedValue(new Error("ElevenLabs API error"));
      const handler = registry.handlers.get("tts_synthesize")!;
      const result = await handler({ text: "Fail" });
      expect(getText(result)).toContain("Error");
    });

    it("should not pass voiceId when voice_id is undefined", async () => {
      mockGetCachedTTSUrl.mockResolvedValue(null);
      mockSynthesizeSpeech.mockResolvedValue(Buffer.from("audio"));
      mockCacheTTSAudio.mockResolvedValue("https://r2.spike.land/tts/default.mp3");
      const handler = registry.handlers.get("tts_synthesize")!;
      await handler({ text: "No voice id" });
      expect(mockSynthesizeSpeech).toHaveBeenCalledWith("No voice id", {});
    });
  });
});
