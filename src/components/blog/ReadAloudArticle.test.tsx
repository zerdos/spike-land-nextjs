import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReadAloudArticle } from "./ReadAloudArticle";

// --- Mock Audio class (use class to avoid vitest warnings) ---
class MockAudioClass {
  src = "";
  currentTime = 0;
  listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;

  constructor() {
    this.play = vi.fn(() => Promise.resolve());
    this.pause = vi.fn();
    audioInstances.push(this);
  }

  addEventListener(event: string, cb: (...args: unknown[]) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  emit(event: string) {
    (this.listeners[event] || []).forEach(cb => cb());
  }
}

let audioInstances: MockAudioClass[] = [];
vi.stubGlobal("Audio", MockAudioClass);

// Helper to render with article content
function renderWithArticle(paragraphs: string[]) {
  return render(
    <div>
      <ReadAloudArticle />
      <div data-article-content>
        {paragraphs.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </div>
    </div>,
  );
}

// Helper to get last audio instance
function getLastAudio(): MockAudioClass {
  return audioInstances[audioInstances.length - 1]!;
}

describe("ReadAloudArticle", () => {
  beforeEach(() => {
    audioInstances = [];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
        const body = JSON.parse(options?.body as string);
        const text = body.text;
        const responseUrl = `https://example.com/tts/${encodeURIComponent(text)}.mp3`;
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ url: responseUrl }),
        });
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("Audio", MockAudioClass);
  });

  it("renders the Listen button in idle state", () => {
    render(<ReadAloudArticle />);

    const button = screen.getByRole("button", { name: "Listen to article" });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Listen")).toBeInTheDocument();
  });

  it("does not show stop button or progress bar in idle state", () => {
    render(<ReadAloudArticle />);

    expect(screen.queryByRole("button", { name: "Stop reading" })).not.toBeInTheDocument();
  });

  it("does nothing when clicking play with no article content", async () => {
    const user = userEvent.setup();

    render(
      <div>
        <ReadAloudArticle />
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    expect(screen.getByText("Listen")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop reading" })).not.toBeInTheDocument();
  });

  it("does nothing when article has only short paragraphs (< 20 chars)", async () => {
    const user = userEvent.setup();

    render(
      <div>
        <ReadAloudArticle />
        <div data-article-content>
          <p>Short</p>
          <p>Also short</p>
        </div>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    expect(screen.getByText("Listen")).toBeInTheDocument();
  });

  it("starts playback when clicking play with article content", async () => {
    const user = userEvent.setup();

    renderWithArticle([
      "This is the first paragraph with enough text for playback.",
      "This is the second paragraph with enough text for playback.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Stop reading" })).toBeInTheDocument();
  });

  it("shows Loading... text during loading state", async () => {
    let resolveFirstFetch!: (value: unknown) => void;
    const deferredFetch = new Promise(resolve => {
      resolveFirstFetch = resolve;
    });

    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferredFetch));

    const user = userEvent.setup();

    renderWithArticle([
      "This is a paragraph long enough for the loading state test.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    // Clean up - resolve the fetch
    await act(async () => {
      resolveFirstFetch({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ url: "https://example.com/loading.mp3" }),
      });
    });
  });

  it("pauses when clicking during playing state", async () => {
    const user = userEvent.setup();

    renderWithArticle([
      "This is a paragraph with enough text for pause testing.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(audioInstances.length).toBeGreaterThan(0);
    });

    // Wait for playing state
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Pause article" })).toBeInTheDocument();
    });

    // Now click to pause
    await user.click(screen.getByRole("button", { name: "Pause article" }));

    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(getLastAudio().pause).toHaveBeenCalled();
  });

  it("resumes when clicking during paused state", async () => {
    const user = userEvent.setup();

    renderWithArticle([
      "This is a paragraph with enough text for resume testing.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Pause article" })).toBeInTheDocument();
    });

    const audioInstance = getLastAudio();

    // Pause
    await user.click(screen.getByRole("button", { name: "Pause article" }));
    expect(screen.getByText("Paused")).toBeInTheDocument();

    // Resume
    await user.click(screen.getByRole("button", { name: "Resume article" }));
    // audio.play should be called again for resume
    expect(audioInstance.play).toHaveBeenCalledTimes(2);
  });

  it("stops playback and resets to idle on stop button click", async () => {
    const user = userEvent.setup();

    renderWithArticle([
      "This is a paragraph with enough text for stop testing.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Stop reading" })).toBeInTheDocument();
    });

    const audioInstance = getLastAudio();

    await user.click(screen.getByRole("button", { name: "Stop reading" }));

    expect(screen.getByText("Listen")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop reading" })).not.toBeInTheDocument();
    expect(audioInstance.pause).toHaveBeenCalled();
  });

  it("advances to next paragraph when audio ends", async () => {
    const user = userEvent.setup();

    renderWithArticle([
      "First paragraph with enough text for sequential playback.",
      "Second paragraph with enough text for sequential playback.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();
    });

    const firstAudio = getLastAudio();

    // Simulate first paragraph ending
    await act(async () => {
      firstAudio.emit("ended");
    });

    await waitFor(() => {
      expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument();
    });
  });

  it("returns to idle when last paragraph ends", async () => {
    const user = userEvent.setup();

    renderWithArticle([
      "Single paragraph with enough text for completion test.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(audioInstances.length).toBeGreaterThan(0);
    });

    const audioInstance = getLastAudio();

    await act(async () => {
      audioInstance.emit("ended");
    });

    await waitFor(() => {
      expect(screen.getByText("Listen")).toBeInTheDocument();
    });
  });

  it("skips to next paragraph on audio error", async () => {
    const user = userEvent.setup();

    renderWithArticle([
      "First paragraph with enough text for error skip testing.",
      "Second paragraph with enough text for error skip testing.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(audioInstances.length).toBeGreaterThan(0);
    });

    const firstAudio = getLastAudio();

    await act(async () => {
      firstAudio.emit("error");
    });

    await waitFor(() => {
      expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument();
    });
  });

  it("skips to next paragraph on fetch failure", async () => {
    const firstParagraph = "First paragraph that will fail on fetch request.";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
        const body = JSON.parse(options?.body as string);
        // Fail all fetches for the first paragraph text
        if (body.text === firstParagraph) {
          return Promise.resolve({ ok: false, status: 500, headers: new Headers() });
        }
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ url: "https://example.com/recovered.mp3" }),
        });
      }),
    );

    const user = userEvent.setup();

    renderWithArticle([
      firstParagraph,
      "Second paragraph that will succeed after first fails.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument();
    });
  });

  it("shows progress bar when active", async () => {
    const user = userEvent.setup();

    const { container } = renderWithArticle([
      "This is a paragraph long enough for progress bar visibility.",
      "This is another long paragraph for testing progress display.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();
    });

    // Progress bar should be visible - first paragraph of 2: (0+1)/2 * 100 = 50%
    const progressBar = container.querySelector("[style*='width']");
    expect(progressBar).toBeTruthy();
    expect(progressBar?.getAttribute("style")).toContain("width: 50%");
  });

  it("cleans up audio on unmount", async () => {
    const user = userEvent.setup();

    const { unmount } = renderWithArticle([
      "This is a paragraph with enough text for unmount cleanup.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(audioInstances.length).toBeGreaterThan(0);
    });

    const audioInstance = getLastAudio();

    unmount();

    expect(audioInstance.pause).toHaveBeenCalled();
  });

  it("pre-fetches next paragraph while loading current one", async () => {
    const user = userEvent.setup();

    renderWithArticle([
      "First paragraph long enough for pre-fetch testing now.",
      "Second paragraph long enough for pre-fetch testing now.",
      "Third paragraph long enough for pre-fetch testing now.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(audioInstances.length).toBeGreaterThan(0);
    });

    // Fetch should have been called for both first and second paragraph (pre-fetch)
    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("handles audio content-type response with blob URL", async () => {
    const mockBlob = new Blob(["audio-data"], { type: "audio/mpeg" });
    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-article-url");
    const originalURL = globalThis.URL;
    vi.stubGlobal("URL", { ...originalURL, createObjectURL: createObjectURLMock });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "audio/mpeg" }),
        blob: () => Promise.resolve(mockBlob),
      }),
    );

    const user = userEvent.setup();

    renderWithArticle([
      "A paragraph long enough to trigger audio blob URL handling.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(createObjectURLMock).toHaveBeenCalled();
    });

    vi.stubGlobal("URL", originalURL);
  });

  it("pauses during loading state (not just playing)", async () => {
    let resolveFirstFetch!: (value: unknown) => void;
    const deferredFetch = new Promise(resolve => {
      resolveFirstFetch = resolve;
    });

    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferredFetch));

    const user = userEvent.setup();

    renderWithArticle([
      "This paragraph is long enough to test loading pause behavior.",
    ]);

    // Start playing - will be stuck in loading
    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    // Click again during loading should pause
    await user.click(screen.getByRole("button", { name: "Listen to article" }));
    expect(screen.getByText("Paused")).toBeInTheDocument();

    // Clean up
    await act(async () => {
      resolveFirstFetch({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ url: "https://example.com/loading-pause.mp3" }),
      });
    });
  });

  it("handles stop when no audio ref exists", async () => {
    const user = userEvent.setup();

    let resolveFirstFetch!: (value: unknown) => void;
    const deferredFetch = new Promise(resolve => {
      resolveFirstFetch = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferredFetch));

    renderWithArticle([
      "Paragraph long enough for stop without audio ref testing.",
    ]);

    // Start - gets stuck in loading
    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    // Pause first (loading counts as active)
    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    // Now click stop - audioRef may be null
    await user.click(screen.getByRole("button", { name: "Stop reading" }));

    expect(screen.getByText("Listen")).toBeInTheDocument();

    // Clean up
    await act(async () => {
      resolveFirstFetch({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ url: "https://example.com/no-audio.mp3" }),
      });
    });
  });

  it("calculates progress correctly for multiple paragraphs", async () => {
    const user = userEvent.setup();

    const { container } = renderWithArticle([
      "Paragraph one is long enough for progress calculation.",
      "Paragraph two is long enough for progress calculation.",
      "Paragraph three is long enough for progress test.",
      "Paragraph four is long enough for progress test now.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(screen.getByText(/1 \/ 4/)).toBeInTheDocument();
    });

    // Progress: (0+1)/4 * 100 = 25%
    const progressBar = container.querySelector("[style*='width']");
    expect(progressBar?.getAttribute("style")).toContain("width: 25%");
  });

  it("does not show progress when totalParagraphs is 0", () => {
    render(<ReadAloudArticle />);

    expect(screen.queryByRole("button", { name: "Stop reading" })).not.toBeInTheDocument();
  });

  it("filters out paragraphs with empty or null textContent", async () => {
    const user = userEvent.setup();

    // Include a mix: empty <p>, short <p>, and one long enough
    render(
      <div>
        <ReadAloudArticle />
        <div data-article-content>
          <p></p>
          <p>Short</p>
          <p>This is the only paragraph long enough to trigger playback.</p>
        </div>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      // Only 1 paragraph should qualify (>= 20 chars)
      expect(screen.getByText(/1 \/ 1/)).toBeInTheDocument();
    });
  });

  it("handles unmount during playParagraph async operation", async () => {
    let resolveFirstFetch!: (value: unknown) => void;
    const deferredFetch = new Promise(resolve => {
      resolveFirstFetch = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferredFetch));

    const user = userEvent.setup();

    const { unmount } = renderWithArticle([
      "This paragraph is long enough to test unmount during async.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    // Unmount while fetch is pending
    unmount();

    // Resolve the fetch after unmount
    await act(async () => {
      resolveFirstFetch({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ url: "https://example.com/unmount-async.mp3" }),
      });
    });

    // Should not throw - mountedRef guards prevent state updates
  });

  it("handles audio ended event after unmount", async () => {
    const user = userEvent.setup();

    const { unmount } = renderWithArticle([
      "First paragraph long enough for unmount-ended test.",
      "Second paragraph long enough for unmount-ended test.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(audioInstances.length).toBeGreaterThan(0);
    });

    const audio = getLastAudio();
    unmount();

    // Emit ended after unmount - should not throw
    audio.emit("ended");
  });

  it("handles audio error event after unmount", async () => {
    const user = userEvent.setup();

    const { unmount } = renderWithArticle([
      "First paragraph long enough for unmount-error test.",
      "Second paragraph long enough for unmount-error test.",
    ]);

    await user.click(screen.getByRole("button", { name: "Listen to article" }));

    await waitFor(() => {
      expect(audioInstances.length).toBeGreaterThan(0);
    });

    const audio = getLastAudio();
    unmount();

    // Emit error after unmount - should not throw
    audio.emit("error");
  });
});
