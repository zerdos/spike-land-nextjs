import { render, screen, waitFor } from "@testing-library/react";
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
  ExternalLink: () => null,
  Loader2: () => null,
}));

const fetchMock = vi.fn();

describe("StreamingApp", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
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

  it("shows error when unauthorized", async () => {
    const { StreamingApp } = await import("./streaming-app");
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Please log in to generate an app.")).toBeInTheDocument();
    });
  });
});
