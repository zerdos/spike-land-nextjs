/**
 * useAudioContext Hook Tests
 * Resolves #332
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAudioContext } from "./useAudioContext";

// Mock the audio-engine module
vi.mock("../lib/audio-engine", () => ({
  createAudioContext: vi.fn(),
  createMasterGain: vi.fn(),
  createAnalyser: vi.fn(),
}));

import { createAnalyser, createAudioContext, createMasterGain } from "../lib/audio-engine";

describe("useAudioContext", () => {
  const mockContext = {
    state: "running",
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  };

  const mockMasterGain = {
    connect: vi.fn(),
    gain: { value: 1 },
  };

  const mockAnalyser = {
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createAudioContext).mockReturnValue(mockContext as unknown as AudioContext);
    vi.mocked(createMasterGain).mockReturnValue(mockMasterGain as unknown as GainNode);
    vi.mocked(createAnalyser).mockReturnValue(mockAnalyser as unknown as AnalyserNode);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with null state", () => {
    const { result } = renderHook(() => useAudioContext());

    expect(result.current.context).toBeNull();
    expect(result.current.masterGain).toBeNull();
    expect(result.current.analyser).toBeNull();
    expect(result.current.isInitialized).toBe(false);
  });

  it("initializes audio context", async () => {
    const { result } = renderHook(() => useAudioContext());

    await act(async () => {
      await result.current.initialize();
    });

    expect(createAudioContext).toHaveBeenCalled();
    expect(createMasterGain).toHaveBeenCalled();
    expect(createAnalyser).toHaveBeenCalled();
    expect(result.current.isInitialized).toBe(true);
  });

  it("resumes suspended context", async () => {
    const suspendedContext = {
      ...mockContext,
      state: "suspended",
    };
    vi.mocked(createAudioContext).mockReturnValue(suspendedContext as unknown as AudioContext);

    const { result } = renderHook(() => useAudioContext());

    await act(async () => {
      await result.current.initialize();
    });

    expect(suspendedContext.resume).toHaveBeenCalled();
  });

  it("returns existing context on subsequent initialize calls", async () => {
    const { result } = renderHook(() => useAudioContext());

    await act(async () => {
      await result.current.initialize();
    });

    await act(async () => {
      const secondResult = await result.current.initialize();
      expect(secondResult.context).toBe(mockContext);
    });

    expect(createAudioContext).toHaveBeenCalledTimes(1);
  });

  it("sets master volume", async () => {
    const { result } = renderHook(() => useAudioContext());

    await act(async () => {
      await result.current.initialize();
    });

    act(() => {
      result.current.setMasterVolume(0.5);
    });

    expect(mockMasterGain.gain.value).toBe(0.5);
  });

  it("clamps volume between 0 and 1", async () => {
    const { result } = renderHook(() => useAudioContext());

    await act(async () => {
      await result.current.initialize();
    });

    act(() => {
      result.current.setMasterVolume(1.5);
    });
    expect(mockMasterGain.gain.value).toBe(1);

    act(() => {
      result.current.setMasterVolume(-0.5);
    });
    expect(mockMasterGain.gain.value).toBe(0);
  });

  it("gets analyser data", async () => {
    const { result } = renderHook(() => useAudioContext());

    await act(async () => {
      await result.current.initialize();
    });

    const data = result.current.getAnalyserData();

    expect(mockAnalyser.getByteFrequencyData).toHaveBeenCalled();
    expect(data).toBeInstanceOf(Uint8Array);
    expect(data.length).toBe(1024);
  });

  it("returns empty array if analyser not initialized", () => {
    const { result } = renderHook(() => useAudioContext());

    const data = result.current.getAnalyserData();

    expect(data).toBeInstanceOf(Uint8Array);
    expect(data.length).toBe(0);
  });

  it("cleans up on cleanup call", async () => {
    const { result } = renderHook(() => useAudioContext());

    await act(async () => {
      await result.current.initialize();
    });

    act(() => {
      result.current.cleanup();
    });

    expect(mockContext.close).toHaveBeenCalled();
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.context).toBeNull();
  });
});
