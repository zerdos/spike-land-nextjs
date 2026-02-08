import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTextToSpeech } from "./useTextToSpeech";

// --- Mock Audio class ---
let audioInstances: MockAudioInstance[] = [];

interface MockAudioInstance {
  src: string;
  currentTime: number;
  listeners: Record<string, ((...args: unknown[]) => void)[]>;
  addEventListener: (event: string, cb: (...args: unknown[]) => void) => void;
  emit: (event: string) => void;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
}

function _createMockAudio(): MockAudioInstance {
  const instance: MockAudioInstance = {
    src: "",
    currentTime: 0,
    listeners: {},
    addEventListener(event: string, cb: (...args: unknown[]) => void) {
      if (!instance.listeners[event]) instance.listeners[event] = [];
      instance.listeners[event].push(cb);
    },
    emit(event: string) {
      (instance.listeners[event] || []).forEach(cb => cb());
    },
    play: vi.fn(function() {
      return Promise.resolve();
    }),
    pause: vi.fn(),
  };
  audioInstances.push(instance);
  return instance;
}

// Use a class to avoid vitest's "mock did not use function or class" warning
class MockAudioClass {
  src = "";
  currentTime = 0;
  listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;

  constructor() {
    this.play = vi.fn(() => Promise.resolve());
    this.pause = vi.fn();
    audioInstances.push(this as unknown as MockAudioInstance);
  }

