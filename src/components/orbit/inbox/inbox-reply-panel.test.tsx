import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InboxReplyPanel } from "./inbox-reply-panel";

// Mock useParams
vi.mock("next/navigation", () => ({
  useParams: () => ({ workspaceSlug: "test-workspace" }),
}));

// Mock fetch
global.fetch = vi.fn();

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
  });

  it("renders the reply form correctly", () => {
    render(<InboxReplyPanel itemId="123" />, { wrapper: createWrapper() });
    expect(screen.getByLabelText("Reply")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type your reply here...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Reply" })).toBeInTheDocument();
  });

  it("submits the reply when form is submitted", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    render(<InboxReplyPanel itemId="123" />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText("Type your reply here...");
    const submitButton = screen.getByRole("button", { name: "Send Reply" });

    fireEvent.change(textarea, { target: { value: "Test reply" } });
    fireEvent.click(submitButton);

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
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "Server error",
    });
    global.fetch = mockFetch;

    render(<InboxReplyPanel itemId="123" />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText("Type your reply here...");
    const submitButton = screen.getByRole("button", { name: "Send Reply" });

    fireEvent.change(textarea, { target: { value: "Test reply" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it("clears the form after successful submission", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    render(<InboxReplyPanel itemId="123" />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText("Type your reply here...") as HTMLTextAreaElement;
    const submitButton = screen.getByRole("button", { name: "Send Reply" });

    fireEvent.change(textarea, { target: { value: "Test reply" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(textarea.value).toBe("");
    });
  });

  it("validates that content is not empty", async () => {
    render(<InboxReplyPanel itemId="123" />, { wrapper: createWrapper() });

    const submitButton = screen.getByRole("button", { name: "Send Reply" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Reply content cannot be empty")).toBeInTheDocument();
    });
  });
});
