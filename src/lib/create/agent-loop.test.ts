import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StreamEvent } from "./types";
import { agentGenerateApp } from "./agent-loop";

// ---- Mocks ----

vi.mock("@prisma/client", () => ({
  CreatedAppStatus: {
    PUBLISHED: "PUBLISHED",
    FAILED: "FAILED",
    GENERATING: "GENERATING",
  },
}));

vi.mock("./agent-client", () => ({
  callClaude: vi.fn(),
  extractCodeFromResponse: vi.fn(),
  parseGenerationResponse: vi.fn(),
}));

vi.mock("./agent-memory", () => ({
  extractAndSaveNote: vi.fn(),
  recordFailure: vi.fn(),
  recordGenerationAttempt: vi.fn(),
  recordSuccess: vi.fn(),
  retrieveRelevantNotes: vi.fn(),
}));

vi.mock("./agent-prompts", () => ({
  buildAgentSystemPrompt: vi.fn(),
  buildAgentUserPrompt: vi.fn(),
  buildFixSystemPrompt: vi.fn(),
  buildFixUserPrompt: vi.fn(),
}));

vi.mock("./codespace-service", () => ({
  generateCodespaceId: vi.fn(),
  updateCodespace: vi.fn(),
}));

vi.mock("./content-generator", () => ({
  cleanCode: vi.fn(),
}));

vi.mock("./content-service", () => ({
  markAsGenerating: vi.fn(),
  updateAppContent: vi.fn(),
  updateAppStatus: vi.fn(),
}));

