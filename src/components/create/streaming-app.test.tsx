import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockRouter = {
  refresh: vi.fn(),
  push: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("lucide-react", () => ({
  Check: () => null,
  ExternalLink: () => null,
  Loader2: () => null,
}));

const mockRedirectToSignIn = vi.fn();
vi.mock("@/hooks/useAuthRedirect", () => ({
  useAuthRedirect: () => ({ redirectToSignIn: mockRedirectToSignIn }),
}));

const fetchMock = vi.fn();

function createSSEResponse(events: Record<string, unknown>[]) {
  const data = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(data));
      controller.close();
    },
  });
  return {
    ok: true,
    body: stream,
  };
}

describe("StreamingApp", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    mockRedirectToSignIn.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders building state initially", async () => {
    const { StreamingApp } = await import("./streaming-app");

    let resolveProm: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolveProm = resolve;
    });

    fetchMock.mockReturnValue(promise);

    render(<StreamingApp path={["test", "app"]} />);

    expect(screen.getByText("Building your app...")).toBeInTheDocument();

    // cleanup - resolve the pending fetch
    resolveProm!({
      ok: true,
      body: {
        getReader: () => ({
          read: async () => ({ done: true, value: undefined }),
        }),
      },
    });
    // Allow effect to process
    await waitFor(() => {}, { timeout: 0 });
  });

  it("shows error when fetch fails", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockRejectedValue(new Error("Network error"));

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
    });
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("redirects to sign-in when unauthorized", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(mockRedirectToSignIn).toHaveBeenCalled();
    });
  });

  it("displays phase event message in build log", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        { type: "phase", phase: "PLANNING", message: "Analyzing requirements..." },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Analyzing requirements...")).toBeInTheDocument();
    });
  });

  it("displays status event message in build log", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        { type: "status", message: "Preparing workspace..." },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Preparing workspace...")).toBeInTheDocument();
    });
  });

  it("displays agent model badge when agent event is received", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        { type: "agent", name: "CodeAgent", model: "claude-opus-4" },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("claude-opus-4")).toBeInTheDocument();
    });
    expect(screen.getByText("Using CodeAgent (claude-opus-4)")).toBeInTheDocument();
  });

  it("displays code generated message in build log", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        { type: "code_generated", codePreview: "const App = () => <div />" },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Code generated successfully")).toBeInTheDocument();
    });
  });

  it("displays error detected message in build log", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        { type: "phase", phase: "FIXING", message: "Fixing errors..." },
        { type: "error_detected", error: "TypeError: undefined is not a function", iteration: 0 },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(
        screen.getByText("Error detected: TypeError: undefined is not a function"),
      ).toBeInTheDocument();
    });
  });

  it("displays error fixed message in build log", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        { type: "phase", phase: "FIXING", message: "Fixing errors..." },
        { type: "error_fixed", iteration: 0 },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Error fixed (attempt 1)")).toBeInTheDocument();
    });
  });

  it("displays learning note in build log", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        { type: "learning", notePreview: "Learned: prefer named exports over default" },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(
        screen.getByText("Learned: prefer named exports over default"),
      ).toBeInTheDocument();
    });
  });

  it("calls router.refresh on complete event", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        {
          type: "complete",
          slug: "my-app",
          url: "/apps/my-app",
          title: "My App",
          description: "A test app",
          relatedApps: [],
        },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Complete! Loading app...")).toBeInTheDocument();
    });

    // The component calls router.refresh() after a 1500ms timeout
    vi.advanceTimersByTime(1600);

    await waitFor(() => {
      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    vi.useRealTimers();
  });

  it("shows Generation Failed UI with error message on error event", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        { type: "error", message: "Build failed: syntax error in generated code" },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Build failed: syntax error in generated code"),
    ).toBeInTheDocument();
  });

  it("shows 'View generated code' link when error event includes codespaceUrl", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        {
          type: "error",
          message: "Transpile failed",
          codespaceUrl: "https://spike.land/codespace/my-app",
        },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: /View generated code/i });
    expect(link).toHaveAttribute("href", "https://spike.land/codespace/my-app");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("does not show connection warning when heartbeat events arrive", async () => {
    const { StreamingApp } = await import("./streaming-app");

    // Create a stream that sends a heartbeat and then stays open briefly
    let resolveReader: (v: { done: boolean; value?: Uint8Array }) => void;
    const encoder = new TextEncoder();
    const heartbeatData = `data: ${JSON.stringify({ type: "heartbeat", timestamp: Date.now() })}\n\n`;

    fetchMock.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: encoder.encode(heartbeatData),
            })
            .mockImplementation(
              () =>
                new Promise((resolve) => {
                  resolveReader = resolve;
                }),
            ),
        }),
      },
    });

    render(<StreamingApp path={["test", "app"]} />);

    // Wait for the heartbeat to be processed
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // Connection warning text should not appear
    expect(screen.queryByText(/Connection may be lost/)).not.toBeInTheDocument();

    // Cleanup: close the stream
    resolveReader!({ done: true });
    await waitFor(() => {}, { timeout: 50 });
  });

  it("shows error UI with timeout message on timeout event", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        { type: "timeout", message: "Generation timed out after 120s" },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
    });
    expect(screen.getByText("Generation timed out after 120s")).toBeInTheDocument();
  });

  it("shows rate limit error on 429 response", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Rate limit reached. Please try again later or sign in for more."),
    ).toBeInTheDocument();
  });

  it("shows toast and starts polling on 202 already-generating response", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { toast } = await import("sonner");
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue({
      ok: false,
      status: 202,
      statusText: "Accepted",
    });

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith("App is already being generated. Waiting...");
    });

    // The component starts a 3s polling interval calling router.refresh
    vi.advanceTimersByTime(3100);

    await waitFor(() => {
      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    vi.useRealTimers();
  });

  it("shows connection warning after 30s without events", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { StreamingApp } = await import("./streaming-app");

    // Create a stream that sends one event then hangs
    const encoder = new TextEncoder();
    const statusData = `data: ${JSON.stringify({ type: "status", message: "Starting..." })}\n\n`;
    let resolveReader: (v: { done: boolean; value?: Uint8Array }) => void;

    fetchMock.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: encoder.encode(statusData),
            })
            .mockImplementation(
              () =>
                new Promise((resolve) => {
                  resolveReader = resolve;
                }),
            ),
        }),
      },
    });

    render(<StreamingApp path={["test", "app"]} />);

    // Wait for the initial status message to be processed
    await waitFor(() => {
      expect(screen.getByText("Starting...")).toBeInTheDocument();
    });

    // Advance past the 30s stale threshold (checked every 5s)
    vi.advanceTimersByTime(35_000);

    await waitFor(() => {
      expect(screen.getByText(/Connection may be lost/)).toBeInTheDocument();
    });

    // Cleanup
    resolveReader!({ done: true });
    await waitFor(() => {}, { timeout: 50 });
    vi.useRealTimers();
  });

  it("shows 'Request timed out' when fetch is aborted", async () => {
    const { StreamingApp } = await import("./streaming-app");

    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    fetchMock.mockRejectedValue(abortError);

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
    });
    expect(screen.getByText("Request timed out")).toBeInTheDocument();
  });

  it("restarts streaming when Try Again button is clicked", async () => {
    const user = userEvent.setup();
    const { StreamingApp } = await import("./streaming-app");

    // First call: error
    fetchMock.mockRejectedValueOnce(new Error("Server error"));

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
    });

    // Set up the second call to succeed
    fetchMock.mockResolvedValueOnce(
      createSSEResponse([{ type: "status", message: "Retry successful" }]),
    );

    await user.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(screen.getByText("Retry successful")).toBeInTheDocument();
    });
    // fetch should have been called twice total
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("updates progress percentage as phases progress", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        { type: "phase", phase: "GENERATING", message: "Generating code..." },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("30%")).toBeInTheDocument();
    });
  });

  it("shows increasing progress through PLANNING, GENERATING, TRANSPILING phases", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        { type: "phase", phase: "PLANNING", message: "Planning..." },
        { type: "phase", phase: "GENERATING", message: "Generating..." },
        { type: "phase", phase: "TRANSPILING", message: "Transpiling..." },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    // After all three phases are processed the final phase (TRANSPILING=60%) should be visible
    await waitFor(() => {
      expect(screen.getByText("60%")).toBeInTheDocument();
    });

    // All phase messages should be present in the build log
    expect(screen.getByText("Planning...")).toBeInTheDocument();
    expect(screen.getByText("Generating...")).toBeInTheDocument();
    expect(screen.getByText("Transpiling...")).toBeInTheDocument();
  });

  it("displays attempt number during FIXING phase with iteration", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        { type: "phase", phase: "FIXING", message: "Fixing errors...", iteration: 2 },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("FIXING")).toBeInTheDocument();
    });
    expect(screen.getByText("(attempt 3)")).toBeInTheDocument();
  });

  it("shows timeout event with codespaceUrl link", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        {
          type: "timeout",
          message: "Generation timed out",
          codespaceUrl: "https://spike.land/codespace/timeout-app",
        },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
    });
    expect(screen.getByText("Generation timed out")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /View generated code/i });
    expect(link).toHaveAttribute("href", "https://spike.land/codespace/timeout-app");
  });

  it("shows Ready! text when complete event is received", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        {
          type: "complete",
          slug: "my-app",
          url: "/apps/my-app",
          title: "My App",
          description: "A test app",
          relatedApps: [],
        },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Ready!")).toBeInTheDocument();
    });
  });

  it("shows 100% progress on complete event", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        {
          type: "complete",
          slug: "done",
          url: "/apps/done",
          title: "Done",
          description: "Complete",
          relatedApps: [],
        },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  it("calls toast.error when an error event is received", async () => {
    const { toast } = await import("sonner");
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createSSEResponse([
        { type: "error", message: "Internal server error" },
      ]),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Generation failed: Internal server error");
    });
  });

  it("renders path in the description text", async () => {
    const { StreamingApp } = await import("./streaming-app");

    let resolveP: (v: any) => void;
    fetchMock.mockReturnValue(new Promise((r) => { resolveP = r; }));

    render(<StreamingApp path={["my", "cool", "app"]} />);

    expect(screen.getByText("/my/cool/app")).toBeInTheDocument();

    // Cleanup
    resolveP!({
      ok: true,
      body: {
        getReader: () => ({
          read: async () => ({ done: true, value: undefined }),
        }),
      },
    });
    await waitFor(() => {}, { timeout: 0 });
  });

  it("throws generic HTTP error for non-special status codes", async () => {
    const { toast } = await import("sonner");
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
    });
    expect(screen.getByText("HTTP error: 500")).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("HTTP error: 500");
  });
});
