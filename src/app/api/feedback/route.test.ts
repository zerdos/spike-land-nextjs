import type { Feedback } from "@prisma/client";
import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    feedback: {
      create: vi.fn(),
    },
  },
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create feedback with valid data for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockFeedback: Feedback = {
      id: "feedback-1",
      userId: "user-1",
      email: null,
      type: "BUG",
      message: "This is a bug report",
      page: "/test-page",
      userAgent: "Mozilla/5.0",
      status: "NEW",
      adminNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.feedback.create).mockResolvedValue(mockFeedback);

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
    expect(data).toEqual({ success: true, id: "feedback-1" });
    expect(prisma.feedback.create).toHaveBeenCalledWith({
      data: {
        type: "BUG",
        message: "This is a bug report",
        page: "/test-page",
        userId: "user-1",
        email: null,
        userAgent: "Mozilla/5.0",
      },
    });
  });

  it("should create feedback for anonymous users", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const mockFeedback: Feedback = {
      id: "feedback-2",
      userId: null,
      email: "anon@example.com",
      type: "IDEA",
      message: "Great idea for a feature",
      page: "/features",
      userAgent: null,
      status: "NEW",
      adminNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.feedback.create).mockResolvedValue(mockFeedback);

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
    expect(data).toEqual({ success: true, id: "feedback-2" });
    expect(prisma.feedback.create).toHaveBeenCalledWith({
      data: {
        type: "IDEA",
        message: "Great idea for a feature",
        page: "/features",
        userId: null,
        email: "anon@example.com",
        userAgent: null,
      },
    });
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
    expect(data.error).toBe("Invalid feedback type. Must be one of: BUG, IDEA, OTHER");
    expect(prisma.feedback.create).not.toHaveBeenCalled();
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
    expect(prisma.feedback.create).not.toHaveBeenCalled();
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
    expect(prisma.feedback.create).not.toHaveBeenCalled();
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
    expect(prisma.feedback.create).not.toHaveBeenCalled();
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
    expect(prisma.feedback.create).not.toHaveBeenCalled();
  });

  it("should attach userId when user is authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", email: "authenticated@example.com" },
      expires: "2025-12-31",
    } as Session);

    const mockFeedback: Feedback = {
      id: "feedback-3",
      userId: "user-123",
      email: null,
      type: "OTHER",
      message: "Other type of feedback",
      page: "/other-page",
      userAgent: null,
      status: "NEW",
      adminNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.feedback.create).mockResolvedValue(mockFeedback);

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: "OTHER",
        message: "Other type of feedback",
        page: "/other-page",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual({ success: true, id: "feedback-3" });
    expect(prisma.feedback.create).toHaveBeenCalledWith({
      data: {
        type: "OTHER",
        message: "Other type of feedback",
        page: "/other-page",
        userId: "user-123",
        email: null,
        userAgent: null,
      },
    });
  });

  it("should return 500 on database failure", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    vi.mocked(prisma.feedback.create).mockRejectedValue(
      new Error("Database connection error"),
    );

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
    expect(data.error).toBe("Internal server error");
  });

  it("should trim whitespace from message and page", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const mockFeedback: Feedback = {
      id: "feedback-4",
      userId: null,
      email: null,
      type: "BUG",
      message: "Trimmed message",
      page: "/trimmed-page",
      userAgent: null,
      status: "NEW",
      adminNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.feedback.create).mockResolvedValue(mockFeedback);

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
    expect(prisma.feedback.create).toHaveBeenCalledWith({
      data: {
        type: "BUG",
        message: "Trimmed message",
        page: "/trimmed-page",
        userId: null,
        email: null,
        userAgent: null,
      },
    });
  });

  it("should handle all valid feedback types (BUG, IDEA, OTHER)", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const feedbackTypes = ["BUG", "IDEA", "OTHER"];

    for (const type of feedbackTypes) {
      const mockFeedback: Feedback = {
        id: `feedback-${type}`,
        userId: null,
        email: null,
        type: type as "BUG" | "IDEA" | "OTHER",
        message: `${type} message`,
        page: "/test",
        userAgent: null,
        status: "NEW",
        adminNote: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.feedback.create).mockResolvedValue(mockFeedback);

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
    }
  });

  it("should handle optional email and userAgent fields", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const mockFeedback: Feedback = {
      id: "feedback-5",
      userId: null,
      email: "optional@example.com",
      type: "IDEA",
      message: "Message with optional fields",
      page: "/test",
      userAgent: "Custom User Agent",
      status: "NEW",
      adminNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.feedback.create).mockResolvedValue(mockFeedback);

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: "IDEA",
        message: "Message with optional fields",
        page: "/test",
        email: "  optional@example.com  ",
        userAgent: "  Custom User Agent  ",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(prisma.feedback.create).toHaveBeenCalledWith({
      data: {
        type: "IDEA",
        message: "Message with optional fields",
        page: "/test",
        userId: null,
        email: "optional@example.com",
        userAgent: "Custom User Agent",
      },
    });
  });
});