vi.mock("./error-parser", () => ({
  parseTranspileError: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---- Imports for mocked modules ----

import {
  callClaude,
  extractCodeFromResponse,
  parseGenerationResponse,
} from "./agent-client";
import {
  extractAndSaveNote,
  recordFailure,
  recordGenerationAttempt,
  recordSuccess,
  retrieveRelevantNotes,
} from "./agent-memory";
import {
  buildAgentSystemPrompt,
  buildAgentUserPrompt,
  buildFixSystemPrompt,
  buildFixUserPrompt,
} from "./agent-prompts";
import { generateCodespaceId, updateCodespace } from "./codespace-service";
import { cleanCode } from "./content-generator";
import {
  markAsGenerating,
  updateAppContent,
  updateAppStatus,
} from "./content-service";
import { parseTranspileError } from "./error-parser";
import logger from "@/lib/logger";

// ---- Helpers ----

async function collectEvents(
  gen: AsyncGenerator<StreamEvent>,
): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

function eventTypes(events: StreamEvent[]): string[] {
  return events.map((e) => e.type);
}

function findEvent<T extends StreamEvent["type"]>(
  events: StreamEvent[],
  type: T,
): Extract<StreamEvent, { type: T }> | undefined {
  return events.find((e) => e.type === type) as
    | Extract<StreamEvent, { type: T }>
    | undefined;
}

function findEvents<T extends StreamEvent["type"]>(
  events: StreamEvent[],
  type: T,
): Array<Extract<StreamEvent, { type: T }>> {
  return events.filter((e) => e.type === type) as Array<
    Extract<StreamEvent, { type: T }>
  >;
}

// ---- Default mock setup ----

const DEFAULT_CODE =
  'export default function App() { return <div>Hello</div>; }';

function setupDefaultMocks() {
  vi.mocked(generateCodespaceId).mockReturnValue("test-codespace-123");
  vi.mocked(retrieveRelevantNotes).mockResolvedValue([]);
  vi.mocked(buildAgentSystemPrompt).mockReturnValue("system prompt");
  vi.mocked(buildAgentUserPrompt).mockReturnValue("user prompt");
  vi.mocked(callClaude).mockResolvedValue({
    text: "generated code",
    inputTokens: 100,
    outputTokens: 200,
    cacheReadTokens: 50,
    cacheCreationTokens: 10,
  } as never);
  vi.mocked(parseGenerationResponse).mockReturnValue({
    code: DEFAULT_CODE,
    title: "Test App",
    description: "A test app",
    relatedApps: ["related/one"],
  } as never);
  vi.mocked(cleanCode).mockImplementation((code) => code as string);
  vi.mocked(updateCodespace).mockResolvedValue({ success: true } as never);
  vi.mocked(markAsGenerating).mockResolvedValue(undefined as never);
  vi.mocked(updateAppContent).mockResolvedValue(undefined as never);
  vi.mocked(updateAppStatus).mockResolvedValue(undefined as never);
  vi.mocked(recordSuccess).mockResolvedValue();
  vi.mocked(recordFailure).mockResolvedValue();
  vi.mocked(recordGenerationAttempt).mockResolvedValue();
  vi.mocked(extractAndSaveNote).mockResolvedValue();
  vi.mocked(parseTranspileError).mockReturnValue({
    type: "transpile",
    message: "error",
  } as never);
  vi.mocked(buildFixSystemPrompt).mockReturnValue("fix system prompt");
  vi.mocked(buildFixUserPrompt).mockReturnValue("fix user prompt");
  vi.mocked(extractCodeFromResponse).mockReturnValue(null);
}

// ---- Tests ----

describe("agentGenerateApp", () => {
  const originalEnv = process.env["AGENT_MAX_ITERATIONS"];

  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
    delete process.env["AGENT_MAX_ITERATIONS"];
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env["AGENT_MAX_ITERATIONS"] = originalEnv;
    } else {
      delete process.env["AGENT_MAX_ITERATIONS"];
    }
  });

  // ----------------------------------------------------------------
  // 1. Happy path: generation succeeds on first transpile attempt
  // ----------------------------------------------------------------
  describe("happy path - first attempt success", () => {
    it("yields the correct sequence of events", async () => {
      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const types = eventTypes(events);
      expect(types).toEqual([
        "status",
        "phase", // PLANNING
        "phase", // GENERATING
        "code_generated",
        "phase", // TRANSPILING
        "phase", // PUBLISHED
        "complete",
      ]);
    });

    it("yields a status event with initialization message", async () => {
      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(events[0]).toEqual({
        type: "status",
        message: "Initializing app generation...",
      });
    });

    it("yields planning phase with correct message", async () => {
      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(events[1]).toEqual({
        type: "phase",
        phase: "PLANNING",
        message: "Assembling context and learning notes...",
      });
    });

    it("yields generating phase with correct message", async () => {
      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(events[2]).toEqual({
        type: "phase",
        phase: "GENERATING",
        message: "Generating application with Claude...",
      });
    });

    it("yields code_generated event with code preview", async () => {
      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const codeEvent = findEvent(events, "code_generated");
      expect(codeEvent).toBeDefined();
      expect(codeEvent!.codePreview).toBe(DEFAULT_CODE.slice(0, 200));
    });

    it("yields published phase and complete event with correct data", async () => {
      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(events[5]).toEqual({
        type: "phase",
        phase: "PUBLISHED",
        message: "App published successfully!",
      });

      expect(events[6]).toEqual({
        type: "complete",
        slug: "my-app",
        url: "https://testing.spike.land/live/test-codespace-123/",
        title: "Test App",
        description: "A test app",
        relatedApps: ["related/one"],
      });
    });

    it("calls markAsGenerating with correct arguments", async () => {
      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(markAsGenerating).toHaveBeenCalledWith(
        "my-app",
        ["category", "my-app"],
        "my app",
        "Generating app...",
        "test-codespace-123",
        "https://testing.spike.land/live/test-codespace-123/",
        "Agent loop: my-app",
        "user-1",
      );
    });

    it("calls callClaude with opus model for generation", async () => {
      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(callClaude).toHaveBeenCalledWith({
        systemPrompt: "system prompt",
        userPrompt: "user prompt",
        model: "opus",
        maxTokens: 32768,
        temperature: 0.5,
      });
    });

    it("calls recordSuccess with note IDs", async () => {
      vi.mocked(retrieveRelevantNotes).mockResolvedValue([
        { id: "note-1", trigger: "t", lesson: "l", confidenceScore: 0.9 },
        { id: "note-2", trigger: "t2", lesson: "l2", confidenceScore: 0.8 },
      ]);

      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(recordSuccess).toHaveBeenCalledWith(["note-1", "note-2"]);
    });

    it("calls updateAppContent and updateAppStatus on success", async () => {
      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(updateAppContent).toHaveBeenCalledWith(
        "my-app",
        "Test App",
        "A test app",
      );
      expect(updateAppStatus).toHaveBeenCalledWith(
        "my-app",
        "PUBLISHED",
        ["related/one"],
      );
    });

    it("calls recordGenerationAttempt with success=true", async () => {
      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(recordGenerationAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "my-app",
          success: true,
          iterations: 0,
          model: "opus",
          inputTokens: 100,
          outputTokens: 200,
          cachedTokens: 50,
          notesApplied: [],
          errors: [],
        }),
      );
    });

    it("uses cleanCode on the generated code", async () => {
      vi.mocked(cleanCode).mockReturnValue("cleaned-code");

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(cleanCode).toHaveBeenCalledWith(DEFAULT_CODE);
      const codeEvent = findEvent(events, "code_generated");
      expect(codeEvent!.codePreview).toBe("cleaned-code".slice(0, 200));
    });

    it("passes userId as undefined when not provided", async () => {
      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], undefined),
      );

      expect(markAsGenerating).toHaveBeenCalledWith(
        "my-app",
        ["category", "my-app"],
        expect.any(String),
        expect.any(String),
        "test-codespace-123",
        expect.any(String),
        expect.any(String),
        undefined,
      );
    });
  });

  // ----------------------------------------------------------------
  // 2. Fix loop: first transpile fails, second succeeds
  // ----------------------------------------------------------------
  describe("fix loop - transpile fails then succeeds", () => {
    beforeEach(() => {
      vi.mocked(updateCodespace)
        .mockResolvedValueOnce({
          success: false,
          error: "SyntaxError: unexpected token",
        } as never)
        .mockResolvedValueOnce({ success: true } as never);
      vi.mocked(extractCodeFromResponse).mockReturnValue(
        "fixed code here",
      );
    });

    it("yields error_detected, fixing, error_fixed, learning, then success", async () => {
      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const types = eventTypes(events);
      expect(types).toEqual([
        "status",
        "phase", // PLANNING
        "phase", // GENERATING
        "code_generated",
        "phase", // TRANSPILING (attempt 1 - fails)
        "error_detected",
        "phase", // FIXING
        "error_fixed",
        "phase", // LEARNING
        "learning",
        "phase", // TRANSPILING (attempt 2 - succeeds)
        "phase", // PUBLISHED
        "complete",
      ]);
    });

    it("yields error_detected with truncated error message", async () => {
      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const errorDetected = findEvent(events, "error_detected");
      expect(errorDetected).toEqual({
        type: "error_detected",
        error: "SyntaxError: unexpected token",
        iteration: 0,
      });
    });

    it("calls callClaude with sonnet model for fix", async () => {
      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(callClaude).toHaveBeenCalledTimes(2);
      expect(callClaude).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: "fix system prompt",
          userPrompt: "fix user prompt",
          model: "sonnet",
          maxTokens: 32768,
          temperature: 0.2,
        }),
      );
    });

    it("calls buildFixSystemPrompt and buildFixUserPrompt", async () => {
      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(buildFixSystemPrompt).toHaveBeenCalledWith(
        "category/my-app",
        [],
      );
      expect(buildFixUserPrompt).toHaveBeenCalledWith(
        DEFAULT_CODE,
        "SyntaxError: unexpected token",
        [{ error: "SyntaxError: unexpected token", iteration: 0 }],
      );
    });

    it("calls extractAndSaveNote with the correct arguments when fix succeeds", async () => {
      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(extractAndSaveNote).toHaveBeenCalledWith(
        "fixed code here",
        "SyntaxError: unexpected token",
        "fixed code here", // fixed=true, so fixedCode is currentCode
        ["category", "my-app"],
      );
    });

    it("yields learning event with note preview", async () => {
      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const learningEvent = findEvent(events, "learning");
      expect(learningEvent).toEqual({
        type: "learning",
        notePreview: "Learned from: transpile error",
      });
    });

    it("yields error_fixed event with correct iteration", async () => {
      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const fixedEvent = findEvent(events, "error_fixed");
      expect(fixedEvent).toEqual({
        type: "error_fixed",
        iteration: 0,
      });
    });

    it("records generation attempt with iteration=1 on success after fix", async () => {
      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(recordGenerationAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "my-app",
          success: true,
          iterations: 1,
          errors: [
            expect.objectContaining({
              error: "SyntaxError: unexpected token",
              iteration: 0,
              fixed: true,
            }),
          ],
        }),
      );
    });
  });

  // ----------------------------------------------------------------
  // 3. Max iterations exhausted
  // ----------------------------------------------------------------
  describe("max iterations exhausted", () => {
    beforeEach(() => {
      process.env["AGENT_MAX_ITERATIONS"] = "2";
      vi.mocked(updateCodespace).mockResolvedValue({
        success: false,
        error: "transpile error",
      } as never);
      vi.mocked(extractCodeFromResponse).mockReturnValue(null);
    });

    it("yields error event with correct message after exhausting iterations", async () => {
      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const errorEvent = findEvents(events, "error");
      expect(errorEvent).toHaveLength(1);
      expect(errorEvent[0]!.message).toBe("Failed after 2 fix attempts");
      expect(errorEvent[0]!.codespaceUrl).toBe(
        "https://testing.spike.land/live/test-codespace-123/",
      );
    });

    it("calls recordFailure with note IDs", async () => {
      vi.mocked(retrieveRelevantNotes).mockResolvedValue([
        { id: "n1", trigger: "", lesson: "", confidenceScore: 0.5 },
      ]);

      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(recordFailure).toHaveBeenCalledWith(["n1"]);
    });

    it("calls updateAppStatus with FAILED", async () => {
      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(updateAppStatus).toHaveBeenCalledWith("my-app", "FAILED");
    });

    it("calls recordGenerationAttempt with success=false", async () => {
      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(recordGenerationAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "my-app",
          success: false,
          iterations: 2,
          model: "opus",
        }),
      );
    });

    it("iterates the correct number of times", async () => {
      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const transpilePhases = findEvents(events, "phase").filter(
        (e) => e.phase === "TRANSPILING",
      );
      expect(transpilePhases).toHaveLength(2);
    });

    it("does not call recordSuccess when all iterations fail", async () => {
      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(recordSuccess).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // 4. Generation returns no code
  // ----------------------------------------------------------------
  describe("generation returns no code", () => {
    it("yields error event when parseGenerationResponse returns null", async () => {
      vi.mocked(parseGenerationResponse).mockReturnValue(null as never);

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const errorEvent = findEvent(events, "error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent!.message).toBe(
        "Failed to generate valid code from Claude",
      );
    });

    it("yields error event when parsed code is empty string", async () => {
      vi.mocked(parseGenerationResponse).mockReturnValue({
        code: "",
        title: "T",
        description: "D",
        relatedApps: [],
      } as never);

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const errorEvent = findEvent(events, "error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent!.message).toBe(
        "Failed to generate valid code from Claude",
      );
    });

    it("calls updateAppStatus with FAILED on generation failure", async () => {
      vi.mocked(parseGenerationResponse).mockReturnValue(null as never);

      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(updateAppStatus).toHaveBeenCalledWith("my-app", "FAILED");
    });

    it("calls recordGenerationAttempt with the error in the errors array", async () => {
      vi.mocked(parseGenerationResponse).mockReturnValue(null as never);

      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(recordGenerationAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors: expect.arrayContaining([
            expect.objectContaining({
              error: "Failed to generate valid code from Claude",
              fixed: false,
            }),
          ]),
        }),
      );
    });
  });

  // ----------------------------------------------------------------
  // 5. Fix call throws exception
  // ----------------------------------------------------------------
  describe("fix call throws exception", () => {
    beforeEach(() => {
      process.env["AGENT_MAX_ITERATIONS"] = "1";
      vi.mocked(updateCodespace).mockResolvedValue({
        success: false,
        error: "some error",
      } as never);
    });

    it("logs the error and continues iteration", async () => {
      vi.mocked(callClaude)
        .mockResolvedValueOnce({
          text: "generated",
          inputTokens: 100,
          outputTokens: 200,
          cacheReadTokens: 50,
          cacheCreationTokens: 10,
        } as never)
        .mockRejectedValueOnce(new Error("Claude API down"));

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(logger.error).toHaveBeenCalledWith("Fix attempt failed", {
        error: expect.any(Error),
        iteration: 0,
      });

      // Should still yield learning and then the final error
      const types = eventTypes(events);
      expect(types).toContain("learning");
      expect(types[types.length - 1]).toBe("error");
    });

    it("does not yield error_fixed when fix throws", async () => {
      vi.mocked(callClaude)
        .mockResolvedValueOnce({
          text: "generated",
          inputTokens: 100,
          outputTokens: 200,
          cacheReadTokens: 50,
          cacheCreationTokens: 10,
        } as never)
        .mockRejectedValueOnce(new Error("Claude API down"));

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(findEvent(events, "error_fixed")).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------
  // 6. Outer catch: callClaude for generation throws
  // ----------------------------------------------------------------
  describe("outer catch - generation callClaude throws", () => {
    it("yields error event with the thrown error message", async () => {
      vi.mocked(callClaude).mockRejectedValue(
        new Error("Network failure"),
      );

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const errorEvent = findEvent(events, "error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent!.message).toBe("Network failure");
      expect(errorEvent!.codespaceUrl).toBe(
        "https://testing.spike.land/live/test-codespace-123/",
      );
    });

    it("calls logger.error with the error", async () => {
      const error = new Error("Network failure");
      vi.mocked(callClaude).mockRejectedValue(error);

      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Agent loop failed for my-app:",
        { error },
      );
    });

    it("calls updateAppStatus with FAILED in catch block", async () => {
      vi.mocked(callClaude).mockRejectedValue(new Error("fail"));

      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(updateAppStatus).toHaveBeenCalledWith("my-app", "FAILED");
    });

    it("yields 'Generation failed' for non-Error throws", async () => {
      vi.mocked(callClaude).mockRejectedValue("string error");

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const errorEvent = findEvent(events, "error");
      expect(errorEvent!.message).toBe("Generation failed");
    });

    it("records 'Unknown' error for non-Error throws", async () => {
      vi.mocked(callClaude).mockRejectedValue("string error");

      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(recordGenerationAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ error: "Unknown" }),
          ]),
        }),
      );
    });

    it("still calls recordGenerationAttempt when updateAppStatus throws in catch", async () => {
      vi.mocked(callClaude).mockRejectedValue(new Error("fail"));
      vi.mocked(updateAppStatus).mockRejectedValue(
        new Error("DB down"),
      );

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(recordGenerationAttempt).toHaveBeenCalled();
      // Should still yield the error event
      const errorEvent = findEvent(events, "error");
      expect(errorEvent).toBeDefined();
    });
  });

  // ----------------------------------------------------------------
  // 7. Empty path handling
  // ----------------------------------------------------------------
  describe("empty path handling", () => {
    it("uses 'New App' as default title when path is empty", async () => {
      await collectEvents(
        agentGenerateApp("my-app", [], "user-1"),
      );

      expect(markAsGenerating).toHaveBeenCalledWith(
        "my-app",
        [],
        "New App",
        "Generating app...",
        expect.any(String),
        expect.any(String),
        expect.any(String),
        "user-1",
      );
    });

    it("joins empty path as empty topic string", async () => {
      await collectEvents(
        agentGenerateApp("my-app", [], "user-1"),
      );

      expect(buildAgentSystemPrompt).toHaveBeenCalledWith("", []);
      expect(buildAgentUserPrompt).toHaveBeenCalledWith([]);
    });

    it("uses last path segment with dashes replaced by spaces for title", async () => {
      await collectEvents(
        agentGenerateApp("slug", ["tools", "my-cool-app"], "user-1"),
      );

      expect(markAsGenerating).toHaveBeenCalledWith(
        "slug",
        ["tools", "my-cool-app"],
        "my cool app",
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        "user-1",
      );
    });
  });

  // ----------------------------------------------------------------
  // 8. Token accumulation
  // ----------------------------------------------------------------
  describe("token accumulation", () => {
    it("accumulates tokens across generation and fix calls", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "2";
      vi.mocked(updateCodespace)
        .mockResolvedValueOnce({
          success: false,
          error: "err1",
        } as never)
        .mockResolvedValueOnce({ success: true } as never);
      vi.mocked(extractCodeFromResponse).mockReturnValue("fixed");

      // Generation call returns 100/200/50
      // Fix call returns 300/400/150
      vi.mocked(callClaude)
        .mockResolvedValueOnce({
          text: "gen",
          inputTokens: 100,
          outputTokens: 200,
          cacheReadTokens: 50,
          cacheCreationTokens: 10,
        } as never)
        .mockResolvedValueOnce({
          text: "fix",
          inputTokens: 300,
          outputTokens: 400,
          cacheReadTokens: 150,
          cacheCreationTokens: 20,
        } as never);

      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(recordGenerationAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          inputTokens: 400, // 100 + 300
          outputTokens: 600, // 200 + 400
          cachedTokens: 200, // 50 + 150
        }),
      );
    });

    it("accumulates tokens across multiple fix iterations", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "3";
      vi.mocked(updateCodespace)
        .mockResolvedValueOnce({ success: false, error: "e1" } as never)
        .mockResolvedValueOnce({ success: false, error: "e2" } as never)
        .mockResolvedValueOnce({ success: true } as never);
      vi.mocked(extractCodeFromResponse).mockReturnValue("fixed");

      vi.mocked(callClaude)
        .mockResolvedValueOnce({
          text: "gen",
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
        } as never)
        .mockResolvedValueOnce({
          text: "fix1",
          inputTokens: 30,
          outputTokens: 40,
          cacheReadTokens: 15,
          cacheCreationTokens: 0,
        } as never)
        .mockResolvedValueOnce({
          text: "fix2",
          inputTokens: 50,
          outputTokens: 60,
          cacheReadTokens: 25,
          cacheCreationTokens: 0,
        } as never);

      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(recordGenerationAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          inputTokens: 90, // 10 + 30 + 50
          outputTokens: 120, // 20 + 40 + 60
          cachedTokens: 45, // 5 + 15 + 25
        }),
      );
    });
  });

  // ----------------------------------------------------------------
  // 9. recordGenerationAttempt on success
  // ----------------------------------------------------------------
  describe("recordGenerationAttempt on success", () => {
    it("includes all required fields", async () => {
      vi.mocked(retrieveRelevantNotes).mockResolvedValue([
        { id: "note-x", trigger: "t", lesson: "l", confidenceScore: 0.9 },
      ]);

      await collectEvents(
        agentGenerateApp("test-slug", ["path", "here"], "user-1"),
      );

      expect(recordGenerationAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "test-slug",
          success: true,
          iterations: 0,
          notesApplied: ["note-x"],
          errors: [],
          model: "opus",
          inputTokens: 100,
          outputTokens: 200,
          cachedTokens: 50,
          totalDurationMs: expect.any(Number),
        }),
      );
    });

    it("does not throw if recordGenerationAttempt rejects (fire-and-forget)", async () => {
      vi.mocked(recordGenerationAttempt).mockRejectedValue(
        new Error("DB error"),
      );

      // Should not throw
      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const completeEvent = findEvent(events, "complete");
      expect(completeEvent).toBeDefined();
    });
  });

  // ----------------------------------------------------------------
  // 10. recordGenerationAttempt on failure
  // ----------------------------------------------------------------
  describe("recordGenerationAttempt on failure", () => {
    it("includes errors array with all encountered errors", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "2";
      vi.mocked(updateCodespace).mockResolvedValue({
        success: false,
        error: "err",
      } as never);
      vi.mocked(extractCodeFromResponse).mockReturnValue(null);

      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(recordGenerationAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors: [
            { error: "err", iteration: 0, fixed: false },
            { error: "err", iteration: 1, fixed: false },
          ],
        }),
      );
    });

    it("does not throw if recordGenerationAttempt rejects on failure path", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "1";
      vi.mocked(updateCodespace).mockResolvedValue({
        success: false,
        error: "err",
      } as never);
      vi.mocked(recordGenerationAttempt).mockRejectedValue(
        new Error("DB error"),
      );

      // Should not throw
      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const errorEvent = findEvent(events, "error");
      expect(errorEvent).toBeDefined();
    });
  });

  // ----------------------------------------------------------------
  // 11. updateAppStatus called with FAILED
  // ----------------------------------------------------------------
  describe("updateAppStatus called with FAILED", () => {
    it("is called on exhausted iterations", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "1";
      vi.mocked(updateCodespace).mockResolvedValue({
        success: false,
        error: "err",
      } as never);

      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(updateAppStatus).toHaveBeenCalledWith("my-app", "FAILED");
    });

    it("is called on outer catch error", async () => {
      vi.mocked(markAsGenerating).mockRejectedValue(
        new Error("DB error"),
      );

      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(updateAppStatus).toHaveBeenCalledWith("my-app", "FAILED");
    });

    it("swallows error if updateAppStatus throws on exhausted iterations", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "1";
      vi.mocked(updateCodespace).mockResolvedValue({
        success: false,
        error: "err",
      } as never);
      vi.mocked(updateAppStatus).mockRejectedValue(
        new Error("DB down"),
      );

      // Should not throw
      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const errorEvent = findEvent(events, "error");
      expect(errorEvent!.message).toBe("Failed after 1 fix attempts");
    });
  });

  // ----------------------------------------------------------------
  // Additional edge cases
  // ----------------------------------------------------------------
  describe("AGENT_MAX_ITERATIONS environment variable", () => {
    it("defaults to 3 when not set", async () => {
      vi.mocked(updateCodespace).mockResolvedValue({
        success: false,
        error: "err",
      } as never);

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const transpilePhases = findEvents(events, "phase").filter(
        (e) => e.phase === "TRANSPILING",
      );
      expect(transpilePhases).toHaveLength(3);

      const errorEvent = findEvent(events, "error");
      expect(errorEvent!.message).toBe("Failed after 3 fix attempts");
    });

    it("respects custom AGENT_MAX_ITERATIONS value", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "5";
      vi.mocked(updateCodespace).mockResolvedValue({
        success: false,
        error: "err",
      } as never);

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const transpilePhases = findEvents(events, "phase").filter(
        (e) => e.phase === "TRANSPILING",
      );
      expect(transpilePhases).toHaveLength(5);
    });
  });

  describe("extractCodeFromResponse returns null during fix", () => {
    it("does not update currentCode and does not yield error_fixed", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "1";
      vi.mocked(updateCodespace).mockResolvedValue({
        success: false,
        error: "err",
      } as never);
      vi.mocked(extractCodeFromResponse).mockReturnValue(null);

      vi.mocked(callClaude)
        .mockResolvedValueOnce({
          text: "gen",
          inputTokens: 100,
          outputTokens: 200,
          cacheReadTokens: 50,
          cacheCreationTokens: 10,
        } as never)
        .mockResolvedValueOnce({
          text: "fix attempt",
          inputTokens: 50,
          outputTokens: 100,
          cacheReadTokens: 25,
          cacheCreationTokens: 5,
        } as never);

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(findEvent(events, "error_fixed")).toBeUndefined();
    });

    it("calls extractAndSaveNote with null fixedCode when fix not applied", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "1";
      vi.mocked(updateCodespace).mockResolvedValue({
        success: false,
        error: "err",
      } as never);
      vi.mocked(extractCodeFromResponse).mockReturnValue(null);

      vi.mocked(callClaude)
        .mockResolvedValueOnce({
          text: "gen",
          inputTokens: 100,
          outputTokens: 200,
          cacheReadTokens: 50,
          cacheCreationTokens: 10,
        } as never)
        .mockResolvedValueOnce({
          text: "fix attempt",
          inputTokens: 50,
          outputTokens: 100,
          cacheReadTokens: 25,
          cacheCreationTokens: 5,
        } as never);

      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(extractAndSaveNote).toHaveBeenCalledWith(
        DEFAULT_CODE, // currentCode unchanged
        "err",
        null, // fixed=false, so fixedCode is null
        ["category", "my-app"],
      );
    });
  });

  describe("extractAndSaveNote failure", () => {
    it("logs a warning when extractAndSaveNote rejects", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "1";
      vi.mocked(updateCodespace).mockResolvedValue({
        success: false,
        error: "err",
      } as never);

      const noteError = new Error("Note save failed");
      vi.mocked(extractAndSaveNote).mockRejectedValue(noteError);

      vi.mocked(callClaude)
        .mockResolvedValueOnce({
          text: "gen",
          inputTokens: 100,
          outputTokens: 200,
          cacheReadTokens: 50,
          cacheCreationTokens: 10,
        } as never)
        .mockResolvedValueOnce({
          text: "fix",
          inputTokens: 50,
          outputTokens: 100,
          cacheReadTokens: 25,
          cacheCreationTokens: 5,
        } as never);

      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      // Allow the microtask to settle for fire-and-forget catch
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(logger.warn).toHaveBeenCalledWith("Note extraction failed", {
        error: noteError,
      });
    });
  });

  describe("result.error is undefined (fallback to 'Unknown transpilation error')", () => {
    it("uses 'Unknown transpilation error' when result.error is undefined", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "1";
      vi.mocked(updateCodespace).mockResolvedValue({
        success: false,
      } as never);

      vi.mocked(callClaude)
        .mockResolvedValueOnce({
          text: "gen",
          inputTokens: 100,
          outputTokens: 200,
          cacheReadTokens: 50,
          cacheCreationTokens: 10,
        } as never)
        .mockResolvedValueOnce({
          text: "fix",
          inputTokens: 50,
          outputTokens: 100,
          cacheReadTokens: 25,
          cacheCreationTokens: 5,
        } as never);

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const errorDetected = findEvent(events, "error_detected");
      expect(errorDetected!.error).toBe("Unknown transpilation error");
    });
  });

  describe("codespace URL construction", () => {
    it("constructs codespace URL from generateCodespaceId", async () => {
      vi.mocked(generateCodespaceId).mockReturnValue("custom-id-456");

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const completeEvent = findEvent(events, "complete");
      expect(completeEvent!.url).toBe(
        "https://testing.spike.land/live/custom-id-456/",
      );
    });
  });

  describe("code preview truncation", () => {
    it("truncates code preview to 200 characters", async () => {
      const longCode = "x".repeat(500);
      vi.mocked(parseGenerationResponse).mockReturnValue({
        code: longCode,
        title: "T",
        description: "D",
        relatedApps: [],
      } as never);
      vi.mocked(cleanCode).mockReturnValue(longCode);

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const codeEvent = findEvent(events, "code_generated");
      expect(codeEvent!.codePreview).toHaveLength(200);
    });
  });

  describe("error message truncation in error_detected", () => {
    it("truncates error message to 200 characters", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "1";
      const longError = "E".repeat(500);
      vi.mocked(updateCodespace).mockResolvedValue({
        success: false,
        error: longError,
      } as never);

      vi.mocked(callClaude)
        .mockResolvedValueOnce({
          text: "gen",
          inputTokens: 100,
          outputTokens: 200,
          cacheReadTokens: 50,
          cacheCreationTokens: 10,
        } as never)
        .mockResolvedValueOnce({
          text: "fix",
          inputTokens: 50,
          outputTokens: 100,
          cacheReadTokens: 25,
          cacheCreationTokens: 5,
        } as never);

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const errorDetected = findEvent(events, "error_detected");
      expect(errorDetected!.error).toHaveLength(200);
    });
  });

  describe("learning notes passed to prompt builders", () => {
    it("passes retrieved notes to buildAgentSystemPrompt and buildFixSystemPrompt", async () => {
      const notes = [
        { id: "n1", trigger: "SyntaxError", lesson: "Check parens", confidenceScore: 0.8 },
      ];
      vi.mocked(retrieveRelevantNotes).mockResolvedValue(notes);

      process.env["AGENT_MAX_ITERATIONS"] = "1";
      vi.mocked(updateCodespace)
        .mockResolvedValueOnce({ success: false, error: "err" } as never)
        .mockResolvedValueOnce({ success: true } as never);
      vi.mocked(extractCodeFromResponse).mockReturnValue("fixed");
      vi.mocked(callClaude)
        .mockResolvedValueOnce({
          text: "gen",
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
        } as never)
        .mockResolvedValueOnce({
          text: "fix",
          inputTokens: 30,
          outputTokens: 40,
          cacheReadTokens: 15,
          cacheCreationTokens: 0,
        } as never);

      await collectEvents(
        agentGenerateApp("my-app", ["tools", "my-app"], "user-1"),
      );

      expect(buildAgentSystemPrompt).toHaveBeenCalledWith("tools/my-app", notes);
      expect(buildFixSystemPrompt).toHaveBeenCalledWith("tools/my-app", notes);
    });
  });

  describe("TRANSPILING phase message formatting", () => {
    it("includes iteration count in transpiling message", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "2";

      // Override all relevant mocks for this specific test
      vi.mocked(updateCodespace)
        .mockReset()
        .mockResolvedValueOnce({ success: false, error: "e" } as never)
        .mockResolvedValueOnce({ success: false, error: "e" } as never);

      vi.mocked(callClaude)
        .mockReset()
        .mockResolvedValueOnce({
          text: "gen",
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
        } as never)
        .mockResolvedValueOnce({
          text: "fix1",
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
        } as never)
        .mockResolvedValueOnce({
          text: "fix2",
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
        } as never);

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const transpilePhases = findEvents(events, "phase").filter(
        (e) => e.phase === "TRANSPILING",
      );
      expect(transpilePhases).toHaveLength(2);
      expect(transpilePhases[0]!.message).toBe(
        "Transpiling (attempt 1/2)...",
      );
      expect(transpilePhases[0]!.iteration).toBe(0);
      expect(transpilePhases[1]!.message).toBe(
        "Transpiling (attempt 2/2)...",
      );
      expect(transpilePhases[1]!.iteration).toBe(1);
    });
  });

  describe("FIXING phase message formatting", () => {
    it("includes error type and iteration in fixing message", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "1";
      vi.mocked(updateCodespace).mockResolvedValue({
        success: false,
        error: "import error",
      } as never);
      vi.mocked(parseTranspileError).mockReturnValue({
        type: "import",
        message: "Module not found",
      } as never);

      vi.mocked(callClaude)
        .mockResolvedValueOnce({
          text: "gen",
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
        } as never)
        .mockResolvedValueOnce({
          text: "fix",
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
        } as never);

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      const fixingPhase = findEvents(events, "phase").find(
        (e) => e.phase === "FIXING",
      );
      expect(fixingPhase!.message).toBe(
        "Fixing import error (attempt 1)...",
      );
      expect(fixingPhase!.iteration).toBe(0);
    });
  });

  describe("generator returns correctly (no extra events)", () => {
    it("returns immediately after yielding complete on success", async () => {
      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      // Complete should be the last event
      expect(events[events.length - 1]!.type).toBe("complete");
    });

    it("error is the last event on exhausted iterations", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "1";
      vi.mocked(updateCodespace).mockResolvedValue({
        success: false,
        error: "err",
      } as never);

      vi.mocked(callClaude)
        .mockResolvedValueOnce({
          text: "gen",
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
        } as never)
        .mockResolvedValueOnce({
          text: "fix",
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
        } as never);

      const events = await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(events[events.length - 1]!.type).toBe("error");
    });
  });

  describe("parseGenerationResponse receives correct arguments", () => {
    it("passes generated text and slug", async () => {
      await collectEvents(
        agentGenerateApp("test-slug", ["category", "test-slug"], "user-1"),
      );

      expect(parseGenerationResponse).toHaveBeenCalledWith(
        "generated code",
        "test-slug",
      );
    });
  });

  describe("updateCodespace receives correct arguments", () => {
    it("passes codespace ID and current code", async () => {
      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(updateCodespace).toHaveBeenCalledWith(
        "test-codespace-123",
        DEFAULT_CODE,
      );
    });
  });

  describe("multiple errors tracked correctly", () => {
    it("tracks error history across iterations with fix status", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "3";
      vi.mocked(updateCodespace)
        .mockResolvedValueOnce({ success: false, error: "err1" } as never)
        .mockResolvedValueOnce({ success: false, error: "err2" } as never)
        .mockResolvedValueOnce({ success: false, error: "err3" } as never);

      // First fix succeeds, second returns null, third returns null
      vi.mocked(extractCodeFromResponse)
        .mockReturnValueOnce("fixed1")
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null);

      vi.mocked(callClaude)
        .mockResolvedValueOnce({
          text: "gen",
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
        } as never)
        .mockResolvedValueOnce({
          text: "fix1",
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
        } as never)
        .mockResolvedValueOnce({
          text: "fix2",
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
        } as never)
        .mockResolvedValueOnce({
          text: "fix3",
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
        } as never);

      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      expect(recordGenerationAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [
            { error: "err1", iteration: 0, fixed: true },
            { error: "err2", iteration: 1, fixed: false },
            { error: "err3", iteration: 2, fixed: false },
          ],
        }),
      );
    });
  });

  describe("buildFixUserPrompt receives accumulated errors", () => {
    it("passes all previous errors to buildFixUserPrompt", async () => {
      process.env["AGENT_MAX_ITERATIONS"] = "2";
      vi.mocked(updateCodespace)
        .mockResolvedValueOnce({ success: false, error: "err1" } as never)
        .mockResolvedValueOnce({ success: false, error: "err2" } as never);
      vi.mocked(extractCodeFromResponse).mockReturnValue("fixed");

      vi.mocked(callClaude)
        .mockResolvedValueOnce({
          text: "gen",
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
        } as never)
        .mockResolvedValueOnce({
          text: "fix1",
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
        } as never)
        .mockResolvedValueOnce({
          text: "fix2",
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
        } as never);

      await collectEvents(
        agentGenerateApp("my-app", ["category", "my-app"], "user-1"),
      );

      // Second call to buildFixUserPrompt should include both errors
      expect(buildFixUserPrompt).toHaveBeenCalledTimes(2);
      expect(buildFixUserPrompt).toHaveBeenNthCalledWith(
        2,
        "fixed", // currentCode was updated by first fix
        "err2",
        [
          { error: "err1", iteration: 0 },
          { error: "err2", iteration: 1 },
        ],
      );
    });
  });
});
