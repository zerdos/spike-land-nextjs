/**
 * useAudioTracks Hook Tests
 * Resolves #332
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAudioTracks } from "./useAudioTracks";

// Mock the audio-engine module
vi.mock("../lib/audio-engine", () => ({
  loadAudioFile: vi.fn(),
  generateWaveformData: vi.fn(),
  createTrackNodes: vi.fn(),
}));

import { createTrackNodes, generateWaveformData, loadAudioFile } from "../lib/audio-engine";

describe("useAudioTracks", () => {
  const mockContext = {
    createBufferSource: vi.fn(),
    createGain: vi.fn(),
    currentTime: 0,
  } as unknown as AudioContext;

  const mockMasterGain = {
    connect: vi.fn(),
  } as unknown as GainNode;

  const mockBuffer = {
    duration: 10,
    getChannelData: vi.fn(() => new Float32Array([0.5, -0.5])),
  } as unknown as AudioBuffer;

  const mockGainNode = {
    connect: vi.fn(),
    gain: { value: 1 },
  };

  const mockSource = {
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    buffer: null,
    onended: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadAudioFile).mockResolvedValue(mockBuffer);
    vi.mocked(generateWaveformData).mockReturnValue([0.5, 0.6, 0.7]);
    vi.mocked(createTrackNodes).mockReturnValue({
      source: mockSource as unknown as AudioBufferSourceNode,
      gainNode: mockGainNode as unknown as GainNode,
    });

    (mockContext.createBufferSource as ReturnType<typeof vi.fn>)
      .mockReturnValue(mockSource);
    (mockContext.createGain as ReturnType<typeof vi.fn>).mockReturnValue(
      mockGainNode,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with empty tracks", () => {
    const { result } = renderHook(() => useAudioTracks());
    expect(result.current.tracks).toHaveLength(0);
  });

  it("adds a track from file", async () => {
    const { result } = renderHook(() => useAudioTracks());

    const file = new File(["audio"], "test.mp3", { type: "audio/mp3" });

    await act(async () => {
      await result.current.addTrack(file, mockContext, mockMasterGain);
    });

    expect(result.current.tracks).toHaveLength(1);
    expect(result.current.tracks[0]!.name).toBe("test");
    expect(result.current.tracks[0]!.type).toBe("file");
    expect(result.current.tracks[0]!.duration).toBe(10);
  });

  it("adds a recorded track", async () => {
    const { result } = renderHook(() => useAudioTracks());

    await act(async () => {
      await result.current.addRecordedTrack(
        mockBuffer,
        mockContext,
        mockMasterGain,
        "My Recording",
      );
    });

    expect(result.current.tracks).toHaveLength(1);
    expect(result.current.tracks[0]!.name).toBe("My Recording");
    expect(result.current.tracks[0]!.type).toBe("recording");
  });

  it("removes a track", async () => {
    const { result } = renderHook(() => useAudioTracks());

    const file = new File(["audio"], "test.mp3", { type: "audio/mp3" });

    await act(async () => {
      await result.current.addTrack(file, mockContext, mockMasterGain);
    });

    const trackId = result.current.tracks[0]!.id;

    act(() => {
      result.current.removeTrack(trackId);
    });

    expect(result.current.tracks).toHaveLength(0);
  });

  it("sets track volume", async () => {
    const { result } = renderHook(() => useAudioTracks());

    const file = new File(["audio"], "test.mp3", { type: "audio/mp3" });

    await act(async () => {
      await result.current.addTrack(file, mockContext, mockMasterGain);
    });

    const trackId = result.current.tracks[0]!.id;

    act(() => {
      result.current.setVolume(trackId, 0.5);
    });

    expect(result.current.tracks[0]!.volume).toBe(0.5);
  });

  it("toggles track mute", async () => {
    const { result } = renderHook(() => useAudioTracks());

    const file = new File(["audio"], "test.mp3", { type: "audio/mp3" });

    await act(async () => {
      await result.current.addTrack(file, mockContext, mockMasterGain);
    });

    const trackId = result.current.tracks[0]!.id;

    expect(result.current.tracks[0]!.muted).toBe(false);

    act(() => {
      result.current.toggleMute(trackId);
    });

    expect(result.current.tracks[0]!.muted).toBe(true);

    act(() => {
      result.current.toggleMute(trackId);
    });

    expect(result.current.tracks[0]!.muted).toBe(false);
  });

  it("toggles track solo", async () => {
    const { result } = renderHook(() => useAudioTracks());

    const file = new File(["audio"], "test.mp3", { type: "audio/mp3" });

    await act(async () => {
      await result.current.addTrack(file, mockContext, mockMasterGain);
    });

    const trackId = result.current.tracks[0]!.id;

    expect(result.current.tracks[0]!.solo).toBe(false);

    act(() => {
      result.current.toggleSolo(trackId);
    });

    expect(result.current.tracks[0]!.solo).toBe(true);
  });

  it("plays a track", async () => {
    const { result } = renderHook(() => useAudioTracks());

    const file = new File(["audio"], "test.mp3", { type: "audio/mp3" });

    await act(async () => {
      await result.current.addTrack(file, mockContext, mockMasterGain);
    });

    const trackId = result.current.tracks[0]!.id;

    act(() => {
      result.current.playTrack(trackId, mockContext, mockMasterGain);
    });

    expect(result.current.tracks[0]!.isPlaying).toBe(true);
    expect(mockSource.start).toHaveBeenCalled();
  });

  it("stops a track", async () => {
    const { result } = renderHook(() => useAudioTracks());

    const file = new File(["audio"], "test.mp3", { type: "audio/mp3" });

    await act(async () => {
      await result.current.addTrack(file, mockContext, mockMasterGain);
    });

    const trackId = result.current.tracks[0]!.id;

    act(() => {
      result.current.playTrack(trackId, mockContext, mockMasterGain);
    });

    act(() => {
      result.current.stopTrack(trackId);
    });

    expect(result.current.tracks[0]!.isPlaying).toBe(false);
  });

  it("plays all tracks", async () => {
    const { result } = renderHook(() => useAudioTracks());

    const file1 = new File(["audio"], "test1.mp3", { type: "audio/mp3" });
    const file2 = new File(["audio"], "test2.mp3", { type: "audio/mp3" });

    await act(async () => {
      await result.current.addTrack(file1, mockContext, mockMasterGain);
      await result.current.addTrack(file2, mockContext, mockMasterGain);
    });

    act(() => {
      result.current.playAllTracks(mockContext, mockMasterGain);
    });

    expect(result.current.tracks[0]!.isPlaying).toBe(true);
    expect(result.current.tracks[1]!.isPlaying).toBe(true);
  });

  it("stops all tracks", async () => {
    const { result } = renderHook(() => useAudioTracks());

    const file = new File(["audio"], "test.mp3", { type: "audio/mp3" });

    await act(async () => {
      await result.current.addTrack(file, mockContext, mockMasterGain);
    });

    act(() => {
      result.current.playTrack(
        result.current.tracks[0]!.id,
        mockContext,
        mockMasterGain,
      );
    });

    act(() => {
      result.current.stopAllTracks();
    });

    expect(result.current.tracks[0]!.isPlaying).toBe(false);
  });

  it("clears all tracks", async () => {
    const { result } = renderHook(() => useAudioTracks());

    const file = new File(["audio"], "test.mp3", { type: "audio/mp3" });

    await act(async () => {
      await result.current.addTrack(file, mockContext, mockMasterGain);
    });

    act(() => {
      result.current.clearTracks();
    });

    expect(result.current.tracks).toHaveLength(0);
  });

  it("respects solo when playing all", async () => {
    const { result } = renderHook(() => useAudioTracks());

    const file1 = new File(["audio"], "test1.mp3", { type: "audio/mp3" });
    const file2 = new File(["audio"], "test2.mp3", { type: "audio/mp3" });

    await act(async () => {
      await result.current.addTrack(file1, mockContext, mockMasterGain);
      await result.current.addTrack(file2, mockContext, mockMasterGain);
    });

    // Solo the first track
    act(() => {
      result.current.toggleSolo(result.current.tracks[0]!.id);
    });

    act(() => {
      result.current.playAllTracks(mockContext, mockMasterGain);
    });

    // Only solo'd track should be playing
    expect(result.current.tracks[0]!.isPlaying).toBe(true);
    expect(result.current.tracks[1]!.isPlaying).toBe(false);
  });
});
