/**
 * useAudioRecording Hook Tests
 * Resolves #332
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAudioRecording } from "./useAudioRecording";

// Mock the audio-engine module
vi.mock("../lib/audio-engine", () => ({
  createRecorder: vi.fn(),
  blobToAudioBuffer: vi.fn(),
}));

import { blobToAudioBuffer, createRecorder } from "../lib/audio-engine";

describe("useAudioRecording", () => {
  let mockMediaRecorder: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    ondataavailable: ((e: { data: Blob; }) => void) | null;
    onstop: (() => void) | null;
    state: string;
    mimeType: string;
  };

  const mockStream = {
    getTracks: vi.fn(() => [{ stop: vi.fn() }]),
  };

  const mockBuffer = { duration: 5 } as AudioBuffer;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockMediaRecorder = {
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      ondataavailable: null,
      onstop: null,
      state: "inactive",
      mimeType: "audio/webm",
    };

    vi.mocked(createRecorder).mockReturnValue(
      mockMediaRecorder as unknown as MediaRecorder,
    );
    vi.mocked(blobToAudioBuffer).mockResolvedValue(mockBuffer);

    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("initializes with default state", () => {
    const { result } = renderHook(() => useAudioRecording());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.duration).toBe(0);
  });

  it("starts recording", async () => {
    const { result } = renderHook(() => useAudioRecording());

    await act(async () => {
      const success = await result.current.startRecording();
      expect(success).toBe(true);
    });

    expect(result.current.isRecording).toBe(true);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    expect(mockMediaRecorder.start).toHaveBeenCalledWith(100);
  });

  it("updates duration while recording", async () => {
    const { result } = renderHook(() => useAudioRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.duration).toBeGreaterThan(0);
  });

  it("pauses recording", async () => {
    const { result } = renderHook(() => useAudioRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    mockMediaRecorder.state = "recording";

    act(() => {
      result.current.pauseRecording();
    });

    expect(result.current.isPaused).toBe(true);
    expect(mockMediaRecorder.pause).toHaveBeenCalled();
  });

  it("resumes recording", async () => {
    const { result } = renderHook(() => useAudioRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    mockMediaRecorder.state = "recording";

    act(() => {
      result.current.pauseRecording();
    });

    mockMediaRecorder.state = "paused";

    act(() => {
      result.current.resumeRecording();
    });

    expect(result.current.isPaused).toBe(false);
    expect(mockMediaRecorder.resume).toHaveBeenCalled();
  });

  it("stops recording and returns blob", async () => {
    const { result } = renderHook(() => useAudioRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    // Simulate data available
    act(() => {
      if (mockMediaRecorder.ondataavailable) {
        mockMediaRecorder.ondataavailable({ data: new Blob(["audio"]) });
      }
    });

    let blob: Blob | null = null;

    await act(async () => {
      const stopPromise = result.current.stopRecording();

      // Simulate stop event
      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }

      blob = await stopPromise;
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(result.current.isRecording).toBe(false);
  });

  it("cancels recording", async () => {
    const { result } = renderHook(() => useAudioRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.cancelRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.duration).toBe(0);
  });

  it("gets recording as buffer", async () => {
    const { result } = renderHook(() => useAudioRecording());
    const mockContext = {} as AudioContext;

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      if (mockMediaRecorder.ondataavailable) {
        mockMediaRecorder.ondataavailable({ data: new Blob(["audio"]) });
      }
    });

    let buffer: AudioBuffer | null = null;

    await act(async () => {
      const bufferPromise = result.current.getRecordingAsBuffer(mockContext);

      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }

      buffer = await bufferPromise;
    });

    expect(buffer).toBe(mockBuffer);
    expect(blobToAudioBuffer).toHaveBeenCalled();
  });

  it("handles getUserMedia error", async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>)
      .mockRejectedValue(
        new Error("Permission denied"),
      );

    const { result } = renderHook(() => useAudioRecording());

    await act(async () => {
      const success = await result.current.startRecording();
      expect(success).toBe(false);
    });

    expect(result.current.isRecording).toBe(false);
  });

  it("returns null if no media recorder on stop", async () => {
    const { result } = renderHook(() => useAudioRecording());

    const blob = await result.current.stopRecording();

    expect(blob).toBeNull();
  });
});
