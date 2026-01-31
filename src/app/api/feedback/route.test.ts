import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/agents/github-issues", () => ({
  isGitHubAvailable: vi.fn(),
  createIssue: vi.fn(),
}));

const { auth } = await import("@/auth");
const { isGitHubAvailable, createIssue } = await import(
  "@/lib/agents/github-issues"
);

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isGitHubAvailable).mockReturnValue(true);
  });

  it("should create GitHub issue with valid data for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-12345678-abcd", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(createIssue).mockResolvedValue({
      data: {
        number: 123,
        title: "[Bug Report] This is a bug report",
        state: "open",
        labels: ["user-feedback", "bug"],
        author: "github-actions[bot]",
        assignees: [],
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        url: "https://github.com/zerdos/spike-land-nextjs/issues/123",
        body: "## Feedback\n\nThis is a bug report",
      },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: "BUG",
        message: "This is a bug report",
        page: "/test-page",
        userAgent: "Mozilla/5.0",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual({
      success: true,
      issueUrl: "https://github.com/zerdos/spike-land-nextjs/issues/123",
      issueNumber: 123,
    });
    expect(createIssue).toHaveBeenCalledWith({
      title: "[Bug Report] This is a bug report",
      body: expect.stringContaining("This is a bug report"),
      labels: ["user-feedback", "bug"],
    });
    expect(createIssue).toHaveBeenCalledWith({
      title: expect.any(String),
      body: expect.stringContaining("user_user-123"),
      labels: expect.any(Array),
    });
  });

  it("should create GitHub issue for anonymous users", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    vi.mocked(createIssue).mockResolvedValue({
      data: {
        number: 124,
        title: "[Feature Request] Great idea for a feature",
        state: "open",
        labels: ["user-feedback", "enhancement"],
        author: "github-actions[bot]",
        assignees: [],
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        url: "https://github.com/zerdos/spike-land-nextjs/issues/124",
        body: "## Feedback",
      },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: "IDEA",
        message: "Great idea for a feature",
        page: "/features",
        email: "anon@example.com",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.issueNumber).toBe(124);
    expect(createIssue).toHaveBeenCalledWith({
      title: "[Feature Request] Great idea for a feature",
      body: expect.stringContaining("Anonymous"),
      labels: ["user-feedback", "enhancement"],
    });
    expect(createIssue).toHaveBeenCalledWith({
      title: expect.any(String),
      body: expect.stringContaining("anon@example.com"),
      labels: expect.any(Array),
    });
  });

  it("should return 503 when GitHub is not available", async () => {
    vi.mocked(isGitHubAvailable).mockReturnValue(false);

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: "BUG",
        message: "Test message",
        page: "/test",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe("Feedback service is not configured");
    expect(createIssue).not.toHaveBeenCalled();
  });

  it("should return 400 for invalid feedback type", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: "INVALID_TYPE",
        message: "Test message",
        page: "/test",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "Invalid feedback type. Must be one of: BUG, IDEA, OTHER",
    );
    expect(createIssue).not.toHaveBeenCalled();
  });

  it("should return 400 for empty message", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: "BUG",
        message: "",
        page: "/test",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Message is required and cannot be empty");
    expect(createIssue).not.toHaveBeenCalled();
  });

  it("should return 400 for whitespace-only message", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: "BUG",
        message: "   ",
        page: "/test",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Message is required and cannot be empty");
    expect(createIssue).not.toHaveBeenCalled();
  });

  it("should return 400 for missing page field", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: "BUG",
        message: "Test message",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Page is required and cannot be empty");
    expect(createIssue).not.toHaveBeenCalled();
  });

  it("should return 400 for empty page field", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: "BUG",
        message: "Test message",
        page: "",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Page is required and cannot be empty");
    expect(createIssue).not.toHaveBeenCalled();
  });

  it("should use user ID prefix for authenticated users", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123-abc-xyz", email: "authenticated@example.com" },
      expires: "2025-12-31",
    } as Session);

    vi.mocked(createIssue).mockResolvedValue({
      data: {
        number: 125,
        title: "[Feedback] Other feedback",
        state: "open",
        labels: ["user-feedback"],
        author: "github-actions[bot]",
        assignees: [],
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        url: "https://github.com/zerdos/spike-land-nextjs/issues/125",
        body: "## Feedback",
      },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: "OTHER",
        message: "Other feedback",
        page: "/other-page",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(createIssue).toHaveBeenCalledWith({
      title: "[Feedback] Other feedback",
      body: expect.stringContaining("user_user-123"),
      labels: ["user-feedback"],
    });
  });

  it("should return 500 on GitHub API failure", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    vi.mocked(createIssue).mockResolvedValue({
      data: null,
      error: "GitHub API error",
    });

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: "BUG",
        message: "Test message",
        page: "/test",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to submit feedback");
  });

  it("should trim whitespace from message and page", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    vi.mocked(createIssue).mockResolvedValue({
      data: {
        number: 126,
        title: "[Bug Report] Trimmed message",
        state: "open",
        labels: ["user-feedback", "bug"],
        author: "github-actions[bot]",
        assignees: [],
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        url: "https://github.com/zerdos/spike-land-nextjs/issues/126",
        body: "## Feedback",
      },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: "BUG",
        message: "  Trimmed message  ",
        page: "  /trimmed-page  ",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(createIssue).toHaveBeenCalledWith({
      title: "[Bug Report] Trimmed message",
      body: expect.stringContaining("Trimmed message"),
      labels: ["user-feedback", "bug"],
    });
    expect(createIssue).toHaveBeenCalledWith({
      title: expect.any(String),
      body: expect.stringContaining("/trimmed-page"),
      labels: expect.any(Array),
    });
  });

  it("should handle all valid feedback types (BUG, IDEA, OTHER)", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const feedbackTypes = [
      { type: "BUG", prefix: "[Bug Report]", labels: ["user-feedback", "bug"] },
      {
        type: "IDEA",
        prefix: "[Feature Request]",
        labels: ["user-feedback", "enhancement"],
      },
      { type: "OTHER", prefix: "[Feedback]", labels: ["user-feedback"] },
    ];

    for (const { type, prefix, labels } of feedbackTypes) {
      vi.mocked(createIssue).mockResolvedValue({
        data: {
          number: 127,
          title: `${prefix} ${type} message`,
          state: "open",
          labels,
          author: "github-actions[bot]",
          assignees: [],
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
          url: `https://github.com/zerdos/spike-land-nextjs/issues/127`,
          body: "## Feedback",
        },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          type,
          message: `${type} message`,
          page: "/test",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(createIssue).toHaveBeenCalledWith({
        title: `${prefix} ${type} message`,
        body: expect.any(String),
        labels,
      });
    }
  });

  it("should include email and userAgent in issue body", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    vi.mocked(createIssue).mockResolvedValue({
      data: {
        number: 128,
        title: "[Bug Report] Message with optional fields",
        state: "open",
        labels: ["user-feedback", "bug"],
        author: "github-actions[bot]",
        assignees: [],
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        url: "https://github.com/zerdos/spike-land-nextjs/issues/128",
        body: "## Feedback",
      },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: "BUG",
        message: "Message with optional fields",
        page: "/test",
        email: "  optional@example.com  ",
        userAgent: "  Custom User Agent  ",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(createIssue).toHaveBeenCalledWith({
      title: expect.any(String),
      body: expect.stringContaining("optional@example.com"),
      labels: expect.any(Array),
    });
    expect(createIssue).toHaveBeenCalledWith({
      title: expect.any(String),
      body: expect.stringContaining("Custom User Agent"),
      labels: expect.any(Array),
    });
  });

  it("should truncate long messages in title", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const longMessage =
      "This is a very long message that exceeds the 80 character limit for the issue title and should be truncated with an ellipsis";

    vi.mocked(createIssue).mockResolvedValue({
      data: {
        number: 129,
        title: "[Bug Report] " + longMessage.slice(0, 80) + "...",
        state: "open",
        labels: ["user-feedback", "bug"],
        author: "github-actions[bot]",
        assignees: [],
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        url: "https://github.com/zerdos/spike-land-nextjs/issues/129",
        body: "## Feedback",
      },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: "BUG",
        message: longMessage,
        page: "/test",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(createIssue).toHaveBeenCalledWith({
      title: expect.stringContaining("..."),
      body: expect.stringContaining(longMessage),
      labels: expect.any(Array),
    });
  });

  it("should only include userAgent for BUG type", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    vi.mocked(createIssue).mockResolvedValue({
      data: {
        number: 130,
        title: "[Feature Request] Idea with user agent",
        state: "open",
        labels: ["user-feedback", "enhancement"],
        author: "github-actions[bot]",
        assignees: [],
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        url: "https://github.com/zerdos/spike-land-nextjs/issues/130",
        body: "## Feedback",
      },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: "IDEA",
        message: "Idea with user agent",
        page: "/test",
        userAgent: "Mozilla/5.0",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(createIssue).toHaveBeenCalledWith({
      title: expect.any(String),
      body: expect.not.stringContaining("Browser"),
      labels: expect.any(Array),
    });
  });
});
