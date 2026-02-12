import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
  Bot: () => <span data-testid="icon-bot" />,
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="icon-loader" className={className} />
  ),
  Zap: () => <span data-testid="icon-zap" />,
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="react-markdown">{children}</div>
  ),
}));

vi.mock("remark-gfm", () => ({
  default: {},
}));

import { StreamingContent } from "./streaming-content";

function createSSEStream(events: string[]): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(event));
      }
      controller.close();
    },
  });
}

/** Returns a fresh stream-bearing response on every call */
function mockFetchWithSSE(events: string[]) {
  (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
    Promise.resolve({
      ok: true,
      body: createSSEStream(events),
    }),
  );
}

describe("StreamingContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("shows loading spinner when no content", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<StreamingContent path={["react", "hooks"]} />);
    expect(screen.getByText("Generating tutorial content...")).toBeInTheDocument();
  });

  it("renders markdown-formatted content via ReactMarkdown", async () => {
    mockFetchWithSSE([
      'data: {"type":"chunk","content":"# Hello **World**"}\n\n',
      'data: {"type":"complete","content":"full","title":"Test","description":"desc"}\n\n',
    ]);

    render(<StreamingContent path={["react"]} />);

    await waitFor(() => {
      const markdown = screen.getByTestId("react-markdown");
      expect(markdown).toBeInTheDocument();
      expect(markdown.textContent).toContain("# Hello **World**");
    });
  });

  it("shows cursor during streaming", async () => {
    mockFetchWithSSE([
      'data: {"type":"chunk","content":"Content here"}\n\n',
    ]);

    render(<StreamingContent path={["react"]} />);

    await waitFor(() => {
      expect(screen.getByText("Content here")).toBeInTheDocument();
    });

    // Cursor should be visible during streaming
    const cursor = document.querySelector(".animate-pulse");
    expect(cursor).toBeInTheDocument();
  });

  it("shows error state with retry button", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error"),
    );

    render(<StreamingContent path={["react"]} />);

    await waitFor(() => {
      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("retries on Try Again click", async () => {
    const user = userEvent.setup();
    let callCount = 0;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        // First two calls fail (initial + possible strict mode double-fire)
        return Promise.reject(new Error("Network error"));
      }
      // Subsequent calls hang
      return new Promise(() => {});
    });

    render(<StreamingContent path={["react"]} />);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Try Again"));

    // Should have been called at least twice (initial failure + retry)
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it("calls router.refresh() on complete", async () => {
    vi.useFakeTimers();

    mockFetchWithSSE([
      'data: {"type":"chunk","content":"Done"}\n\n',
      'data: {"type":"complete","content":"full","title":"Test","description":"desc"}\n\n',
    ]);

    render(<StreamingContent path={["react"]} />);

    await vi.waitFor(() => {
      expect(screen.getByText("Done")).toBeInTheDocument();
    });

    vi.advanceTimersByTime(600);
    expect(mockRefresh).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("shows agent badge when agent event received", async () => {
    mockFetchWithSSE([
      'data: {"type":"agent","name":"Spike","model":"claude-3"}\n\n',
      'data: {"type":"chunk","content":"hello"}\n\n',
      'data: {"type":"complete","content":"full","title":"Test","description":"desc"}\n\n',
    ]);

    render(<StreamingContent path={["react"]} />);

    await waitFor(() => {
      expect(screen.getByText("Answered by Spike")).toBeInTheDocument();
    });
  });

  it("handles 429 rate limit", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 429,
    });

    render(<StreamingContent path={["react"]} />);

    await waitFor(() => {
      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
    });
  });
});
