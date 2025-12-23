/**
 * useProjectPersistence Hook Tests
 * Resolves #332
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioTrack } from "../types";
import { useProjectPersistence } from "./useProjectPersistence";

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};

beforeEach(() => {
  vi.useFakeTimers();

  // Clear mock storage
  Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);

  // Mock localStorage
  Object.defineProperty(global, "localStorage", {
    value: {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
    },
    writable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useProjectPersistence", () => {
  const mockTrack: AudioTrack = {
    id: "track-1",
    name: "Test Track",
    source: null,
    buffer: null,
    gainNode: null,
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    isPlaying: false,
    duration: 120,
    currentTime: 0,
    waveformData: [0.5, 0.6, 0.7],
    type: "file",
    delay: 0,
    position: 0,
    trimStart: 0,
    trimEnd: 0,
  };

  it("initializes with default state", () => {
    const { result } = renderHook(() => useProjectPersistence([], 0.8));

    const [state] = result.current;

    expect(state.projectId).toBeDefined();
    expect(state.projectId).toMatch(/^project-/);
    expect(state.isLoading).toBe(true);
    expect(state.isSaving).toBe(false);
    expect(state.lastSavedAt).toBe(null);
    expect(state.hasUnsavedChanges).toBe(false);
  });

  it("loads project ID from localStorage", () => {
    mockLocalStorage["audio-mixer-project-id"] = "existing-project-123";

    const { result } = renderHook(() => useProjectPersistence([], 0.8));

    const [state] = result.current;
    expect(state.projectId).toBe("existing-project-123");
  });

  it("marks as loaded after initial delay", () => {
    const { result } = renderHook(() => useProjectPersistence([], 0.8));

    expect(result.current[0].isLoading).toBe(true);

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current[0].isLoading).toBe(false);
  });

  it("auto-saves after debounce period when tracks change", () => {
    const { result, rerender } = renderHook(
      ({ tracks, masterVolume }) => useProjectPersistence(tracks, masterVolume),
      { initialProps: { tracks: [] as AudioTrack[], masterVolume: 0.8 } },
    );

    // Wait for loading to complete
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Add a track
    rerender({ tracks: [mockTrack], masterVolume: 0.8 });

    expect(result.current[0].hasUnsavedChanges).toBe(true);

    // Wait for debounce
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(localStorage.setItem).toHaveBeenCalled();
    expect(result.current[0].hasUnsavedChanges).toBe(false);
    expect(result.current[0].lastSavedAt).not.toBe(null);
  });

  it("does not auto-save empty state", () => {
    renderHook(() => useProjectPersistence([], 0.8));

    // Wait for loading to complete
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Wait for potential debounce
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    // Should not have saved since there are no tracks
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "audio-mixer-project-id",
      expect.any(String),
    );
    // But should NOT have saved the project state
    expect(localStorage.setItem).not.toHaveBeenCalledWith(
      "audio-mixer-project-state",
      expect.any(String),
    );
  });

  it("saveNow triggers immediate save", () => {
    const { result, rerender } = renderHook(
      ({ tracks, masterVolume }) => useProjectPersistence(tracks, masterVolume),
      { initialProps: { tracks: [] as AudioTrack[], masterVolume: 0.8 } },
    );

    // Wait for loading
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Add track
    rerender({ tracks: [mockTrack], masterVolume: 0.8 });

    const [, actions] = result.current;

    act(() => {
      actions.saveNow();
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "audio-mixer-project-state",
      expect.any(String),
    );
  });

  it("loadProject returns saved state", () => {
    const savedState = {
      id: "saved-project",
      name: "Audio Mixer Project",
      masterVolume: 0.75,
      tracks: [
        {
          id: "track-1",
          name: "Saved Track",
          volume: 0.9,
          pan: 0,
          muted: false,
          solo: false,
          delay: 1,
          trimStart: 0,
          trimEnd: 0,
          duration: 60,
          type: "file",
          waveformData: [0.5],
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    mockLocalStorage["audio-mixer-project-state"] = JSON.stringify(savedState);

    const { result } = renderHook(() => useProjectPersistence([], 0.8));

    const [, actions] = result.current;
    const loaded = actions.loadProject();

    expect(loaded).not.toBe(null);
    expect(loaded?.id).toBe("saved-project");
    expect(loaded?.tracks.length).toBe(1);
    expect(loaded?.tracks[0]!.name).toBe("Saved Track");
  });

  it("loadProject returns null for invalid JSON", () => {
    mockLocalStorage["audio-mixer-project-state"] = "invalid-json";

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useProjectPersistence([], 0.8));

    const [, actions] = result.current;
    const loaded = actions.loadProject();

    expect(loaded).toBe(null);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("clearProject removes saved state", () => {
    mockLocalStorage["audio-mixer-project-state"] = "{}";
    mockLocalStorage["audio-mixer-project-id"] = "test-id";

    const { result } = renderHook(() => useProjectPersistence([], 0.8));

    const [, actions] = result.current;

    act(() => {
      actions.clearProject();
    });

    expect(localStorage.removeItem).toHaveBeenCalledWith("audio-mixer-project-state");
    expect(localStorage.removeItem).toHaveBeenCalledWith("audio-mixer-project-id");
  });

  it("createNewProject generates new ID and clears state", () => {
    const { result } = renderHook(() => useProjectPersistence([], 0.8));

    const [initialState, actions] = result.current;
    const initialId = initialState.projectId;

    let newId: string;
    act(() => {
      newId = actions.createNewProject();
    });

    expect(newId!).not.toBe(initialId);
    expect(newId!).toMatch(/^project-/);
    expect(result.current[0].projectId).toBe(newId!);
  });

  it("serializes tracks correctly", () => {
    const { result, rerender } = renderHook(
      ({ tracks, masterVolume }) => useProjectPersistence(tracks, masterVolume),
      { initialProps: { tracks: [] as AudioTrack[], masterVolume: 0.8 } },
    );

    // Wait for loading
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Add track with all properties
    const fullTrack: AudioTrack = {
      ...mockTrack,
      delay: 2,
      trimStart: 5,
      trimEnd: 110,
    };
    rerender({ tracks: [fullTrack], masterVolume: 0.75 });

    const [, actions] = result.current;

    act(() => {
      actions.saveNow();
    });

    const savedCall = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: string[]) => call[0] === "audio-mixer-project-state",
    );

    expect(savedCall).toBeDefined();
    const savedData = JSON.parse(savedCall![1]);

    expect(savedData.masterVolume).toBe(0.75);
    expect(savedData.tracks.length).toBe(1);
    expect(savedData.tracks[0].delay).toBe(2);
    expect(savedData.tracks[0].trimStart).toBe(5);
    expect(savedData.tracks[0].trimEnd).toBe(110);
  });

  it("persists project ID to localStorage on change", () => {
    const { result } = renderHook(() => useProjectPersistence([], 0.8));

    const [, actions] = result.current;

    act(() => {
      actions.createNewProject();
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "audio-mixer-project-id",
      expect.stringMatching(/^project-/),
    );
  });
});