  addEventListener(event: string, cb: (...args: unknown[]) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  emit(event: string) {
    (this.listeners[event] || []).forEach(cb => cb());
  }
}

vi.stubGlobal("Audio", MockAudioClass);

// We need to clear the module-level urlCache between tests.
// Since we cannot directly access it, we use unique text strings per test.

describe("useTextToSpeech", () => {
  beforeEach(() => {
    audioInstances = [];
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Re-stub Audio since restoreAllMocks may clear it
    vi.stubGlobal("Audio", MockAudioClass);
  });

  function getLastAudio(): MockAudioClass & { emit: (event: string) => void } {
    return audioInstances[audioInstances.length - 1] as unknown as MockAudioClass & {
      emit: (event: string) => void;
    };
  }

  function mockFetchJson(url: string) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ url }),
      }),
    );
  }

  it("starts in idle state", () => {
    const { result } = renderHook(() => useTextToSpeech());
    expect(result.current.state).toBe("idle");
  });

  it("returns play and stop functions", () => {
    const { result } = renderHook(() => useTextToSpeech());
    expect(typeof result.current.play).toBe("function");
    expect(typeof result.current.stop).toBe("function");
  });

  it("transitions to loading then playing on successful play", async () => {
    mockFetchJson("https://example.com/audio1.mp3");

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.play("unique-text-play-success-001");
    });

    expect(result.current.state).toBe("playing");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "unique-text-play-success-001" }),
    });
  });

  it("uses cache on second call with same text (no additional fetch)", async () => {
    const uniqueText = "unique-text-cache-hit-002";
    mockFetchJson("https://example.com/cached.mp3");

    const { result } = renderHook(() => useTextToSpeech());

    // First call - should fetch
    await act(async () => {
      await result.current.play(uniqueText);
    });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);

    // Stop playback
    act(() => {
      result.current.stop();
    });

    vi.mocked(fetch).mockClear();

    // Second call - should use cache
    await act(async () => {
      await result.current.play(uniqueText);
    });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    expect(result.current.state).toBe("playing");
  });

  it("stop resets state to idle and pauses audio", async () => {
    mockFetchJson("https://example.com/stop.mp3");

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.play("unique-text-stop-003");
    });

    expect(result.current.state).toBe("playing");
    const audio = getLastAudio();

    act(() => {
      result.current.stop();
    });

    expect(result.current.state).toBe("idle");
    expect(audio.pause).toHaveBeenCalled();
  });

  it("stop when no audio is playing still sets idle", () => {
    const { result } = renderHook(() => useTextToSpeech());

    act(() => {
      result.current.stop();
    });

    expect(result.current.state).toBe("idle");
  });

  it("transitions to error on fetch failure (network error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.play("unique-text-network-error-004");
    });

    expect(result.current.state).toBe("error");
  });

  it("transitions to error on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
      }),
    );

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.play("unique-text-non-ok-005");
    });

    expect(result.current.state).toBe("error");
  });

  it("handles audio content-type by creating blob URL", async () => {
    const mockBlob = new Blob(["audio-data"], { type: "audio/mpeg" });
    const createObjectURLSpy = vi.fn().mockReturnValue("blob:mock-url");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "audio/mpeg" }),
        blob: () => Promise.resolve(mockBlob),
      }),
    );

    // Stub URL.createObjectURL
    const originalURL = globalThis.URL;
    vi.stubGlobal("URL", {
      ...originalURL,
      createObjectURL: createObjectURLSpy,
    });

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.play("unique-text-audio-blob-006");
    });

    expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
    expect(result.current.state).toBe("playing");

    // Restore URL
    vi.stubGlobal("URL", originalURL);
  });

  it("transitions to idle when audio ends", async () => {
    mockFetchJson("https://example.com/ended.mp3");

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.play("unique-text-audio-ended-007");
    });

    expect(result.current.state).toBe("playing");

    const audio = getLastAudio();

    act(() => {
      audio.emit("ended");
    });

    expect(result.current.state).toBe("idle");
  });

  it("transitions to error when audio element errors", async () => {
    mockFetchJson("https://example.com/audio-error.mp3");

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.play("unique-text-audio-error-008");
    });

    expect(result.current.state).toBe("playing");

    const audio = getLastAudio();

    act(() => {
      audio.emit("error");
    });

    expect(result.current.state).toBe("error");
  });

  it("pauses existing audio when play is called again", async () => {
    mockFetchJson("https://example.com/replace.mp3");

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.play("unique-text-replace-a-009");
    });

    const firstAudio = getLastAudio();

    await act(async () => {
      await result.current.play("unique-text-replace-b-009");
    });

    expect(firstAudio.pause).toHaveBeenCalled();
  });

  it("cleans up on unmount - pauses audio", async () => {
    mockFetchJson("https://example.com/unmount.mp3");

    const { result, unmount } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.play("unique-text-unmount-010");
    });

    const audio = getLastAudio();

    unmount();

    expect(audio.pause).toHaveBeenCalled();
  });

  it("does not update state after unmount during play", async () => {
    let resolveResponse!: (value: unknown) => void;
    const fetchPromise = new Promise(resolve => {
      resolveResponse = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(fetchPromise));

    const { result, unmount } = renderHook(() => useTextToSpeech());

    let playPromise: Promise<void>;
    act(() => {
      playPromise = result.current.play("unique-text-unmount-during-011");
    });

    // Unmount before fetch resolves
    unmount();

    // Resolve fetch after unmount
    await act(async () => {
      resolveResponse({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ url: "https://example.com/late.mp3" }),
      });
      await playPromise!;
    });

    // Should not throw
  });

  it("sets error state when url is empty string from JSON response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ url: "" }),
      }),
    );

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.play("unique-text-falsy-url-012");
    });

    expect(result.current.state).toBe("error");
  });

  it("sets error when response JSON url is undefined", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      }),
    );

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.play("unique-text-undefined-url-013");
    });

    expect(result.current.state).toBe("error");
  });

  it("does not set error if unmounted when url is falsy", async () => {
    let resolveResponse!: (value: unknown) => void;
    const fetchPromise = new Promise(resolve => {
      resolveResponse = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(fetchPromise));

    const { result, unmount } = renderHook(() => useTextToSpeech());

    let playPromise: Promise<void>;
    act(() => {
      playPromise = result.current.play("unique-text-unmount-falsy-014");
    });

    unmount();

    await act(async () => {
      resolveResponse({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ url: "" }),
      });
      await playPromise!;
    });

    // Should not throw
  });

  it("does not set state if unmounted when audio ends", async () => {
    mockFetchJson("https://example.com/end-unmount.mp3");

    const { result, unmount } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.play("unique-text-end-unmount-015");
    });

    const audio = getLastAudio();
    unmount();

    // Emit ended after unmount - should not throw
    audio.emit("ended");
  });

  it("does not set state if unmounted when audio errors", async () => {
    mockFetchJson("https://example.com/err-unmount.mp3");

    const { result, unmount } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.play("unique-text-err-unmount-016");
    });

    const audio = getLastAudio();
    unmount();

    // Emit error after unmount - should not throw
    audio.emit("error");
  });

  it("handles audio.play() rejection (catch block)", async () => {
    mockFetchJson("https://example.com/play-reject.mp3");

    // Override the class temporarily to make play reject
    const OriginalMock = MockAudioClass;
    class FailingAudioClass extends MockAudioClass {
      constructor() {
        super();
        this.play = vi.fn(() => Promise.reject(new Error("Play failed")));
      }
    }
    vi.stubGlobal("Audio", FailingAudioClass);

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.play("unique-text-play-reject-017");
    });

    expect(result.current.state).toBe("error");

    // Restore
    vi.stubGlobal("Audio", OriginalMock);
  });

  it("early returns from play when not mounted", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const { result, unmount } = renderHook(() => useTextToSpeech());

    unmount();

    // Play after unmount - should return early without fetching
    await result.current.play("unique-text-not-mounted-018");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not cache when url is falsy", async () => {
    // First call returns empty url
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ url: undefined }),
      }),
    );

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.play("unique-text-no-cache-019");
    });

    expect(result.current.state).toBe("error");

    // Second call with same text should still fetch (not cached)
    mockFetchJson("https://example.com/retry.mp3");

    await act(async () => {
      await result.current.play("unique-text-no-cache-019");
    });

    // Now it should succeed since we provided a valid URL
    expect(result.current.state).toBe("playing");
  });
});
