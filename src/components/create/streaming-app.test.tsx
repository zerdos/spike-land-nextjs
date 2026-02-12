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
  Loader2: () => null,
}));

const mockRedirectToSignIn = vi.fn();
vi.mock("@/hooks/useAuthRedirect", () => ({
  useAuthRedirect: () => ({ redirectToSignIn: mockRedirectToSignIn }),
}));

const fetchMock = vi.fn();

function createJsonResponse(data: Record<string, unknown>, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

describe("StreamingApp", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    mockRedirectToSignIn.mockReset();
    mockRouter.refresh.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders loading state initially", async () => {
    const { StreamingApp } = await import("./streaming-app");

    let resolveP: (value: unknown) => void;
    fetchMock.mockReturnValue(new Promise((r) => { resolveP = r; }));

    render(<StreamingApp path={["test", "app"]} />);

    expect(screen.getByText("Building your app...")).toBeInTheDocument();

    // Cleanup
    resolveP!(createJsonResponse({ success: true, codeSpace: "test/app" }));
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

  it("calls router.refresh on successful JSON response", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        codeSpace: "test/app",
        title: "My App",
        description: "A test app",
      }),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  it("shows error UI when JSON response indicates failure", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: false,
        codeSpace: "test/app",
        error: "Build failed: syntax error in generated code",
        buildLog: ["Starting...", "Error occurred"],
      }),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Build failed: syntax error in generated code"),
    ).toBeInTheDocument();
  });

  it("shows build log on error when available", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: false,
        codeSpace: "test/app",
        error: "Generation failed",
        buildLog: ["Initializing...", "Designing logic...", "Failed at transpilation"],
      }),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
    });
    expect(screen.getByText("Build Log")).toBeInTheDocument();
    expect(screen.getByText("Initializing...")).toBeInTheDocument();
    expect(screen.getByText("Designing logic...")).toBeInTheDocument();
    expect(screen.getByText("Failed at transpilation")).toBeInTheDocument();
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

    vi.advanceTimersByTime(3100);

    await waitFor(() => {
      expect(mockRouter.refresh).toHaveBeenCalled();
    });

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

  it("restarts generation when Try Again button is clicked", async () => {
    const user = userEvent.setup();
    const { StreamingApp } = await import("./streaming-app");

    // First call: error
    fetchMock.mockRejectedValueOnce(new Error("Server error"));

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
    });

    // Second call: success
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        success: true,
        codeSpace: "test/app",
        title: "Retry App",
      }),
    );

    await user.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("renders path in the description text", async () => {
    const { StreamingApp } = await import("./streaming-app");

    let resolveP: (value: unknown) => void;
    fetchMock.mockReturnValue(new Promise((r) => { resolveP = r; }));

    render(<StreamingApp path={["my", "cool", "app"]} />);

    expect(screen.getByText("/my/cool/app")).toBeInTheDocument();

    // Cleanup
    resolveP!(createJsonResponse({ success: true, codeSpace: "my/cool/app" }));
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

  it("calls toast.error when JSON response indicates failure", async () => {
    const { toast } = await import("sonner");
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: false,
        codeSpace: "test/app",
        error: "Internal server error",
      }),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Generation failed: Internal server error");
    });
  });

  it("shows default error message when error field is missing", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: false,
        codeSpace: "test/app",
      }),
    );

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
    });
    expect(screen.getByText("Generation failed")).toBeInTheDocument();
  });
});
