import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StreamingApp } from "./streaming-app";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

const fetchMock = vi.fn();

// SKIP REASON: Fix tests for StreamingApp component
// CATEGORY: unfinished
// TRACKING: #1083
// ACTION: fix
describe.skip("StreamingApp", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // SKIP REASON: Fix tests for StreamingApp component
  // CATEGORY: unfinished
  // TRACKING: #1083
  // ACTION: fix
  it.skip("renders building state initially", async () => {
    let resolveProm: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolveProm = resolve;
    });

    fetchMock.mockReturnValue(promise);

    render(<StreamingApp path={["test", "app"]} />);

    expect(screen.getByText("Building your app...")).toBeInTheDocument();

    // cleanup
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
    fetchMock.mockRejectedValue(new Error("Network error"));

    render(<StreamingApp path={["test", "app"]} />);

    await waitFor(() => {
      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
    });
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows error when unauthorized", async () => {
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
