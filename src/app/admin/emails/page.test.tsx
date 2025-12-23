/**
 * Tests for Email Logs Admin Page
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmailLogsPage from "./page";

const mockFetchResponse = (data: unknown, ok = true): Promise<Response> => {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
  } as Response);
};

const mockEmails = [
  {
    id: "cm123456789",
    to: "test@example.com",
    subject: "Welcome to Spike Land",
    template: "WELCOME",
    status: "SENT",
    resendId: "resend_123",
    sentAt: "2024-01-15T10:00:00.000Z",
    openedAt: null,
    clickedAt: null,
    bouncedAt: null,
    user: {
      id: "user_abc123",
      name: "Test User",
      email: "test@example.com",
    },
  },
  {
    id: "cm123456790",
    to: "opened@example.com",
    subject: "Token Purchase",
    template: "TOKEN_PURCHASE",
    status: "OPENED",
    resendId: "resend_456",
    sentAt: "2024-01-16T10:00:00.000Z",
    openedAt: "2024-01-16T12:00:00.000Z",
    clickedAt: null,
    bouncedAt: null,
    user: {
      id: "user_def456",
      name: "Another User",
      email: "another@example.com",
    },
  },
];

const mockResponse = {
  emails: mockEmails,
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
  },
  templates: ["WELCOME", "TOKEN_PURCHASE"],
};

describe("EmailLogsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    global.alert = vi.fn();
  });

  it("should render the page title and description", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse(mockResponse),
    );

    render(<EmailLogsPage />);

    expect(screen.getByText("Email Logs")).toBeInTheDocument();
    expect(
      screen.getByText("View and search all sent emails"),
    ).toBeInTheDocument();
  });

  it("should render the send test email section", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse(mockResponse),
    );

    render(<EmailLogsPage />);

    expect(screen.getByText("Send Test Email")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("recipient@example.com"),
    ).toBeInTheDocument();
    expect(screen.getByText("Send Test")).toBeInTheDocument();
  });

  it("should render search and filter controls", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse(mockResponse),
    );

    render(<EmailLogsPage />);

    expect(
      screen.getByPlaceholderText("Search by email or subject..."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  it("should display emails in the table", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse(mockResponse),
    );

    render(<EmailLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    expect(screen.getByText("Welcome to Spike Land")).toBeInTheDocument();
    // WELCOME appears in both the template badge and filter dropdown
    expect(screen.getAllByText("WELCOME").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SENT").length).toBeGreaterThan(0);
  });

  it("should display no emails message when list is empty", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({
        emails: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        templates: [],
      }),
    );

    render(<EmailLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("No emails found")).toBeInTheDocument();
    });
  });

  it("should display loading state", async () => {
    vi.mocked(global.fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve(mockFetchResponse(mockResponse) as Response),
            100,
          )
        ),
    );

    render(<EmailLogsPage />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should display error message on fetch failure", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(mockFetchResponse({}, false));

    render(<EmailLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch emails")).toBeInTheDocument();
    });
  });

  it("should search emails when search button is clicked", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(mockFetchResponse(mockResponse))
      .mockResolvedValueOnce(
        mockFetchResponse({
          emails: [mockEmails[0]],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          templates: ["WELCOME"],
        }),
      );

    render(<EmailLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search by email or subject...",
    );
    fireEvent.change(searchInput, { target: { value: "test" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("search=test"),
      );
    });
  });

  it("should clear filters when clear button is clicked", async () => {
    vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse(mockResponse));

    render(<EmailLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search by email or subject...",
    );
    fireEvent.change(searchInput, { target: { value: "test" } });

    // Wait for clear button to appear
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
    });

    const clearButton = screen.getByRole("button", { name: "Clear" });
    fireEvent.click(clearButton);

    expect(searchInput).toHaveValue("");
  });

  it("should send test email successfully", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(mockFetchResponse(mockResponse))
      .mockResolvedValueOnce(
        mockFetchResponse({ success: true, emailId: "test_email_123" }),
      )
      .mockResolvedValueOnce(mockFetchResponse(mockResponse));

    render(<EmailLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText("recipient@example.com");
    fireEvent.change(emailInput, { target: { value: "new@example.com" } });
    fireEvent.click(screen.getByText("Send Test"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendTestEmail",
          to: "new@example.com",
        }),
      });
    });

    expect(global.alert).toHaveBeenCalledWith(
      "Test email sent successfully! ID: test_email_123",
    );
  });

  it("should disable send test button when email is empty", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse(mockResponse),
    );

    render(<EmailLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    // Send Test button should be disabled when email input is empty
    const sendButton = screen.getByText("Send Test");
    expect(sendButton).toBeDisabled();
  });

  it("should show error alert when test email fails", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(mockFetchResponse(mockResponse))
      .mockResolvedValueOnce(
        mockFetchResponse({ error: "Rate limit exceeded" }, false),
      );

    render(<EmailLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText("recipient@example.com");
    fireEvent.change(emailInput, { target: { value: "new@example.com" } });
    fireEvent.click(screen.getByText("Send Test"));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Rate limit exceeded");
    });
  });

  it("should open email details modal when clicking details button", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse(mockResponse),
    );

    render(<EmailLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    const detailsButtons = screen.getAllByRole("button", { name: "Details" });
    fireEvent.click(detailsButtons[0]);

    expect(screen.getByText("Email Details")).toBeInTheDocument();
    expect(screen.getByText("resend_123")).toBeInTheDocument();
  });

  it("should close email details modal when clicking close button", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse(mockResponse),
    );

    render(<EmailLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    const detailsButtons = screen.getAllByRole("button", { name: "Details" });
    fireEvent.click(detailsButtons[0]);

    expect(screen.getByText("Email Details")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByText("Email Details")).not.toBeInTheDocument();
    });
  });

  it("should close modal when clicking backdrop", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse(mockResponse),
    );

    render(<EmailLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    const detailsButtons = screen.getAllByRole("button", { name: "Details" });
    fireEvent.click(detailsButtons[0]);

    expect(screen.getByText("Email Details")).toBeInTheDocument();

    // Click backdrop (the fixed overlay div)
    const backdrop = document.querySelector(".fixed.inset-0");
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    await waitFor(() => {
      expect(screen.queryByText("Email Details")).not.toBeInTheDocument();
    });
  });

  it("should display total emails count", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse(mockResponse),
    );

    render(<EmailLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Total: 2 emails")).toBeInTheDocument();
    });
  });

  it("should display status badges with correct colors", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse(mockResponse),
    );

    render(<EmailLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("SENT")).toBeInTheDocument();
      expect(screen.getByText("OPENED")).toBeInTheDocument();
    });
  });

  it("should navigate pages when pagination buttons clicked", async () => {
    const paginatedResponse = {
      emails: mockEmails,
      pagination: {
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
      },
      templates: ["WELCOME", "TOKEN_PURCHASE"],
    };

    vi.mocked(global.fetch)
      .mockResolvedValueOnce(mockFetchResponse(paginatedResponse))
      .mockResolvedValueOnce(
        mockFetchResponse({
          ...paginatedResponse,
          pagination: { ...paginatedResponse.pagination, page: 2 },
        }),
      );

    render(<EmailLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
      );
    });
  });

  it("should disable previous button on first page", async () => {
    const paginatedResponse = {
      emails: mockEmails,
      pagination: {
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
      },
      templates: [],
    };

    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse(paginatedResponse),
    );

    render(<EmailLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();
  });
});
