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

  const mockAudioTrack = {
    stop: vi.fn(),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
  };

  const mockStream = {
    getTracks: vi.fn(() => [mockAudioTrack]),
    getAudioTracks: vi.fn(() => [mockAudioTrack]),
    // Add other stream methods if needed
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
    expect(result.current.error).toBeNull();
  });

  it("starts recording with simple constraints first", async () => {
    const { result } = renderHook(() => useAudioRecording());
    const mockAudioTrack = { applyConstraints: vi.fn(), stop: vi.fn() };
    const mockSimpleStream = {
      getAudioTracks: vi.fn(() => [mockAudioTrack]),
      getTracks: vi.fn(() => [mockAudioTrack]),
    };

    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>)
      .mockResolvedValue(mockSimpleStream);

    await act(async () => {
      const success = await result.current.startRecording();
      expect(success).toBe(true);
    });

    expect(result.current.isRecording).toBe(true);
    // Should call getUserMedia with simple constraints
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: true,
    });
    // Then try to apply advanced constraints
    expect(mockAudioTrack.applyConstraints).toHaveBeenCalledWith({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    });
  });

  it("continues if applying constraints fails", async () => {
    const { result } = renderHook(() => useAudioRecording());
    const mockAudioTrack = {
      applyConstraints: vi.fn().mockRejectedValue(new Error("Constraint error")),
      stop: vi.fn(),
    };
    const mockSimpleStream = {
      getAudioTracks: vi.fn(() => [mockAudioTrack]),
      getTracks: vi.fn(() => [mockAudioTrack]),
    };

    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>)
      .mockResolvedValue(mockSimpleStream);

    await act(async () => {
      const success = await result.current.startRecording();
      expect(success).toBe(true);
    });

    // Should still be recording even if constraints failed
    expect(result.current.isRecording).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("updates duration while recording", async () => {
    const { result } = renderHook(() => useAudioRecording());
    // Ensure getUserMedia is mocked to return a stream with an audio track
    // that has applyConstraints, as per the new logic.
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>)
      .mockResolvedValue(mockStream);

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

  it("handles getUserMedia error (both attempts fail)", async () => {
    const error = new Error("Permission denied");
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>)
      .mockRejectedValue(error);

    const { result } = renderHook(() => useAudioRecording());

    await act(async () => {
      const success = await result.current.startRecording();
      expect(success).toBe(false);
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe("Permission denied");
  });

  it("clears error on subsequent start attempt", async () => {
    // First attempt fails
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error("Fail 1"));

    const { result } = renderHook(() => useAudioRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toBeDefined();

    // Second attempt succeeds (mock returns success by default from beforeEach or next implementation)
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>)
      .mockResolvedValue(mockStream);

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isRecording).toBe(true);
  });

  it("returns null if no media recorder on stop", async () => {
    const { result } = renderHook(() => useAudioRecording());

    const blob = await result.current.stopRecording();

    expect(blob).toBeNull();
  });
});
