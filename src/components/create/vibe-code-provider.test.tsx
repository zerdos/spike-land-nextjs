import { act, renderHook } from "@testing-library/react";
import { signIn, useSession } from "next-auth/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVibeCode, VibeCodeProvider } from "./vibe-code-provider";

// Mock AgentProgressIndicator types
vi.mock("@/components/my-apps/AgentProgressIndicator", () => ({
  AgentProgressIndicator: () => null,
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
}));

const fetchMock = vi.fn();

describe("VibeCodeProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    vi.mocked(signIn).mockClear();
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: "Test User", id: "test-id", role: "USER" }, expires: "1" },
      status: "authenticated",
      update: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return <VibeCodeProvider>{children}</VibeCodeProvider>;
  }

  it("throws when useVibeCode is used outside provider", () => {
    expect(() => {
      renderHook(() => useVibeCode());
    }).toThrow("useVibeCode must be used within a VibeCodeProvider");
  });

  it("provides default state values", () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.mode).toBe("plan");
    expect(result.current.messages).toEqual([]);
    expect(result.current.appContext).toBeNull();
    expect(result.current.agentStage).toBeNull();
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.refreshCounter).toBe(0);
  });

  it("openPanel sets isOpen to true", () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.openPanel();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("closePanel sets isOpen to false", () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.openPanel();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.closePanel();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("setMode updates mode", () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setMode("edit");
    });

    expect(result.current.mode).toBe("edit");

    act(() => {
      result.current.setMode("plan");
    });

    expect(result.current.mode).toBe("plan");
  });

  it("setAppContext updates appContext", () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "my-app",
        title: "My App",
        codespaceId: "cs-123",
      });
    });

    expect(result.current.appContext).toEqual({
      slug: "my-app",
      title: "My App",
      codespaceId: "cs-123",
    });
  });

  it("sendMessage does nothing without appContext", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("hello");
    });

    expect(result.current.messages).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sendMessage adds user and agent messages on success", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "test-app",
        title: "Test",
        codespaceId: "cs-1",
      });
    });

    // Mock SSE response
    const sseData = [
      'data: {"type":"stage","stage":"processing"}\n',
      'data: {"type":"chunk","content":"Hello "}\n',
      'data: {"type":"chunk","content":"world"}\n',
      'data: {"type":"complete"}\n',
    ].join("\n");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseData));
        controller.close();
      },
    });

    fetchMock.mockResolvedValue({
      ok: true,
      body: stream,
    });

    await act(async () => {
      await result.current.sendMessage("test message");
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]!.role).toBe("user");
    expect(result.current.messages[0]!.content).toBe("test message");
    expect(result.current.messages[1]!.role).toBe("agent");
    expect(result.current.messages[1]!.content).toBe("Hello world");
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.agentStage).toBeNull();
  });

  it("sendMessage converts images to base64", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "test-app",
        title: "Test",
        codespaceId: "cs-1",
      });
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"complete"}\n\n'),
        );
        controller.close();
      },
    });

    fetchMock.mockResolvedValue({ ok: true, body: stream });

    const file = new File(["fake-image-data"], "test.png", {
      type: "image/png",
    });

    await act(async () => {
      await result.current.sendMessage("with image", [file]);
    });

    // User message should have images
    expect(result.current.messages[0]!.images).toBeDefined();
    expect(result.current.messages[0]!.images!.length).toBe(1);

    // fetch POST should include images in body
    const postCall = fetchMock.mock.calls.find(
      (c: string[]) => c[1]?.method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse(postCall![1].body);
    expect(body.images).toBeDefined();
    expect(body.images.length).toBe(1);
  });

  it("sendMessage fetches screenshot when autoScreenshot is true", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "test-app",
        title: "Test",
        codespaceId: "cs-1",
      });
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"complete"}\n\n'),
        );
        controller.close();
      },
    });

    // First call: screenshot, second call: vibe-chat
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ base64: "data:image/png;base64,screenshot" }),
      })
      .mockResolvedValueOnce({ ok: true, body: stream });

    await act(async () => {
      await result.current.sendMessage("with screenshot", undefined, true);
    });

    // First fetch should be screenshot
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "/api/create/screenshot?slug=test-app",
    );
    // User message should have screenshot image
    expect(result.current.messages[0]!.images).toEqual([
      "data:image/png;base64,screenshot",
    ]);
  });

  it("sendMessage handles screenshot fetch failure gracefully", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "test-app",
        title: "Test",
        codespaceId: "cs-1",
      });
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"complete"}\n\n'),
        );
        controller.close();
      },
    });

    fetchMock
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ ok: true, body: stream });

    await act(async () => {
      await result.current.sendMessage("with screenshot", undefined, true);
    });

    // Should still succeed even though screenshot failed
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]!.images).toBeUndefined();
  });

  it("sendMessage handles SSE error event", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "test-app",
        title: "Test",
        codespaceId: "cs-1",
      });
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"error","message":"Something went wrong"}\n\ndata: {"type":"complete"}\n\n',
          ),
        );
        controller.close();
      },
    });

    fetchMock.mockResolvedValue({ ok: true, body: stream });

    await act(async () => {
      await result.current.sendMessage("test");
    });

    expect(result.current.messages[1]!.content).toContain(
      "Something went wrong",
    );
  });

  it("sendMessage handles code_updated event", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "test-app",
        title: "Test",
        codespaceId: "cs-1",
      });
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"code_updated"}\n\ndata: {"type":"complete"}\n\n',
          ),
        );
        controller.close();
      },
    });

    fetchMock.mockResolvedValue({ ok: true, body: stream });

    await act(async () => {
      await result.current.sendMessage("test");
    });

    expect(result.current.refreshCounter).toBe(1);
  });

  it("sendMessage handles fetch error", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "test-app",
        title: "Test",
        codespaceId: "cs-1",
      });
    });

    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await act(async () => {
      await result.current.sendMessage("test");
    });

    expect(result.current.messages[1]!.content).toContain(
      "Request failed: 500 Internal Server Error",
    );
    expect(result.current.isStreaming).toBe(false);
  });

  it("sendMessage handles response body being null", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "test-app",
        title: "Test",
        codespaceId: "cs-1",
      });
    });

    fetchMock.mockResolvedValue({
      ok: true,
      body: null,
    });

    await act(async () => {
      await result.current.sendMessage("test");
    });

    expect(result.current.messages[1]!.content).toContain("Request failed");
    expect(result.current.isStreaming).toBe(false);
  });

  it("sendMessage handles malformed SSE data gracefully", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "test-app",
        title: "Test",
        codespaceId: "cs-1",
      });
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            "data: not-valid-json\n\ndata: {\"type\":\"complete\"}\n\n",
          ),
        );
        controller.close();
      },
    });

    fetchMock.mockResolvedValue({ ok: true, body: stream });

    await act(async () => {
      await result.current.sendMessage("test");
    });

    // Should still complete without crashing
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.isStreaming).toBe(false);
  });

  it("sendMessage handles network error during streaming", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "test-app",
        title: "Test",
        codespaceId: "cs-1",
      });
    });

    fetchMock.mockRejectedValue(new Error("Network failure"));

    await act(async () => {
      await result.current.sendMessage("test");
    });

    expect(result.current.messages[1]!.content).toContain("Network failure");
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.agentStage).toBeNull();
  });

  it("sendMessage skips lines not starting with data:", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "test-app",
        title: "Test",
        codespaceId: "cs-1",
      });
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            "event: message\ndata: {\"type\":\"chunk\",\"content\":\"ok\"}\n\ndata: {\"type\":\"complete\"}\n\n",
          ),
        );
        controller.close();
      },
    });

    fetchMock.mockResolvedValue({ ok: true, body: stream });

    await act(async () => {
      await result.current.sendMessage("test");
    });

    expect(result.current.messages[1]!.content).toBe("ok");
  });

  it("sendMessage handles non-Error thrown objects", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "test-app",
        title: "Test",
        codespaceId: "cs-1",
      });
    });

    fetchMock.mockRejectedValue("string error");

    await act(async () => {
      await result.current.sendMessage("test");
    });

    expect(result.current.messages[1]!.content).toContain("Unknown error");
  });

  it("sendMessage handles screenshot non-ok response", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "test-app",
        title: "Test",
        codespaceId: "cs-1",
      });
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"complete"}\n\n'),
        );
        controller.close();
      },
    });

    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true, body: stream });

    await act(async () => {
      await result.current.sendMessage("test", undefined, true);
    });

    // Should complete without screenshot
    expect(result.current.messages[0]!.images).toBeUndefined();
    expect(result.current.messages).toHaveLength(2);
  });

  it("sendMessage sends correct mode in POST body", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "test-app",
        title: "Test",
        codespaceId: "cs-1",
      });
      result.current.setMode("edit");
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"complete"}\n\n'),
        );
        controller.close();
      },
    });

    fetchMock.mockResolvedValue({ ok: true, body: stream });

    await act(async () => {
      await result.current.sendMessage("test");
    });

    const postCall = fetchMock.mock.calls.find(
      (c: string[]) => c[1]?.method === "POST",
    );
    const body = JSON.parse(postCall![1].body);
    expect(body.mode).toBe("edit");
    expect(body.slug).toBe("test-app");
  });

  it("sendMessage processes stage events", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "test-app",
        title: "Test",
        codespaceId: "cs-1",
      });
    });

    // We'll check that agentStage is set to null after complete
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"stage","stage":"processing"}\n\ndata: {"type":"stage","stage":"executing_tool"}\n\ndata: {"type":"complete"}\n\n',
          ),
        );
        controller.close();
      },
    });

    fetchMock.mockResolvedValue({ ok: true, body: stream });

    await act(async () => {
      await result.current.sendMessage("test");
    });

    // After complete, stage should be null
    expect(result.current.agentStage).toBeNull();
    expect(result.current.isStreaming).toBe(false);
  });

  it("sendMessage triggers signIn if not authenticated", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    const { result } = renderHook(() => useVibeCode(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("test");
    });

    expect(signIn).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sendMessage triggers signIn on 401 response", async () => {
    const { result } = renderHook(() => useVibeCode(), { wrapper });

    act(() => {
      result.current.setAppContext({
        slug: "test-app",
        title: "Test",
        codespaceId: "cs-1",
      });
    });

    fetchMock.mockResolvedValue({
      status: 401,
      ok: false,
      statusText: "Unauthorized",
    });

    await act(async () => {
      await result.current.sendMessage("test");
    });

    expect(signIn).toHaveBeenCalled();
    expect(result.current.messages[1]!.content).toContain("Unauthorized");
  });
});
