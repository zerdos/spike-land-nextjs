/**
 * AudioMixer Component Tests
 * Resolves #332
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioMixer } from "./AudioMixer";

// Mock hooks
const mockInitialize = vi.fn().mockResolvedValue({
  context: {},
  masterGain: {},
  analyser: {},
});

const mockAudioContext = {
  isInitialized: false,
  initialize: mockInitialize,
  setMasterVolume: vi.fn(),
  cleanup: vi.fn(),
};

const mockRecording = {
  isRecording: false,
  isPaused: false,
  duration: 0,
  startRecording: vi.fn().mockResolvedValue(true),
  pauseRecording: vi.fn(),
  resumeRecording: vi.fn(),
  stopRecording: vi.fn(),
  cancelRecording: vi.fn(),
  getRecordingAsBuffer: vi.fn().mockResolvedValue({ duration: 5 }),
};

let mockTracks: unknown[] = [];

const mockTrackManager = {
  get tracks() {
    return mockTracks;
  },
  addTrack: vi.fn().mockResolvedValue({ id: "track-1" }),
  addRecordedTrack: vi.fn(),
  removeTrack: vi.fn(),
  setVolume: vi.fn(),
  toggleMute: vi.fn(),
  toggleSolo: vi.fn(),
  setDelay: vi.fn(),
  setTrim: vi.fn(),
  reorderTracks: vi.fn(),
  restoreTracks: vi.fn(),
  playTrack: vi.fn(),
  stopTrack: vi.fn(),
  playAllTracks: vi.fn(),
  stopAllTracks: vi.fn(),
  clearTracks: vi.fn(),
};

const mockPersistenceState = {
  projectId: "test-project",
  isLoading: false,
  isSaving: false,
  lastSavedAt: null,
  hasUnsavedChanges: false,
};

const mockPersistenceActions = {
  saveNow: vi.fn(),
  loadProject: vi.fn().mockReturnValue(null),
  clearProject: vi.fn(),
  createNewProject: vi.fn().mockReturnValue("new-project-id"),
};

const mockAudioStorage = {
  checkSupport: vi.fn().mockResolvedValue(true),
  saveTrack: vi.fn().mockResolvedValue({ success: true }),
  loadTrack: vi.fn().mockResolvedValue({ success: true, data: new Uint8Array() }),
  loadTrackByPath: vi.fn().mockResolvedValue({ success: true, data: new Uint8Array() }),
  saveTrackToPath: vi.fn().mockResolvedValue({ success: true }),
  deleteTrack: vi.fn().mockResolvedValue({ success: true }),
  saveProject: vi.fn().mockResolvedValue({ success: true }),
  loadProject: vi.fn().mockResolvedValue({ success: true, data: null }),
  listProjects: vi.fn().mockResolvedValue({ success: true, data: [] }),
  deleteProject: vi.fn().mockResolvedValue({ success: true }),
  createProject: vi.fn().mockResolvedValue({ success: true, data: null }),
};

vi.mock("../hooks", () => ({
  useAudioContext: () => mockAudioContext,
  useAudioRecording: () => mockRecording,
  useAudioTracks: () => mockTrackManager,
  useAudioStorage: () => mockAudioStorage,
  useProjectPersistence: () => [mockPersistenceState, mockPersistenceActions],
}));

vi.mock("../lib/audio-engine", () => ({
  mixTracksToBlob: vi.fn().mockResolvedValue(new Blob(["audio"], { type: "audio/wav" })),
  blobToAudioBuffer: vi.fn().mockResolvedValue({ duration: 5 }),
  formatTime: (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`,
  drawWaveform: vi.fn(),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:test");
global.URL.revokeObjectURL = vi.fn();

describe("AudioMixer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTracks = [];
  });

  it("renders the header", () => {
    render(<AudioMixer />);

    expect(screen.getByText("Audio Mixer")).toBeInTheDocument();
    expect(screen.getByText("Layer tracks and record your own audio")).toBeInTheDocument();
  });

  it("renders master controls", () => {
    render(<AudioMixer />);

    expect(screen.getByText("Master Controls")).toBeInTheDocument();
    expect(screen.getByLabelText("Master volume")).toBeInTheDocument();
  });

  it("renders add audio file button", () => {
    render(<AudioMixer />);

    expect(screen.getByText("Add Audio File")).toBeInTheDocument();
  });

  it("renders recording panel", () => {
    render(<AudioMixer />);

    expect(screen.getByText("Record")).toBeInTheDocument();
  });

  it("shows empty tracks message when no tracks", () => {
    render(<AudioMixer />);

    expect(screen.getByText("No tracks yet. Add an audio file or record something!"))
      .toBeInTheDocument();
  });

  it("updates master volume when slider changes", async () => {
    mockAudioContext.isInitialized = true;

    render(<AudioMixer />);

    const volumeSlider = screen.getByLabelText("Master volume");
    fireEvent.change(volumeSlider, { target: { value: "0.5" } });

    await waitFor(() => {
      expect(mockAudioContext.setMasterVolume).toHaveBeenCalledWith(0.5);
    });
  });

  it("disables play all when no tracks", () => {
    render(<AudioMixer />);

    const playAllButton = screen.getByText("Play All").closest("button");
    expect(playAllButton).toBeDisabled();
  });

  it("disables stop button when no tracks", () => {
    render(<AudioMixer />);

    const stopButton = screen.getByText("Stop").closest("button");
    expect(stopButton).toBeDisabled();
  });

  it("disables export when no tracks", () => {
    render(<AudioMixer />);

    const exportButton = screen.getByText("Export Mix").closest("button");
    expect(exportButton).toBeDisabled();
  });

  it("enables controls when tracks exist", () => {
    mockTracks = [
      {
        id: "track-1",
        name: "Test Track",
        volume: 0.8,
        muted: false,
        solo: false,
        isPlaying: false,
        duration: 10,
        currentTime: 0,
        waveformData: [0.5],
        type: "file",
        delay: 0,
        trimStart: 0,
        trimEnd: 0,
      },
    ];

    render(<AudioMixer />);

    const playAllButton = screen.getByText("Play All").closest("button");
    expect(playAllButton).not.toBeDisabled();
  });

  it("handles file upload", async () => {
    render(<AudioMixer />);

    const fileInput = document.getElementById("audio-file-input") as HTMLInputElement;
    const file = new File(["audio"], "test.mp3", { type: "audio/mp3" });

    Object.defineProperty(fileInput, "files", {
      value: [file],
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalled();
      expect(mockTrackManager.addTrack).toHaveBeenCalled();
    });
  });

  it("ignores non-audio files", async () => {
    render(<AudioMixer />);

    const fileInput = document.getElementById("audio-file-input") as HTMLInputElement;
    const file = new File(["text"], "test.txt", { type: "text/plain" });

    Object.defineProperty(fileInput, "files", {
      value: [file],
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(mockTrackManager.addTrack).not.toHaveBeenCalled();
    });
  });

  it("starts recording when record button is clicked", async () => {
    render(<AudioMixer />);

    const recordButton = screen.getByText("Record");
    fireEvent.click(recordButton);

    await waitFor(() => {
      expect(mockRecording.startRecording).toHaveBeenCalled();
    });
  });

  it("plays all tracks when play all is clicked", async () => {
    mockTracks = [
      {
        id: "track-1",
        name: "Test Track",
        volume: 0.8,
        muted: false,
        solo: false,
        isPlaying: false,
        duration: 10,
        currentTime: 0,
        waveformData: [0.5],
        type: "file",
        delay: 0,
        trimStart: 0,
        trimEnd: 0,
      },
    ];

    render(<AudioMixer />);

    const playAllButton = screen.getByText("Play All");
    fireEvent.click(playAllButton);

    await waitFor(() => {
      expect(mockTrackManager.playAllTracks).toHaveBeenCalled();
    });
  });

  it("stops all tracks when stop is clicked", async () => {
    mockTracks = [
      {
        id: "track-1",
        name: "Test Track",
        volume: 0.8,
        muted: false,
        solo: false,
        isPlaying: true,
        duration: 10,
        currentTime: 0,
        waveformData: [0.5],
        type: "file",
        delay: 0,
        trimStart: 0,
        trimEnd: 0,
      },
    ];

    render(<AudioMixer />);

    const stopButton = screen.getByText("Stop");
    fireEvent.click(stopButton);

    expect(mockTrackManager.stopAllTracks).toHaveBeenCalled();
  });

  it("exports mix when export button is clicked", async () => {
    mockTracks = [
      {
        id: "track-1",
        name: "Test Track",
        volume: 0.8,
        muted: false,
        solo: false,
        isPlaying: false,
        duration: 10,
        currentTime: 0,
        waveformData: [0.5],
        type: "file",
        delay: 0,
        trimStart: 0,
        trimEnd: 0,
      },
    ];

    // Store original methods
    const originalCreateElement = document.createElement.bind(document);
    const originalAppendChild = document.body.appendChild.bind(document.body);
    const originalRemoveChild = document.body.removeChild.bind(document.body);

    // Mock document.createElement and appendChild
    const mockAnchor = {
      href: "",
      download: "",
      click: vi.fn(),
    };

    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation(
      (tag: string) => {
        if (tag === "a") {
          return mockAnchor as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tag);
      },
    );

    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(
      (node: Node) => {
        if (node === mockAnchor) {
          return mockAnchor as unknown as Node;
        }
        return originalAppendChild(node);
      },
    );

    const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation(
      (node: Node) => {
        if (node === mockAnchor) {
          return mockAnchor as unknown as Node;
        }
        return originalRemoveChild(node);
      },
    );

    render(<AudioMixer />);

    const exportButton = screen.getByText("Export Mix");
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    // Restore spies
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it("shows clear all button when tracks exist", () => {
    mockTracks = [
      {
        id: "track-1",
        name: "Test Track",
        volume: 0.8,
        muted: false,
        solo: false,
        isPlaying: false,
        duration: 10,
        currentTime: 0,
        waveformData: [0.5],
        type: "file",
        delay: 0,
        trimStart: 0,
        trimEnd: 0,
      },
    ];

    render(<AudioMixer />);

    expect(screen.getByText("Clear All Tracks")).toBeInTheDocument();
  });

  it("clears all tracks when clear button is clicked", () => {
    mockTracks = [
      {
        id: "track-1",
        name: "Test Track",
        volume: 0.8,
        muted: false,
        solo: false,
        isPlaying: false,
        duration: 10,
        currentTime: 0,
        waveformData: [0.5],
        type: "file",
        delay: 0,
        trimStart: 0,
        trimEnd: 0,
      },
    ];

    render(<AudioMixer />);

    const clearButton = screen.getByText("Clear All Tracks");
    fireEvent.click(clearButton);

    expect(mockTrackManager.clearTracks).toHaveBeenCalled();
  });

  it("shows tracks count", () => {
    mockTracks = [
      {
        id: "track-1",
        name: "Test Track",
        volume: 0.8,
        muted: false,
        solo: false,
        isPlaying: false,
        duration: 10,
        currentTime: 0,
        waveformData: [0.5],
        type: "file",
        delay: 0,
        trimStart: 0,
        trimEnd: 0,
      },
    ];

    render(<AudioMixer />);

    expect(screen.getByText("Tracks (1)")).toBeInTheDocument();
  });
});
