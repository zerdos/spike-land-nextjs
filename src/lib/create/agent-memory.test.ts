import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/prisma", () => ({
  default: {
    agentLearningNote: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    generationAttempt: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("./keyword-utils", () => ({
  extractKeywords: vi.fn(),
}));

vi.mock("./agent-client", () => ({
  callClaude: vi.fn(),
}));

vi.mock("./agent-prompts", () => ({
  NOTE_EXTRACTION_PROMPT: "MOCK_NOTE_EXTRACTION_PROMPT",
}));

// Import after mocks are established
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";
import { extractKeywords } from "./keyword-utils";
import { callClaude } from "./agent-client";
import {
  extractAndSaveNote,
  recordFailure,
  recordGenerationAttempt,
  recordSuccess,
  retrieveRelevantNotes,
} from "./agent-memory";

// Typed mock references for convenience
const mockPrisma = prisma as unknown as {
  agentLearningNote: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  generationAttempt: {
    create: ReturnType<typeof vi.fn>;
  };
};

const mockLogger = logger as unknown as {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

const mockExtractKeywords = extractKeywords as ReturnType<typeof vi.fn>;
const mockCallClaude = callClaude as ReturnType<typeof vi.fn>;

describe("agent-memory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // retrieveRelevantNotes
  // =========================================================================
  describe("retrieveRelevantNotes", () => {
    it("should join path segments and extract keywords", async () => {
      mockExtractKeywords.mockReturnValue(["react", "chart"]);
      mockPrisma.agentLearningNote.findMany.mockResolvedValue([]);

      await retrieveRelevantNotes(["react", "chart"]);

      expect(mockExtractKeywords).toHaveBeenCalledWith("react/chart");
    });

    it("should query prisma with correct where clause using keywords", async () => {
      mockExtractKeywords.mockReturnValue(["framer", "motion"]);
      mockPrisma.agentLearningNote.findMany.mockResolvedValue([]);

      await retrieveRelevantNotes(["framer-motion", "app"]);

      expect(mockPrisma.agentLearningNote.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ["ACTIVE", "CANDIDATE"] },
          OR: [
            { libraries: { hasSome: ["framer", "motion"] } },
            { tags: { hasSome: ["framer", "motion"] } },
            { triggerType: "universal" },
          ],
        },
        orderBy: { confidenceScore: "desc" },
        take: 20,
      });
    });

    it("should map database notes to LearningNote shape", async () => {
      mockExtractKeywords.mockReturnValue(["react"]);
      mockPrisma.agentLearningNote.findMany.mockResolvedValue([
        {
          id: "note-1",
          trigger: "React useState",
          lesson: "Always initialize state",
          confidenceScore: 0.85,
          status: "ACTIVE",
          libraries: ["react"],
          tags: ["hooks"],
          triggerType: "pattern",
          helpCount: 5,
          failCount: 1,
          extraField: "should be ignored",
        },
        {
          id: "note-2",
          trigger: "Import order",
          lesson: "Put side-effect imports last",
          confidenceScore: 0.72,
          status: "CANDIDATE",
          libraries: [],
          tags: ["imports"],
          triggerType: "universal",
          helpCount: 2,
          failCount: 0,
        },
      ]);

      const result = await retrieveRelevantNotes(["react", "app"]);

      expect(result).toEqual([
        {
          id: "note-1",
          trigger: "React useState",
          lesson: "Always initialize state",
          confidenceScore: 0.85,
        },
        {
          id: "note-2",
          trigger: "Import order",
          lesson: "Put side-effect imports last",
          confidenceScore: 0.72,
        },
      ]);
    });

    it("should return empty array when no notes match", async () => {
      mockExtractKeywords.mockReturnValue(["obscure"]);
      mockPrisma.agentLearningNote.findMany.mockResolvedValue([]);

      const result = await retrieveRelevantNotes(["obscure"]);

      expect(result).toEqual([]);
    });

    it("should return empty array and log warning when prisma throws", async () => {
      const dbError = new Error("Database connection failed");
      mockExtractKeywords.mockReturnValue(["react"]);
      mockPrisma.agentLearningNote.findMany.mockRejectedValue(dbError);

      const result = await retrieveRelevantNotes(["react"]);

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Failed to retrieve learning notes, continuing without them",
        { error: dbError },
      );
    });

    it("should return empty array and log warning when extractKeywords throws", async () => {
      const kwError = new Error("keyword extraction failed");
      mockExtractKeywords.mockImplementation(() => {
        throw kwError;
      });

      const result = await retrieveRelevantNotes(["bad", "input"]);

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Failed to retrieve learning notes, continuing without them",
        { error: kwError },
      );
    });
  });

  // =========================================================================
  // extractAndSaveNote
  // =========================================================================
  describe("extractAndSaveNote", () => {
    const defaultPath = ["apps", "my-app"];
    const failingCode = 'import React from "react";\nexport default () => <div/>';
    const error = "Cannot find module 'framer-motion'";
    const fixedCode = 'import React from "react";\nimport { motion } from "framer-motion";\nexport default () => <motion.div/>';

    it("should call Claude Haiku with correct parameters", async () => {
      mockCallClaude.mockResolvedValue({ text: '{"skip": true}' });

      await extractAndSaveNote(failingCode, error, fixedCode, defaultPath);

      expect(mockCallClaude).toHaveBeenCalledWith({
        systemPrompt: "MOCK_NOTE_EXTRACTION_PROMPT",
        userPrompt: expect.stringContaining("Error: Cannot find module 'framer-motion'"),
        model: "haiku",
        maxTokens: 1024,
        temperature: 0.2,
      });
    });

    it("should include failing code excerpt (truncated to 2000 chars) in user prompt", async () => {
      const longCode = "x".repeat(3000);
      mockCallClaude.mockResolvedValue({ text: '{"skip": true}' });

      await extractAndSaveNote(longCode, error, null, defaultPath);

      const callArgs = mockCallClaude.mock.calls[0][0];
      // The failing code excerpt should be truncated to 2000 chars
      expect(callArgs.userPrompt).toContain("x".repeat(2000));
      expect(callArgs.userPrompt).not.toContain("x".repeat(2001));
    });

    it("should use 'N/A' when fixedCode is null", async () => {
      mockCallClaude.mockResolvedValue({ text: '{"skip": true}' });

      await extractAndSaveNote(failingCode, error, null, defaultPath);

      const callArgs = mockCallClaude.mock.calls[0][0];
      expect(callArgs.userPrompt).toContain("Fixed code (excerpt):\nN/A");
    });

    it("should truncate fixedCode to 2000 chars in user prompt", async () => {
      const longFix = "y".repeat(3000);
      mockCallClaude.mockResolvedValue({ text: '{"skip": true}' });

      await extractAndSaveNote(failingCode, error, longFix, defaultPath);

      const callArgs = mockCallClaude.mock.calls[0][0];
      expect(callArgs.userPrompt).toContain("y".repeat(2000));
      expect(callArgs.userPrompt).not.toContain("y".repeat(2001));
    });

    // --- parseNoteFromAI behavior tested through extractAndSaveNote ---

    it("should return early when AI response has skip: true", async () => {
      mockCallClaude.mockResolvedValue({ text: '{"skip": true}' });

      await extractAndSaveNote(failingCode, error, fixedCode, defaultPath);

      expect(mockPrisma.agentLearningNote.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.agentLearningNote.create).not.toHaveBeenCalled();
    });

    it("should return early when AI response contains no JSON", async () => {
      mockCallClaude.mockResolvedValue({ text: "This is not JSON at all" });

      await extractAndSaveNote(failingCode, error, fixedCode, defaultPath);

      expect(mockPrisma.agentLearningNote.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.agentLearningNote.create).not.toHaveBeenCalled();
    });

    it("should return early when AI response has invalid JSON", async () => {
      mockCallClaude.mockResolvedValue({ text: "{this is not valid json}" });

      await extractAndSaveNote(failingCode, error, fixedCode, defaultPath);

      expect(mockPrisma.agentLearningNote.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.agentLearningNote.create).not.toHaveBeenCalled();
    });

    it("should return early when parsed note has no trigger", async () => {
      mockCallClaude.mockResolvedValue({
        text: '{"lesson": "some lesson but no trigger"}',
      });

      await extractAndSaveNote(failingCode, error, fixedCode, defaultPath);

      expect(mockPrisma.agentLearningNote.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.agentLearningNote.create).not.toHaveBeenCalled();
    });

    it("should return early when parsed note has no lesson", async () => {
      mockCallClaude.mockResolvedValue({
        text: '{"trigger": "some trigger but no lesson"}',
      });

      await extractAndSaveNote(failingCode, error, fixedCode, defaultPath);

      expect(mockPrisma.agentLearningNote.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.agentLearningNote.create).not.toHaveBeenCalled();
    });

    it("should update existing note when a similar note is found", async () => {
      const validResponse = JSON.stringify({
        trigger: "framer-motion AnimatePresence",
        triggerType: "library",
        lesson: "Always wrap children in motion.div",
        libraries: ["framer-motion"],
        errorPatterns: ["Cannot find module"],
        tags: ["animation"],
      });
      mockCallClaude.mockResolvedValue({ text: validResponse });
      mockPrisma.agentLearningNote.findFirst.mockResolvedValue({ id: "existing-note-id" });
      mockPrisma.agentLearningNote.update.mockResolvedValue({});

      await extractAndSaveNote(failingCode, error, fixedCode, defaultPath);

      expect(mockPrisma.agentLearningNote.findFirst).toHaveBeenCalledWith({
        where: {
          trigger: { equals: "framer-motion AnimatePresence", mode: "insensitive" },
          status: { not: "DEPRECATED" },
        },
        select: { id: true },
      });
      expect(mockPrisma.agentLearningNote.update).toHaveBeenCalledWith({
        where: { id: "existing-note-id" },
        data: {
          helpCount: { increment: 1 },
          updatedAt: expect.any(Date),
        },
      });
      expect(mockPrisma.agentLearningNote.create).not.toHaveBeenCalled();
    });

    it("should create a new note when no similar note exists", async () => {
      const validResponse = JSON.stringify({
        trigger: "framer-motion AnimatePresence",
        triggerType: "library",
        lesson: "Always wrap children in motion.div",
        libraries: ["framer-motion"],
        errorPatterns: ["Cannot find module"],
        tags: ["animation"],
      });
      mockCallClaude.mockResolvedValue({ text: validResponse });
      mockPrisma.agentLearningNote.findFirst.mockResolvedValue(null);
      mockPrisma.agentLearningNote.create.mockResolvedValue({});

      await extractAndSaveNote(failingCode, error, fixedCode, defaultPath);

      expect(mockPrisma.agentLearningNote.create).toHaveBeenCalledWith({
        data: {
          trigger: "framer-motion AnimatePresence",
          triggerType: "library",
          lesson: "Always wrap children in motion.div",
          libraries: ["framer-motion"],
          errorPatterns: ["Cannot find module"],
          tags: ["animation"],
          sourceSlug: "apps/my-app",
          sourceError: error.slice(0, 1000),
          sourceFix: fixedCode?.slice(0, 2000),
        },
      });
      expect(mockLogger.info).toHaveBeenCalledWith("Saved new learning note", {
        trigger: "framer-motion AnimatePresence",
        slug: "apps/my-app",
      });
    });

    it("should truncate trigger to 200 chars and lesson to 500 chars", async () => {
      const longTrigger = "t".repeat(300);
      const longLesson = "l".repeat(700);
      const validResponse = JSON.stringify({
        trigger: longTrigger,
        lesson: longLesson,
        libraries: [],
        errorPatterns: [],
        tags: [],
      });
      mockCallClaude.mockResolvedValue({ text: validResponse });
      mockPrisma.agentLearningNote.findFirst.mockResolvedValue(null);
      mockPrisma.agentLearningNote.create.mockResolvedValue({});

      await extractAndSaveNote(failingCode, error, fixedCode, defaultPath);

      const createCall = mockPrisma.agentLearningNote.create.mock.calls[0][0];
      expect(createCall.data.trigger).toHaveLength(200);
      expect(createCall.data.lesson).toHaveLength(500);
    });

    it("should default triggerType to 'error_class' when not provided", async () => {
      const validResponse = JSON.stringify({
        trigger: "some trigger",
        lesson: "some lesson",
        // triggerType omitted
      });
      mockCallClaude.mockResolvedValue({ text: validResponse });
      mockPrisma.agentLearningNote.findFirst.mockResolvedValue(null);
      mockPrisma.agentLearningNote.create.mockResolvedValue({});

      await extractAndSaveNote(failingCode, error, fixedCode, defaultPath);

      const createCall = mockPrisma.agentLearningNote.create.mock.calls[0][0];
      expect(createCall.data.triggerType).toBe("error_class");
    });

    it("should handle non-array libraries/errorPatterns/tags as empty arrays", async () => {
      const validResponse = JSON.stringify({
        trigger: "some trigger",
        lesson: "some lesson",
        libraries: "not-an-array",
        errorPatterns: 42,
        tags: null,
      });
      mockCallClaude.mockResolvedValue({ text: validResponse });
      mockPrisma.agentLearningNote.findFirst.mockResolvedValue(null);
      mockPrisma.agentLearningNote.create.mockResolvedValue({});

      await extractAndSaveNote(failingCode, error, fixedCode, defaultPath);

      const createCall = mockPrisma.agentLearningNote.create.mock.calls[0][0];
      expect(createCall.data.libraries).toEqual([]);
      expect(createCall.data.errorPatterns).toEqual([]);
      expect(createCall.data.tags).toEqual([]);
    });

    it("should convert non-string items in arrays to strings", async () => {
      const validResponse = JSON.stringify({
        trigger: "some trigger",
        lesson: "some lesson",
        libraries: [123, true, "react"],
        errorPatterns: [null],
        tags: [42],
      });
      mockCallClaude.mockResolvedValue({ text: validResponse });
      mockPrisma.agentLearningNote.findFirst.mockResolvedValue(null);
      mockPrisma.agentLearningNote.create.mockResolvedValue({});

      await extractAndSaveNote(failingCode, error, fixedCode, defaultPath);

      const createCall = mockPrisma.agentLearningNote.create.mock.calls[0][0];
      expect(createCall.data.libraries).toEqual(["123", "true", "react"]);
      expect(createCall.data.errorPatterns).toEqual(["null"]);
      expect(createCall.data.tags).toEqual(["42"]);
    });

    it("should extract JSON from text with surrounding content", async () => {
      const text = 'Here is my analysis:\n{"trigger": "test", "lesson": "do this"}\nEnd of response.';
      mockCallClaude.mockResolvedValue({ text });
      mockPrisma.agentLearningNote.findFirst.mockResolvedValue(null);
      mockPrisma.agentLearningNote.create.mockResolvedValue({});

      await extractAndSaveNote(failingCode, error, fixedCode, defaultPath);

      expect(mockPrisma.agentLearningNote.create).toHaveBeenCalled();
      const createCall = mockPrisma.agentLearningNote.create.mock.calls[0][0];
      expect(createCall.data.trigger).toBe("test");
      expect(createCall.data.lesson).toBe("do this");
    });

    it("should truncate sourceError to 1000 chars", async () => {
      const longError = "e".repeat(2000);
      const validResponse = JSON.stringify({
        trigger: "trigger",
        lesson: "lesson",
      });
      mockCallClaude.mockResolvedValue({ text: validResponse });
      mockPrisma.agentLearningNote.findFirst.mockResolvedValue(null);
      mockPrisma.agentLearningNote.create.mockResolvedValue({});

      await extractAndSaveNote(failingCode, longError, fixedCode, defaultPath);

      const createCall = mockPrisma.agentLearningNote.create.mock.calls[0][0];
      expect(createCall.data.sourceError).toHaveLength(1000);
    });

    it("should truncate sourceFix to 2000 chars", async () => {
      const longFix = "f".repeat(5000);
      const validResponse = JSON.stringify({
        trigger: "trigger",
        lesson: "lesson",
      });
      mockCallClaude.mockResolvedValue({ text: validResponse });
      mockPrisma.agentLearningNote.findFirst.mockResolvedValue(null);
      mockPrisma.agentLearningNote.create.mockResolvedValue({});

      await extractAndSaveNote(failingCode, error, longFix, defaultPath);

      const createCall = mockPrisma.agentLearningNote.create.mock.calls[0][0];
      expect(createCall.data.sourceFix).toHaveLength(2000);
    });

    it("should set sourceFix to undefined when fixedCode is null", async () => {
      const validResponse = JSON.stringify({
        trigger: "trigger",
        lesson: "lesson",
      });
      mockCallClaude.mockResolvedValue({ text: validResponse });
      mockPrisma.agentLearningNote.findFirst.mockResolvedValue(null);
      mockPrisma.agentLearningNote.create.mockResolvedValue({});

      await extractAndSaveNote(failingCode, error, null, defaultPath);

      const createCall = mockPrisma.agentLearningNote.create.mock.calls[0][0];
      expect(createCall.data.sourceFix).toBeUndefined();
    });

    it("should log warning and swallow error when callClaude throws", async () => {
      const aiError = new Error("API rate limited");
      mockCallClaude.mockRejectedValue(aiError);

      await extractAndSaveNote(failingCode, error, fixedCode, defaultPath);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Failed to extract/save learning note",
        { error: aiError },
      );
      expect(mockPrisma.agentLearningNote.create).not.toHaveBeenCalled();
    });

    it("should log warning and swallow error when prisma.create throws", async () => {
      const dbError = new Error("Unique constraint violation");
      const validResponse = JSON.stringify({
        trigger: "trigger",
        lesson: "lesson",
      });
      mockCallClaude.mockResolvedValue({ text: validResponse });
      mockPrisma.agentLearningNote.findFirst.mockResolvedValue(null);
      mockPrisma.agentLearningNote.create.mockRejectedValue(dbError);

      await extractAndSaveNote(failingCode, error, fixedCode, defaultPath);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Failed to extract/save learning note",
        { error: dbError },
      );
    });
  });

  // =========================================================================
  // recordSuccess
  // =========================================================================
  describe("recordSuccess", () => {
    it("should skip processing when noteIds is empty", async () => {
      await recordSuccess([]);

      expect(mockPrisma.agentLearningNote.updateMany).not.toHaveBeenCalled();
    });

    it("should increment helpCount for all given note IDs", async () => {
      mockPrisma.agentLearningNote.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.agentLearningNote.findUnique.mockResolvedValue(null);

      await recordSuccess(["note-a", "note-b"]);

      expect(mockPrisma.agentLearningNote.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["note-a", "note-b"] } },
        data: { helpCount: { increment: 1 } },
      });
    });

    it("should recalculate confidence for each note ID", async () => {
      mockPrisma.agentLearningNote.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.agentLearningNote.findUnique
        .mockResolvedValueOnce({
          id: "note-a",
          helpCount: 3,
          failCount: 1,
          status: "CANDIDATE",
        })
        .mockResolvedValueOnce({
          id: "note-b",
          helpCount: 1,
          failCount: 0,
          status: "ACTIVE",
        });
      mockPrisma.agentLearningNote.update.mockResolvedValue({});

      await recordSuccess(["note-a", "note-b"]);

      expect(mockPrisma.agentLearningNote.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrisma.agentLearningNote.update).toHaveBeenCalledTimes(2);
    });

    it("should log warning and swallow error when updateMany throws", async () => {
      const dbError = new Error("DB down");
      mockPrisma.agentLearningNote.updateMany.mockRejectedValue(dbError);

      await recordSuccess(["note-a"]);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Failed to record success for notes",
        { error: dbError },
      );
    });
  });

  // =========================================================================
  // recordFailure
  // =========================================================================
  describe("recordFailure", () => {
    it("should skip processing when noteIds is empty", async () => {
      await recordFailure([]);

      expect(mockPrisma.agentLearningNote.updateMany).not.toHaveBeenCalled();
    });

    it("should increment failCount for all given note IDs", async () => {
      mockPrisma.agentLearningNote.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.agentLearningNote.findUnique.mockResolvedValue(null);

      await recordFailure(["note-c"]);

      expect(mockPrisma.agentLearningNote.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["note-c"] } },
        data: { failCount: { increment: 1 } },
      });
    });

    it("should recalculate confidence for each note ID", async () => {
      mockPrisma.agentLearningNote.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.agentLearningNote.findUnique.mockResolvedValueOnce({
        id: "note-c",
        helpCount: 0,
        failCount: 5,
        status: "CANDIDATE",
      });
      mockPrisma.agentLearningNote.update.mockResolvedValue({});

      await recordFailure(["note-c"]);

      expect(mockPrisma.agentLearningNote.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.agentLearningNote.update).toHaveBeenCalledTimes(1);
    });

    it("should log warning and swallow error when updateMany throws", async () => {
      const dbError = new Error("Connection reset");
      mockPrisma.agentLearningNote.updateMany.mockRejectedValue(dbError);

      await recordFailure(["note-c"]);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Failed to record failure for notes",
        { error: dbError },
      );
    });
  });

  // =========================================================================
  // recalculateConfidence (tested through recordSuccess/recordFailure)
  // =========================================================================
  describe("recalculateConfidence (via recordSuccess/recordFailure)", () => {
    it("should compute Bayesian score: (help+1)/(help+fail+2)", async () => {
      // helpCount=4, failCount=1 => score = (4+1)/(4+1+2) = 5/7 ~ 0.714
      mockPrisma.agentLearningNote.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.agentLearningNote.findUnique.mockResolvedValue({
        id: "note-x",
        helpCount: 4,
        failCount: 1,
        status: "ACTIVE",
      });
      mockPrisma.agentLearningNote.update.mockResolvedValue({});

      await recordSuccess(["note-x"]);

      const updateCall = mockPrisma.agentLearningNote.update.mock.calls[0][0];
      expect(updateCall.where.id).toBe("note-x");
      expect(updateCall.data.confidenceScore).toBeCloseTo(5 / 7, 10);
      expect(updateCall.data.status).toBe("ACTIVE");
    });

    it("should promote CANDIDATE to ACTIVE when helpCount >= 3 and score > 0.6", async () => {
      // helpCount=3, failCount=0 => score = (3+1)/(3+0+2) = 4/5 = 0.8 > 0.6
      mockPrisma.agentLearningNote.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.agentLearningNote.findUnique.mockResolvedValue({
        id: "candidate-note",
        helpCount: 3,
        failCount: 0,
        status: "CANDIDATE",
      });
      mockPrisma.agentLearningNote.update.mockResolvedValue({});

      await recordSuccess(["candidate-note"]);

      const updateCall = mockPrisma.agentLearningNote.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe("ACTIVE");
      expect(updateCall.data.confidenceScore).toBeCloseTo(0.8, 10);
    });

    it("should NOT promote CANDIDATE when helpCount < 3 even if score > 0.6", async () => {
      // helpCount=2, failCount=0 => score = 3/4 = 0.75 > 0.6, but helpCount < 3
      mockPrisma.agentLearningNote.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.agentLearningNote.findUnique.mockResolvedValue({
        id: "candidate-note",
        helpCount: 2,
        failCount: 0,
        status: "CANDIDATE",
      });
      mockPrisma.agentLearningNote.update.mockResolvedValue({});

      await recordSuccess(["candidate-note"]);

      const updateCall = mockPrisma.agentLearningNote.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe("CANDIDATE");
    });

    it("should NOT promote CANDIDATE when score <= 0.6 even if helpCount >= 3", async () => {
      // helpCount=3, failCount=4 => score = (3+1)/(3+4+2) = 4/9 ~ 0.444 <= 0.6
      mockPrisma.agentLearningNote.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.agentLearningNote.findUnique.mockResolvedValue({
        id: "candidate-note",
        helpCount: 3,
        failCount: 4,
        status: "CANDIDATE",
      });
      mockPrisma.agentLearningNote.update.mockResolvedValue({});

      await recordSuccess(["candidate-note"]);

      const updateCall = mockPrisma.agentLearningNote.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe("CANDIDATE");
    });

    it("should deprecate when score < 0.3 and total observations >= 5", async () => {
      // helpCount=0, failCount=6 => score = (0+1)/(0+6+2) = 1/8 = 0.125 < 0.3
      // total = 6 >= 5
      mockPrisma.agentLearningNote.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.agentLearningNote.findUnique.mockResolvedValue({
        id: "bad-note",
        helpCount: 0,
        failCount: 6,
        status: "ACTIVE",
      });
      mockPrisma.agentLearningNote.update.mockResolvedValue({});

      await recordFailure(["bad-note"]);

      const updateCall = mockPrisma.agentLearningNote.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe("DEPRECATED");
      expect(updateCall.data.confidenceScore).toBeCloseTo(1 / 8, 10);
    });

    it("should NOT deprecate when total observations < 5 even if score < 0.3", async () => {
      // helpCount=0, failCount=3 => score = 1/5 = 0.2 < 0.3
      // total = 3 < 5
      mockPrisma.agentLearningNote.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.agentLearningNote.findUnique.mockResolvedValue({
        id: "early-note",
        helpCount: 0,
        failCount: 3,
        status: "CANDIDATE",
      });
      mockPrisma.agentLearningNote.update.mockResolvedValue({});

      await recordFailure(["early-note"]);

      const updateCall = mockPrisma.agentLearningNote.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe("CANDIDATE");
    });

    it("should NOT deprecate when score >= 0.3 even with >= 5 observations", async () => {
      // helpCount=1, failCount=4 => score = 2/7 ~ 0.2857 < 0.3 ... actually that IS < 0.3
      // Let's use helpCount=2, failCount=4 => score = 3/8 = 0.375 >= 0.3
      mockPrisma.agentLearningNote.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.agentLearningNote.findUnique.mockResolvedValue({
        id: "borderline-note",
        helpCount: 2,
        failCount: 4,
        status: "ACTIVE",
      });
      mockPrisma.agentLearningNote.update.mockResolvedValue({});

      await recordFailure(["borderline-note"]);

      const updateCall = mockPrisma.agentLearningNote.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe("ACTIVE");
      expect(updateCall.data.confidenceScore).toBeCloseTo(3 / 8, 10);
    });

    it("should deprecate a CANDIDATE that gets promoted then deprecated in same calc", async () => {
      // Edge case: CANDIDATE with helpCount=3, failCount=5 =>
      // score = 4/10 = 0.4 -> NOT < 0.3, so no deprecation.
      // Let's make a case where both branches fire:
      // CANDIDATE, helpCount=3, failCount=10 => score = 4/15 ~ 0.267 < 0.3
      // Promotion check: helpCount >= 3 AND score > 0.6 => NO (score too low)
      // Deprecation check: score < 0.3 AND total >= 5 => YES
      mockPrisma.agentLearningNote.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.agentLearningNote.findUnique.mockResolvedValue({
        id: "double-check",
        helpCount: 3,
        failCount: 10,
        status: "CANDIDATE",
      });
      mockPrisma.agentLearningNote.update.mockResolvedValue({});

      await recordFailure(["double-check"]);

      const updateCall = mockPrisma.agentLearningNote.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe("DEPRECATED");
    });

    it("should handle note not found (findUnique returns null)", async () => {
      mockPrisma.agentLearningNote.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.agentLearningNote.findUnique.mockResolvedValue(null);

      await recordSuccess(["nonexistent-note"]);

      expect(mockPrisma.agentLearningNote.update).not.toHaveBeenCalled();
    });

    it("should process multiple note IDs sequentially", async () => {
      mockPrisma.agentLearningNote.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.agentLearningNote.findUnique
        .mockResolvedValueOnce({
          id: "a",
          helpCount: 5,
          failCount: 0,
          status: "CANDIDATE",
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: "c",
          helpCount: 1,
          failCount: 1,
          status: "ACTIVE",
        });
      mockPrisma.agentLearningNote.update.mockResolvedValue({});

      await recordSuccess(["a", "b", "c"]);

      expect(mockPrisma.agentLearningNote.findUnique).toHaveBeenCalledTimes(3);
      // Only 2 updates: 'a' and 'c' (not 'b' because findUnique returned null)
      expect(mockPrisma.agentLearningNote.update).toHaveBeenCalledTimes(2);
    });

    it("should override CANDIDATE->ACTIVE promotion with DEPRECATED when both conditions met", async () => {
      // CANDIDATE, helpCount=3, failCount=7 =>
      // score = 4/12 = 0.333... > 0.3 so NO deprecation
      // helpCount >= 3 but score 0.333 <= 0.6 so NO promotion
      // Let's craft: helpCount=5, failCount=20 => score = 6/27 ~ 0.222 < 0.3
      // promotion: helpCount >= 3 AND score > 0.6 => NO
      // deprecation: score < 0.3 AND total = 25 >= 5 => YES
      mockPrisma.agentLearningNote.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.agentLearningNote.findUnique.mockResolvedValue({
        id: "both-cond",
        helpCount: 5,
        failCount: 20,
        status: "CANDIDATE",
      });
      mockPrisma.agentLearningNote.update.mockResolvedValue({});

      await recordSuccess(["both-cond"]);

      const updateCall = mockPrisma.agentLearningNote.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe("DEPRECATED");
    });

    it("should score exactly (1)/(2) = 0.5 for a fresh note with 0 help and 0 fail", async () => {
      // helpCount=0, failCount=0 => score = (0+1)/(0+0+2) = 0.5
      mockPrisma.agentLearningNote.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.agentLearningNote.findUnique.mockResolvedValue({
        id: "fresh-note",
        helpCount: 0,
        failCount: 0,
        status: "CANDIDATE",
      });
      mockPrisma.agentLearningNote.update.mockResolvedValue({});

      await recordSuccess(["fresh-note"]);

      const updateCall = mockPrisma.agentLearningNote.update.mock.calls[0][0];
      expect(updateCall.data.confidenceScore).toBe(0.5);
      expect(updateCall.data.status).toBe("CANDIDATE");
    });
  });

  // =========================================================================
  // recordGenerationAttempt
  // =========================================================================
  describe("recordGenerationAttempt", () => {
    const baseParams = {
      slug: "apps/my-app",
      success: true,
      iterations: 2,
      totalDurationMs: 5000,
      notesApplied: ["note-1", "note-2"],
      errors: [
        { error: "SyntaxError", iteration: 1, fixed: true },
      ],
      model: "opus",
      inputTokens: 1000,
      outputTokens: 500,
    };

    it("should create a generation attempt record with all fields", async () => {
      mockPrisma.generationAttempt.create.mockResolvedValue({});

      await recordGenerationAttempt(baseParams);

      expect(mockPrisma.generationAttempt.create).toHaveBeenCalledWith({
        data: {
          slug: "apps/my-app",
          success: true,
          iterations: 2,
          totalDurationMs: 5000,
          notesApplied: ["note-1", "note-2"],
          errors: [{ error: "SyntaxError", iteration: 1, fixed: true }],
          model: "opus",
          inputTokens: 1000,
          outputTokens: 500,
          cachedTokens: 0,
        },
      });
    });

    it("should use provided cachedTokens value when given", async () => {
      mockPrisma.generationAttempt.create.mockResolvedValue({});

      await recordGenerationAttempt({ ...baseParams, cachedTokens: 750 });

      const createCall = mockPrisma.generationAttempt.create.mock.calls[0][0];
      expect(createCall.data.cachedTokens).toBe(750);
    });

    it("should default cachedTokens to 0 when undefined", async () => {
      mockPrisma.generationAttempt.create.mockResolvedValue({});

      await recordGenerationAttempt({ ...baseParams, cachedTokens: undefined });

      const createCall = mockPrisma.generationAttempt.create.mock.calls[0][0];
      expect(createCall.data.cachedTokens).toBe(0);
    });

    it("should handle failed generation attempts", async () => {
      mockPrisma.generationAttempt.create.mockResolvedValue({});

      await recordGenerationAttempt({
        ...baseParams,
        success: false,
        errors: [
          { error: "TypeError", iteration: 1, fixed: false },
          { error: "SyntaxError", iteration: 2, fixed: false },
        ],
      });

      const createCall = mockPrisma.generationAttempt.create.mock.calls[0][0];
      expect(createCall.data.success).toBe(false);
      expect(createCall.data.errors).toHaveLength(2);
    });

    it("should log warning and swallow error when prisma throws", async () => {
      const dbError = new Error("Disk full");
      mockPrisma.generationAttempt.create.mockRejectedValue(dbError);

      await recordGenerationAttempt(baseParams);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Failed to record generation attempt",
        { error: dbError },
      );
    });

    it("should record attempt with empty notesApplied and errors", async () => {
      mockPrisma.generationAttempt.create.mockResolvedValue({});

      await recordGenerationAttempt({
        ...baseParams,
        notesApplied: [],
        errors: [],
      });

      const createCall = mockPrisma.generationAttempt.create.mock.calls[0][0];
      expect(createCall.data.notesApplied).toEqual([]);
      expect(createCall.data.errors).toEqual([]);
    });
  });
});
