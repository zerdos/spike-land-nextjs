import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Anthropic SDK
const { mockStream } = vi.hoisted(() => ({ mockStream: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => {
  function MockAnthropic() {
    // @ts-expect-error -- mock constructor
    this.messages = { stream: mockStream };
  }
  return { default: MockAnthropic };
});

// Mock Gemini client
const { mockGenerateAgentResponse } = vi.hoisted(() => ({ mockGenerateAgentResponse: vi.fn() }));

vi.mock("@/lib/ai/gemini-client", () => ({
  generateAgentResponse: mockGenerateAgentResponse,
}));

// Import after mocks
import { callClaude } from "./agent-client";
import { resetClaudeClient } from "@/lib/ai/claude-client";

describe("agent-client fallback", () => {
  beforeEach(() => {
    mockStream.mockReset();
    mockGenerateAgentResponse.mockReset();
    resetClaudeClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should NOT fallback if Opus succeeds", async () => {
    mockStream.mockReturnValue({
      finalMessage: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "success" }],
        usage: { input_tokens: 10, output_tokens: 20 },
      }),
    });

    const result = await callClaude({
      systemPrompt: "sys",
      userPrompt: "usr",
      model: "opus",
    });

    expect(result.text).toBe("success");
    expect(mockGenerateAgentResponse).not.toHaveBeenCalled();
  });

  it("should fallback to Gemini if Opus fails after retries", async () => {
    // Mock Anthropic to fail
    const error = new Error("Anthropic Error");
    mockStream.mockImplementation(() => {
      throw error;
    });

    // Mock Gemini to succeed
    mockGenerateAgentResponse.mockResolvedValue("gemini response");

    const result = await callClaude({
      systemPrompt: "sys",
      userPrompt: "usr",
      model: "opus",
    });

    // Should return Gemini response
    expect(result.text).toBe("gemini response");
    // Should have zero tokens
    expect(result.inputTokens).toBe(0);
    expect(result.outputTokens).toBe(0);

    // Verify Gemini was called with correct prompts
    expect(mockGenerateAgentResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: "sys",
        messages: [{ role: "user", content: "usr" }],
      })
    );
  });

  it("should construct Gemini system prompt correctly with stable prefix", async () => {
    mockStream.mockImplementation(() => {
      throw new Error("fail");
    });
    mockGenerateAgentResponse.mockResolvedValue("ok");

    await callClaude({
      systemPrompt: "main",
      stablePrefix: "prefix",
      dynamicSuffix: "suffix",
      userPrompt: "usr",
      model: "opus",
    });

    expect(mockGenerateAgentResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        // Should join with double newlines
        systemPrompt: "prefix\n\nmain\n\nsuffix",
      })
    );
  });

  it("should extract text from userPrompt blocks for Gemini", async () => {
    mockStream.mockImplementation(() => {
      throw new Error("fail");
    });
    mockGenerateAgentResponse.mockResolvedValue("ok");

    await callClaude({
      systemPrompt: "sys",
      userPrompt: [
        { type: "text", text: "block1" },
        { type: "text", text: "block2" },
      ],
      model: "opus",
    });

    expect(mockGenerateAgentResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user", content: "block1\nblock2" }],
      })
    );
  });

  it("should NOT fallback if model is NOT Opus", async () => {
    mockStream.mockImplementation(() => {
      throw new Error("fail");
    });

    await expect(
      callClaude({
        systemPrompt: "sys",
        userPrompt: "usr",
        model: "sonnet", // Not Opus
      })
    ).rejects.toThrow("fail");

    expect(mockGenerateAgentResponse).not.toHaveBeenCalled();
  });

  it("should throw original error if Gemini fallback also fails", async () => {
    const originalError = new Error("Auth Error");
    mockStream.mockImplementation(() => {
      throw originalError;
    });

    mockGenerateAgentResponse.mockRejectedValue(new Error("Gemini Error"));

    await expect(
      callClaude({
        systemPrompt: "sys",
        userPrompt: "usr",
        model: "opus",
      })
    ).rejects.toThrow(originalError); // Should be the Anthropic error
  });
});
