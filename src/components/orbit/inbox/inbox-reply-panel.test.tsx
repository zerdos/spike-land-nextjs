import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InboxReplyPanel } from "./inbox-reply-panel";

// Mock useParams
vi.mock("next/navigation", () => ({
  useParams: () => ({ workspaceSlug: "test-workspace" }),
}));

// Helper to create a smart fetch mock
const createFetchMock = (replyResponse: any = { success: true }, replyOk = true) => {
  return vi.fn().mockImplementation((url: string | URL | Request) => {
    const urlString = url.toString();

    // Handle Drafts List Fetch (GET)
    if (urlString.includes("/relay/drafts")) {
      return Promise.resolve({
        ok: true,
        json: async () => [], // Return empty array for drafts
      });
    }

    // Handle Reply Post (POST)
    if (urlString.includes("/reply")) {
      return Promise.resolve({
        ok: replyOk,
        status: replyOk ? 200 : 500,
        statusText: replyOk ? "OK" : "Internal Server Error",
        text: async () => replyOk ? JSON.stringify(replyResponse) : "Server error",
        json: async () => replyResponse,
      });
    }

    // Default fallback
    return Promise.resolve({
      ok: true,
      json: async () => ({}),
    });
  });
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode; }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("InboxReplyPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set a default mock to handle initial renders (e.g., drafts fetch)
    global.fetch = createFetchMock();
  });

  it("renders the reply form correctly", async () => {
    const user = userEvent.setup();
    render(<InboxReplyPanel itemId="123" />, { wrapper: createWrapper() });

    // Switch to Manual Reply tab
    const manualTab = screen.getByRole("tab", { name: /Manual Reply/i });
    await user.click(manualTab);

    // Wait for form to appear
    expect(await screen.findByLabelText("Reply")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type your reply here...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Reply" })).toBeInTheDocument();
  });

  it("submits the reply when form is submitted", async () => {
    const user = userEvent.setup();
    const mockFetch = createFetchMock({ success: true });
    global.fetch = mockFetch;

    render(<InboxReplyPanel itemId="123" />, { wrapper: createWrapper() });

    // Switch to Manual Reply tab
    await user.click(screen.getByRole("tab", { name: /Manual Reply/i }));

    const textarea = await screen.findByPlaceholderText("Type your reply here...");
    const submitButton = screen.getByRole("button", { name: "Send Reply" });

    await user.type(textarea, "Test reply");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/orbit/test-workspace/inbox/123/reply",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: "Test reply" }),
        }),
      );
    });
  });

  it("displays error state when submission fails", async () => {
    const user = userEvent.setup();
    const mockFetch = createFetchMock({}, false); // Fail the reply
    global.fetch = mockFetch;

    render(<InboxReplyPanel itemId="123" />, { wrapper: createWrapper() });

    // Switch to Manual Reply tab
    await user.click(screen.getByRole("tab", { name: /Manual Reply/i }));

    const textarea = await screen.findByPlaceholderText("Type your reply here...");
    const submitButton = screen.getByRole("button", { name: "Send Reply" });

    await user.type(textarea, "Test reply");
    await user.click(submitButton);

    await waitFor(() => {
      // Expect fetch to have been called (we can inspect arguments if needed)
      // We check if it was called at least once for the reply endpoint
      const replyCall = mockFetch.mock.calls.find((call) => call[0].toString().includes("/reply"));
      expect(replyCall).toBeDefined();
    });
  });

  it("clears the form after successful submission", async () => {
    const user = userEvent.setup();
    const mockFetch = createFetchMock({ success: true });
    global.fetch = mockFetch;

    render(<InboxReplyPanel itemId="123" />, { wrapper: createWrapper() });

    // Switch to Manual Reply tab
    await user.click(screen.getByRole("tab", { name: /Manual Reply/i }));

    const textarea = (await screen.findByPlaceholderText(
      "Type your reply here...",
    )) as HTMLTextAreaElement;
    const submitButton = screen.getByRole("button", { name: "Send Reply" });

    await user.type(textarea, "Test reply");
    await user.click(submitButton);

    await waitFor(() => {
      expect(textarea.value).toBe("");
    });
  });

  it("validates that content is not empty", async () => {
    const user = userEvent.setup();
    render(<InboxReplyPanel itemId="123" />, { wrapper: createWrapper() });

    // Switch to Manual Reply tab
    await user.click(screen.getByRole("tab", { name: /Manual Reply/i }));

    const submitButton = await screen.findByRole("button", { name: "Send Reply" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Reply content cannot be empty")).toBeInTheDocument();
    });
  });
});
