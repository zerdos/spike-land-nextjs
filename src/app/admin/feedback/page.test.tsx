/**
 * Tests for Admin Feedback Page
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminFeedbackPage from "./page";

vi.mock("@/lib/prisma", () => ({
  default: {
    feedback: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("./FeedbackClient", () => ({
  FeedbackClient: ({ initialFeedback }: { initialFeedback: unknown[]; }) => (
    <div data-testid="feedback-client">
      <span data-testid="feedback-count">{initialFeedback.length}</span>
      <span data-testid="feedback-data">{JSON.stringify(initialFeedback)}</span>
    </div>
  ),
}));

const { default: prisma } = await import("@/lib/prisma");

describe("AdminFeedbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render FeedbackClient with feedback data", async () => {
    const mockFeedback = [
      {
        id: "cm123456789",
        userId: "user_abc123",
        email: null,
        type: "BUG",
        message: "Test bug report",
        page: "/apps/images",
        userAgent: "Mozilla/5.0",
        status: "NEW",
        adminNote: null,
        createdAt: new Date("2024-01-15T10:00:00Z"),
        updatedAt: new Date("2024-01-15T10:00:00Z"),
        user: {
          id: "user_abc123",
          name: "Test User",
          email: "test@example.com",
          image: null,
        },
      },
    ];

    vi.mocked(prisma.feedback.findMany).mockResolvedValueOnce(mockFeedback);

    const result = await AdminFeedbackPage();
    render(result);

    expect(screen.getByTestId("feedback-client")).toBeInTheDocument();
    expect(screen.getByTestId("feedback-count")).toHaveTextContent("1");

    const feedbackData = JSON.parse(
      screen.getByTestId("feedback-data").textContent || "[]",
    );
    expect(feedbackData[0].id).toBe("cm123456789");
    expect(feedbackData[0].type).toBe("BUG");
    expect(feedbackData[0].message).toBe("Test bug report");
    expect(feedbackData[0].status).toBe("NEW");
    expect(feedbackData[0].user.name).toBe("Test User");
  });

  it("should render with empty feedback list", async () => {
    vi.mocked(prisma.feedback.findMany).mockResolvedValueOnce([]);

    const result = await AdminFeedbackPage();
    render(result);

    expect(screen.getByTestId("feedback-client")).toBeInTheDocument();
    expect(screen.getByTestId("feedback-count")).toHaveTextContent("0");
  });

  it("should handle feedback without user", async () => {
    const mockFeedback = [
      {
        id: "cm123456790",
        userId: null,
        email: "anonymous@example.com",
        type: "IDEA",
        message: "Great idea",
        page: "/",
        userAgent: null,
        status: "REVIEWED",
        adminNote: "Good suggestion",
        createdAt: new Date("2024-01-16T10:00:00Z"),
        updatedAt: new Date("2024-01-16T12:00:00Z"),
        user: null,
      },
    ];

    vi.mocked(prisma.feedback.findMany).mockResolvedValueOnce(mockFeedback);

    const result = await AdminFeedbackPage();
    render(result);

    const feedbackData = JSON.parse(
      screen.getByTestId("feedback-data").textContent || "[]",
    );
    expect(feedbackData[0].user).toBeNull();
    expect(feedbackData[0].email).toBe("anonymous@example.com");
    expect(feedbackData[0].adminNote).toBe("Good suggestion");
  });

  it("should convert dates to ISO strings", async () => {
    const createdAt = new Date("2024-01-15T10:00:00Z");
    const updatedAt = new Date("2024-01-15T12:00:00Z");

    const mockFeedback = [
      {
        id: "cm123456791",
        userId: null,
        email: "test@example.com",
        type: "OTHER",
        message: "Other feedback",
        page: "/contact",
        userAgent: null,
        status: "RESOLVED",
        adminNote: null,
        createdAt,
        updatedAt,
        user: null,
      },
    ];

    vi.mocked(prisma.feedback.findMany).mockResolvedValueOnce(mockFeedback);

    const result = await AdminFeedbackPage();
    render(result);

    const feedbackData = JSON.parse(
      screen.getByTestId("feedback-data").textContent || "[]",
    );
    expect(feedbackData[0].createdAt).toBe(createdAt.toISOString());
    expect(feedbackData[0].updatedAt).toBe(updatedAt.toISOString());
  });
});
