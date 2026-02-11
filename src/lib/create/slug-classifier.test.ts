import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALLOWED_CATEGORIES,
  BLOCKED_TOPICS,
  ClassificationResultSchema,
  classifyInput,
  validateSlug,
} from "./slug-classifier";

vi.mock("@/lib/ai/gemini-client", () => ({
  generateStructuredResponse: vi.fn(),
  StructuredResponseParseError: class extends Error {
    rawText: string;
    constructor(msg: string, raw: string) {
      super(msg);
      this.rawText = raw;
    }
  },
}));

vi.mock("@/lib/logger", () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const { generateStructuredResponse } = await import(
  "@/lib/ai/gemini-client"
);
const mockGenerate = vi.mocked(generateStructuredResponse);

describe("validateSlug", () => {
  it("should lowercase and strip invalid chars", () => {
    expect(validateSlug("Hello World!@#$")).toBe("helloworld");
  });

  it("should allow hyphens and slashes", () => {
    expect(validateSlug("games/tetris-clone")).toBe("games/tetris-clone");
  });

  it("should collapse double slashes", () => {
    expect(validateSlug("games//tetris")).toBe("games/tetris");
  });

  it("should collapse double hyphens", () => {
    expect(validateSlug("my--app")).toBe("my-app");
  });

  it("should trim leading/trailing slashes and hyphens", () => {
    expect(validateSlug("/games/tetris/")).toBe("games/tetris");
    expect(validateSlug("-my-app-")).toBe("my-app");
  });

  it("should enforce max 3 segments", () => {
    expect(validateSlug("a/b/c/d/e")).toBe("a/b/c");
  });

  it("should enforce max 80 characters", () => {
    const long = "a".repeat(100);
    const result = validateSlug(long);
    expect(result.length).toBeLessThanOrEqual(80);
  });

  it("should handle empty string", () => {
    expect(validateSlug("")).toBe("");
  });

  it("should handle only invalid characters", () => {
    expect(validateSlug("!!!")).toBe("");
  });

  it("should clean trailing slash/hyphen after truncation", () => {
    // Build a string that is exactly 80 chars with a hyphen at position 80
    const slug = "games/" + "a".repeat(73) + "-";
    const result = validateSlug(slug);
    expect(result).not.toMatch(/[-/]$/);
  });
});

describe("ClassificationResultSchema", () => {
  it("should accept valid ok result", () => {
    const result = ClassificationResultSchema.safeParse({
      status: "ok",
      slug: "games/tetris",
      category: "games",
      reason: null,
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid blocked result", () => {
    const result = ClassificationResultSchema.safeParse({
      status: "blocked",
      slug: "",
      category: "",
      reason: "Content not allowed",
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid unclear result", () => {
    const result = ClassificationResultSchema.safeParse({
      status: "unclear",
      slug: "",
      category: "",
      reason: "Please be more specific",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid status", () => {
    const result = ClassificationResultSchema.safeParse({
      status: "invalid",
      slug: "",
      category: "",
      reason: null,
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing fields", () => {
    const result = ClassificationResultSchema.safeParse({
      status: "ok",
    });
    expect(result.success).toBe(false);
  });
});

describe("constants", () => {
  it("should have at least 20 allowed categories", () => {
    expect(ALLOWED_CATEGORIES.length).toBeGreaterThanOrEqual(20);
  });

  it("should have at least 8 blocked topics", () => {
    expect(BLOCKED_TOPICS.length).toBeGreaterThanOrEqual(8);
  });
});

describe("classifyInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return unclear for empty input", async () => {
    const result = await classifyInput("");
    expect(result.status).toBe("unclear");
    expect(result.reason).toBeTruthy();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("should return unclear for whitespace-only input", async () => {
    const result = await classifyInput("   ");
    expect(result.status).toBe("unclear");
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("should return unclear for input exceeding 2000 chars", async () => {
    const result = await classifyInput("a".repeat(2001));
    expect(result.status).toBe("unclear");
    expect(result.reason).toContain("too long");
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("should return ok result from AI", async () => {
    mockGenerate.mockResolvedValueOnce({
      status: "ok",
      slug: "cooking/pasta-recipe-tracker",
      category: "cooking",
      reason: null,
    });

    const result = await classifyInput("I want a recipe tracker with pasta timers");
    expect(result.status).toBe("ok");
    expect(result.slug).toBe("cooking/pasta-recipe-tracker");
    expect(result.category).toBe("cooking");
    expect(result.reason).toBeNull();
  });

  it("should return blocked result from AI", async () => {
    mockGenerate.mockResolvedValueOnce({
      status: "blocked",
      slug: "",
      category: "",
      reason: "This topic is not allowed.",
    });

    const result = await classifyInput("how to make weapons");
    expect(result.status).toBe("blocked");
    expect(result.reason).toBeTruthy();
  });

  it("should return unclear result from AI", async () => {
    mockGenerate.mockResolvedValueOnce({
      status: "unclear",
      slug: "",
      category: "",
      reason: "Try describing what the app should do.",
    });

    const result = await classifyInput("hi");
    expect(result.status).toBe("unclear");
    expect(result.reason).toBeTruthy();
  });

  it("should fail-closed to 'unclear' on AI error", async () => {
    mockGenerate.mockRejectedValueOnce(new Error("API unavailable"));

    const result = await classifyInput("todo list");
    expect(result.status).toBe("unclear");
    expect(result.slug).toBe("todo-list");
    expect(result.reason).toBeTruthy();
  });

  it("should fail-closed to 'unclear' on malformed AI response", async () => {
    mockGenerate.mockResolvedValueOnce({
      unexpected: "shape",
    });

    const result = await classifyInput("color picker");
    expect(result.status).toBe("unclear");
    expect(result.slug).toBe("color-picker");
    expect(result.reason).toBeTruthy();
  });

  it("should sanitize slug from AI response", async () => {
    mockGenerate.mockResolvedValueOnce({
      status: "ok",
      slug: "GAMES//My Cool App!!!",
      category: "games",
      reason: null,
    });

    const result = await classifyInput("my cool game app");
    expect(result.slug).toBe("games/mycoolapp");
    expect(result.slug).toMatch(/^[a-z0-9\-/]+$/);
  });

  it("should call generateStructuredResponse with correct params", async () => {
    mockGenerate.mockResolvedValueOnce({
      status: "ok",
      slug: "productivity/todo",
      category: "productivity",
      reason: null,
    });

    await classifyInput("todo list");

    expect(mockGenerate).toHaveBeenCalledWith({
      prompt: "todo list",
      systemPrompt: expect.stringContaining("classify user app ideas"),
      maxTokens: 512,
      temperature: 0.1,
      responseJsonSchema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["ok", "blocked", "unclear"] },
          slug: { type: "string" },
          category: { type: "string" },
          reason: { type: "string", nullable: true },
        },
        required: ["status", "slug", "category", "reason"],
      },
    });
  });
});
