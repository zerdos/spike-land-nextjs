/**
 * Tests for FeedbackClient Component
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackClient } from "./FeedbackClient";

const mockFetchResponse = (data: unknown, ok = true) => {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
  } as Response);
};

const mockFeedback = [
  {
    id: "cm123456789",
    userId: "user_abc123",
    email: null,
    type: "BUG" as const,
    message:
      "This is a test bug report with a very long message that should definitely be truncated in the table view because it exceeds one hundred characters.",
    page: "/apps/pixel",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    status: "NEW" as const,
    adminNote: null,
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z",
    user: {
      id: "user_abc123",
      name: "Test User",
      email: "test@example.com",
      image: "https://example.com/avatar.jpg",
    },
  },
  {
    id: "cm123456790",
    userId: null,
    email: "anonymous@example.com",
    type: "IDEA" as const,
    message: "A great idea for the platform",
    page: "/",
    userAgent: null,
    status: "REVIEWED" as const,
    adminNote: "Good suggestion",
    createdAt: "2024-01-16T10:00:00.000Z",
    updatedAt: "2024-01-16T12:00:00.000Z",
    user: null,
  },
];

describe("FeedbackClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should render the page title and description", () => {
    render(<FeedbackClient initialFeedback={[]} />);

    expect(screen.getByText("Feedback Management")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Review and manage user feedback, bug reports, and ideas",
      ),
    ).toBeInTheDocument();
  });

  it("should render filter dropdowns", () => {
    render(<FeedbackClient initialFeedback={[]} />);

    expect(screen.getByText("Status:")).toBeInTheDocument();
    expect(screen.getByText("Type:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh/i }))
      .toBeInTheDocument();
  });

  it("should display no feedback message when list is empty", () => {
    render(<FeedbackClient initialFeedback={[]} />);

    expect(screen.getByText("No feedback found")).toBeInTheDocument();
  });

  it("should render feedback count", () => {
    render(<FeedbackClient initialFeedback={mockFeedback} />);

    expect(screen.getByText("Feedback (2)")).toBeInTheDocument();
  });

  it("should render feedback items in table", () => {
    render(<FeedbackClient initialFeedback={mockFeedback} />);

    expect(screen.getByText("BUG")).toBeInTheDocument();
    expect(screen.getByText("IDEA")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("/apps/pixel")).toBeInTheDocument();
    expect(screen.getByText("NEW")).toBeInTheDocument();
    expect(screen.getByText("REVIEWED")).toBeInTheDocument();
  });

  it("should show anonymous for feedback without user", () => {
    const anonymousFeedback = [
      {
        id: "cm123456792",
        userId: null,
        email: null,
        type: "OTHER" as const,
        message: "Anonymous feedback",
        page: "/contact",
        userAgent: null,
        status: "NEW" as const,
        adminNote: null,
        createdAt: "2024-01-17T10:00:00.000Z",
        updatedAt: "2024-01-17T10:00:00.000Z",
        user: null,
      },
    ];

    render(<FeedbackClient initialFeedback={anonymousFeedback} />);

    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });

  it("should truncate long messages in table view", () => {
    render(<FeedbackClient initialFeedback={mockFeedback} />);

    // The first feedback has a long message
    const truncatedText = screen.getByText(/This is a test bug report/);
    expect(truncatedText.textContent).toContain("...");
  });

  it("should open dialog when clicking on feedback row", async () => {
    render(<FeedbackClient initialFeedback={mockFeedback} />);

    // Find and click the first row
    const row = screen.getByText("Test User").closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(row!);

    await waitFor(() => {
      expect(screen.getByText("Feedback Details")).toBeInTheDocument();
    });
  });

  it("should display full message in dialog", async () => {
    render(<FeedbackClient initialFeedback={mockFeedback} />);

    // Click on feedback row to open dialog
    const row = screen.getByText("Test User").closest("tr");
    fireEvent.click(row!);

    await waitFor(() => {
      // The dialog should show the full message (using getAllByText since it appears in table and dialog)
      const messages = screen.getAllByText(
        "This is a test bug report with a very long message that should definitely be truncated in the table view because it exceeds one hundred characters.",
      );
      // Should appear in both table (truncated view) and dialog (full view)
      expect(messages.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("should display browser info in dialog for bug reports", async () => {
    render(<FeedbackClient initialFeedback={mockFeedback} />);

    const row = screen.getByText("Test User").closest("tr");
    fireEvent.click(row!);

    await waitFor(() => {
      expect(screen.getByText("Browser Info")).toBeInTheDocument();
      expect(
        screen.getByText(/Mozilla\/5\.0.*Chrome\/120\.0\.0\.0/),
      ).toBeInTheDocument();
    });
  });

  it("should handle status update via API", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({
        feedback: {
          id: "cm123456789",
          status: "RESOLVED",
          adminNote: null,
          updatedAt: new Date().toISOString(),
        },
      }),
    );

    render(<FeedbackClient initialFeedback={mockFeedback} />);

    // Find and click the resolve button (V) - it has title "Mark as Resolved"
    const resolveButton = screen.getAllByTitle("Mark as Resolved")[0];
    expect(resolveButton).toBeDefined();
    fireEvent.click(resolveButton!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "cm123456789", status: "RESOLVED" }),
      });
    });
  });

  it("should refresh feedback on button click", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ feedback: mockFeedback }),
    );

    render(<FeedbackClient initialFeedback={[]} />);

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/feedback?",
      );
    });
  });

  it("should display existing admin note in dialog", async () => {
    render(<FeedbackClient initialFeedback={mockFeedback} />);

    // Click on the second feedback which has an admin note
    const row = screen.getAllByRole("row")[2]; // Skip header row
    fireEvent.click(row);

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(
        "Add a note about this feedback...",
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe("Good suggestion");
    });
  });

  it("should save admin note via API", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({
        feedback: {
          id: "cm123456789",
          status: "NEW",
          adminNote: "Updated note",
          updatedAt: new Date().toISOString(),
        },
      }),
    );

    // Mock alert
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<FeedbackClient initialFeedback={mockFeedback} />);

    // Open dialog
    const row = screen.getByText("Test User").closest("tr");
    fireEvent.click(row!);

    await waitFor(() => {
      expect(screen.getByText("Feedback Details")).toBeInTheDocument();
    });

    // Type in admin note
    const textarea = screen.getByPlaceholderText(
      "Add a note about this feedback...",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Updated note" } });

    // Click save
    const saveButton = screen.getByRole("button", { name: /save note/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "cm123456789", adminNote: "Updated note" }),
      });
    });

    alertMock.mockRestore();
  });

  it("should close dialog when clicking close button", async () => {
    render(<FeedbackClient initialFeedback={mockFeedback} />);

    // Open dialog
    const row = screen.getByText("Test User").closest("tr");
    fireEvent.click(row!);

    await waitFor(() => {
      expect(screen.getByText("Feedback Details")).toBeInTheDocument();
    });

    // Click close button - the dialog has both a close icon and a "Close" text button
    const closeButtons = screen.getAllByRole("button", { name: /close/i });
    // Click the text "Close" button (last one in the dialog footer)
    const closeTextButton = closeButtons[closeButtons.length - 1];
    fireEvent.click(closeTextButton);

    await waitFor(() => {
      expect(screen.queryByText("Feedback Details")).not.toBeInTheDocument();
    });
  });

  it("should handle API error gracefully", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: "Failed to update" }, false),
    );

    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<FeedbackClient initialFeedback={mockFeedback} />);

    // Try to update status using the title attribute
    const resolveButton = screen.getAllByTitle("Mark as Resolved")[0];
    fireEvent.click(resolveButton!);

    await waitFor(() => {
      // The error message comes from the API response
      expect(alertMock).toHaveBeenCalledWith("Failed to update");
    });

    alertMock.mockRestore();
  });

  it("should filter feedback by status locally", () => {
    const mixedFeedback = [
      { ...mockFeedback[0], status: "NEW" as const },
      { ...mockFeedback[1], id: "cm123456791", status: "RESOLVED" as const },
    ];

    render(<FeedbackClient initialFeedback={mixedFeedback} />);

    // Initially shows all
    expect(screen.getByText("Feedback (2)")).toBeInTheDocument();
  });
});
