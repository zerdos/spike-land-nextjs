import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

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
  default: { error: vi.fn() },
}));

describe("GET /api/create/generate", () => {
  it("should return 400 when topic is missing", async () => {
    const request = new Request("http://localhost/api/create/generate");
    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("topic");
  });

  it("should return 400 when topic is empty", async () => {
    const request = new Request("http://localhost/api/create/generate?topic=");
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("should return topic analysis for valid topic", async () => {
    const request = new Request("http://localhost/api/create/generate?topic=games/tetris");
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.topic).toBe("games/tetris");
    expect(data.keywords).toContain("games");
    expect(data.keywords).toContain("tetris");
    expect(data.matchedSkills.length).toBeGreaterThan(0);
    expect(data.systemPrompt).toContain("GAME DEVELOPMENT");
    expect(data.userPrompt).toContain("games/tetris");
  });

  it("should return matched skills with correct shape", async () => {
    const request = new Request("http://localhost/api/create/generate?topic=3d/globe");
    const response = await GET(request);
    const data = await response.json();

    for (const skill of data.matchedSkills) {
      expect(skill.id).toBeTruthy();
      expect(skill.name).toBeTruthy();
      expect(skill.icon).toBeTruthy();
      expect(skill.category).toBeTruthy();
      expect(skill.categoryLabel).toBeTruthy();
      expect(skill.description).toBeTruthy();
    }
  });

  it("should return fallback prompt when no skills match", async () => {
    const request = new Request("http://localhost/api/create/generate?topic=surprise");
    const response = await GET(request);
    const data = await response.json();

    expect(data.matchedSkills).toEqual([]);
    expect(data.systemPrompt).toContain("ADDITIONAL CDN LIBRARIES");
  });
});
