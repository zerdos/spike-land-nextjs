import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/learnit/content-service", () => ({
  createOrUpdateContent: vi.fn(),
  getLearnItContent: vi.fn(),
  markAsFailed: vi.fn(),
  markAsGenerating: vi.fn(),
}));

vi.mock("@/lib/learnit/content-generator", () => ({
  generateLearnItTopic: vi.fn(),
}));

vi.mock("@/lib/learnit/mdx-generator", () => ({
  generateMdxFromResponse: vi.fn().mockReturnValue("## Generated MDX"),
}));

import { auth } from "@/auth";
import { generateLearnItTopic } from "@/lib/learnit/content-generator";
import {
  createOrUpdateContent,
  getLearnItContent,
  markAsFailed,
  markAsGenerating,
} from "@/lib/learnit/content-service";

describe("LearnIt Regenerate API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    (auth as Mock).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/learnit/regenerate", {
      method: "POST",
      body: JSON.stringify({ slug: "react/hooks" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 when body is invalid", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user_1" } });

    const request = new Request("http://localhost:3000/api/learnit/regenerate", {
      method: "POST",
      body: JSON.stringify({ slug: "" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid request");
  });

  it("returns 404 when content not found", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user_1" } });
    (getLearnItContent as Mock).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/learnit/regenerate", {
      method: "POST",
      body: JSON.stringify({ slug: "nonexistent/topic" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it("returns 202 when already generating within 2-minute window", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user_1" } });
    (getLearnItContent as Mock).mockResolvedValue({
      status: "GENERATING",
      generatedAt: new Date(), // just now
      path: ["react", "hooks"],
    });

    const request = new Request("http://localhost:3000/api/learnit/regenerate", {
      method: "POST",
      body: JSON.stringify({ slug: "react/hooks" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(202);
    const data = await response.json();
    expect(data.status).toBe("GENERATING");
  });

  it("returns 500 when generation fails", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user_1" } });
    (getLearnItContent as Mock).mockResolvedValue({
      status: "PUBLISHED",
      path: ["react", "hooks"],
    });
    (markAsGenerating as Mock).mockResolvedValue(undefined);
    (generateLearnItTopic as Mock).mockResolvedValue(null);
    (markAsFailed as Mock).mockResolvedValue(undefined);

    const request = new Request("http://localhost:3000/api/learnit/regenerate", {
      method: "POST",
      body: JSON.stringify({ slug: "react/hooks" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    expect(markAsFailed).toHaveBeenCalledWith("react/hooks");
  });

  it("regenerates content successfully", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user_1" } });
    (getLearnItContent as Mock).mockResolvedValue({
      status: "PUBLISHED",
      path: ["react", "hooks"],
    });
    (markAsGenerating as Mock).mockResolvedValue(undefined);
    (generateLearnItTopic as Mock).mockResolvedValue({
      title: "React Hooks",
      description: "Learn about React Hooks",
      sections: [{ heading: "Intro", content: "Hooks are..." }],
      relatedTopics: ["State Management"],
      aiModel: "gemini-3-flash-preview",
    });

    const savedContent = {
      id: "content_1",
      slug: "react/hooks",
      title: "React Hooks",
      status: "PUBLISHED",
    };
    (createOrUpdateContent as Mock).mockResolvedValue(savedContent);

    const request = new Request("http://localhost:3000/api/learnit/regenerate", {
      method: "POST",
      body: JSON.stringify({ slug: "react/hooks" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.slug).toBe("react/hooks");
    expect(markAsGenerating).toHaveBeenCalledWith("react/hooks", ["react", "hooks"], "user_1");
    expect(createOrUpdateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "react/hooks",
        title: "React Hooks",
        aiModel: "gemini-3-flash-preview",
      }),
    );
  });
});
