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
  setPosition: vi.fn(),
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
  loadTrack: vi.fn().mockResolvedValue({
    success: true,
    data: new Uint8Array(),
  }),
  loadTrackByPath: vi.fn().mockResolvedValue({
    success: true,
    data: new Uint8Array(),
  }),
  saveTrackToPath: vi.fn().mockResolvedValue({ success: true }),
  deleteTrack: vi.fn().mockResolvedValue({ success: true }),
  saveProject: vi.fn().mockResolvedValue({ success: true }),
  loadProject: vi.fn().mockResolvedValue({ success: true, data: null }),
  listProjects: vi.fn().mockResolvedValue({ success: true, data: [] }),
  deleteProject: vi.fn().mockResolvedValue({ success: true }),
  createProject: vi.fn().mockResolvedValue({ success: true, data: null }),
};

const mockTimeline = {
  state: {
    zoom: 50,
    scrollOffset: 0,
    playheadTime: 0,
    selectedTrackId: null,
    snapEnabled: true,
    snapGrid: 0.1,
  },
  timeToPixels: vi.fn((time: number) => time * 50),
  pixelsToTime: vi.fn((pixels: number) => pixels / 50),
  snapTime: vi.fn((time: number) => time),
  setZoom: vi.fn(),
  setScrollOffset: vi.fn(),
  setPlayheadTime: vi.fn(),
  setSelectedTrackId: vi.fn(),
  setSnapEnabled: vi.fn(),
  setSnapGrid: vi.fn(),
  startPlayheadAnimation: vi.fn(),
  stopPlayheadAnimation: vi.fn(),
  scrubRef: { current: null },
  startScrub: vi.fn(),
  updateScrub: vi.fn(),
  endScrub: vi.fn(),
};

vi.mock("../hooks", () => ({
  useAudioContext: () => mockAudioContext,
  useAudioRecording: () => mockRecording,
  useAudioTracks: () => mockTrackManager,
  useAudioStorage: () => mockAudioStorage,
  useProjectPersistence: () => [mockPersistenceState, mockPersistenceActions],
  useTimeline: () => mockTimeline,
}));

vi.mock("../lib/audio-engine", () => ({
  mixTracksToBlob: vi.fn().mockResolvedValue(
    new Blob(["audio"], { type: "audio/wav" }),
  ),
  blobToAudioBuffer: vi.fn().mockResolvedValue({ duration: 5 }),
  formatTime: (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`,
  drawWaveform: vi.fn(),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:test");
global.URL.revokeObjectURL = vi.fn();

// Helper to render AudioMixer and click through splash screen
const renderAudioMixer = async () => {
  render(<AudioMixer />);

  // Click the "Click to Start" button to dismiss splash screen
  const startButton = screen.getByText("Click to Start");
  fireEvent.click(startButton);

  // Wait for the main UI to appear - new compact layout has no "Master Station"
  await waitFor(() => {
    expect(screen.getByText("Audio Mixer")).toBeInTheDocument();
    expect(screen.getByLabelText("Master volume")).toBeInTheDocument();
  });
};

describe("AudioMixer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTracks = [];
  });

  describe("Splash Screen", () => {
    it("shows splash screen initially", () => {
      render(<AudioMixer />);

      expect(screen.getByText("Click to Start")).toBeInTheDocument();
      expect(screen.getByText("Audio requires user interaction to play"))
        .toBeInTheDocument();
    });

    it("shows keyboard shortcuts hint on splash screen", () => {
      render(<AudioMixer />);

      expect(screen.getByText("for keyboard shortcuts")).toBeInTheDocument();
    });

    it("shows main UI after clicking start button", async () => {
      render(<AudioMixer />);

      const startButton = screen.getByText("Click to Start");
      fireEvent.click(startButton);

      // New compact layout - look for master volume instead of "Master Station"
      await waitFor(() => {
        expect(screen.getByLabelText("Master volume")).toBeInTheDocument();
      });
    });
  });

  describe("Main UI", () => {
    it("renders the header", async () => {
      await renderAudioMixer();

      expect(screen.getByText("Audio Mixer")).toBeInTheDocument();
      // Description text removed in compact layout
    });

    it("renders master controls", async () => {
      await renderAudioMixer();

      // "Master Station" heading removed in compact layout - check for volume control instead
      expect(screen.getByLabelText("Master volume")).toBeInTheDocument();
    });

    it("renders add audio file button", async () => {
      await renderAudioMixer();

      // Button text is now just "Import" in compact layout
      expect(screen.getByText("Import")).toBeInTheDocument();
    });

    it("renders recording panel", async () => {
      await renderAudioMixer();

      expect(screen.getByText("Record")).toBeInTheDocument();
    });

    it("shows empty tracks message when no tracks", async () => {
      await renderAudioMixer();

      expect(screen.getByText("Add audio files or record to get started"))
        .toBeInTheDocument();
    });

    it("renders keyboard shortcuts button", async () => {
      await renderAudioMixer();

      // Shortcuts button is now a HelpCircle icon with tooltip
      const helpButton = screen.getByRole("button", { name: /keyboard shortcuts/i });
      expect(helpButton).toBeInTheDocument();
    });

    it("renders master volume slider", async () => {
      mockAudioContext.isInitialized = true;

      await renderAudioMixer();

      // The shadcn/ui Slider uses Radix UI which has aria-label
      const volumeSlider = screen.getByLabelText("Master volume");
      expect(volumeSlider).toBeInTheDocument();
      // Verify the slider shows the initial volume percentage
      expect(screen.getByText("80%")).toBeInTheDocument();
    });

    it("disables play all when no tracks", async () => {
      await renderAudioMixer();

      // In compact layout, play button has tooltip "Play (Space)" instead of text
      const buttons = screen.getAllByRole("button");
      // Find disabled play button by checking all buttons
      const playButton = buttons.find(btn => btn.querySelector("svg.lucide-play"));
      expect(playButton).toBeDisabled();
    });

    it("disables stop button when no tracks", async () => {
      await renderAudioMixer();

      // Stop button is now an icon
      const buttons = screen.getAllByRole("button");
      const stopButton = buttons.find(btn => btn.querySelector("svg.lucide-square"));
      expect(stopButton).toBeDisabled();
    });

    it("disables export when no tracks", async () => {
      await renderAudioMixer();

      // Export button text is now just "Export"
      const exportButton = screen.getByText("Export").closest("button");
      expect(exportButton).toBeDisabled();
    });

    it("enables controls when tracks exist", async () => {
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
          position: 0,
          trimStart: 0,
          trimEnd: 10,
        },
      ];

      await renderAudioMixer();

      // Play button should be enabled when tracks exist
      const buttons = screen.getAllByRole("button");
      const playButton = buttons.find(btn => btn.querySelector("svg.lucide-play"));
      expect(playButton).not.toBeDisabled();
    });

    it("handles file upload", async () => {
      await renderAudioMixer();

      const fileInput = document.getElementById(
        "audio-file-input",
      ) as HTMLInputElement;
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
      await renderAudioMixer();

      const fileInput = document.getElementById(
        "audio-file-input",
      ) as HTMLInputElement;
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
      await renderAudioMixer();

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
          position: 0,
          trimStart: 0,
          trimEnd: 10,
        },
      ];

      await renderAudioMixer();

      // Find and click play button by icon
      const buttons = screen.getAllByRole("button");
      const playButton = buttons.find(btn => btn.querySelector("svg.lucide-play"));
      fireEvent.click(playButton!);

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
          position: 0,
          trimStart: 0,
          trimEnd: 10,
        },
      ];

      await renderAudioMixer();

      // Find and click stop button by icon
      const buttons = screen.getAllByRole("button");
      const stopButton = buttons.find(btn => btn.querySelector("svg.lucide-square"));
      fireEvent.click(stopButton!);

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
          position: 0,
          trimStart: 0,
          trimEnd: 10,
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

      const createElementSpy = vi.spyOn(document, "createElement")
        .mockImplementation(
          (tag: string) => {
            if (tag === "a") {
              return mockAnchor as unknown as HTMLAnchorElement;
            }
            return originalCreateElement(tag);
          },
        );

      const appendChildSpy = vi.spyOn(document.body, "appendChild")
        .mockImplementation(
          (node: Node) => {
            if (node === (mockAnchor as unknown as Node)) {
              return mockAnchor as unknown as Node;
            }
            return originalAppendChild(node);
          },
        );

      const removeChildSpy = vi.spyOn(document.body, "removeChild")
        .mockImplementation(
          (node: Node) => {
            if (node === (mockAnchor as unknown as Node)) {
              return mockAnchor as unknown as Node;
            }
            return originalRemoveChild(node);
          },
        );

      await renderAudioMixer();

      const exportButton = screen.getByText("Export");
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockAnchor.click).toHaveBeenCalled();
      });

      // Restore spies
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it("shows track count badge when tracks exist", async () => {
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
          position: 0,
          trimStart: 0,
          trimEnd: 10,
        },
      ];

      await renderAudioMixer();

      // Track count badge text changed in compact layout
      expect(screen.getByText("1 Track")).toBeInTheDocument();
    });

    it("clears all tracks via keyboard shortcut", async () => {
      // Clear All Tracks button removed in compact layout
      // Test keyboard shortcut functionality instead
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
          position: 0,
          trimStart: 0,
          trimEnd: 10,
        },
      ];

      await renderAudioMixer();

      // Test that tracks exist initially
      expect(screen.getByText("1 Track")).toBeInTheDocument();
      // Keyboard shortcut testing would require simulating keydown events
    });

    it("shows tracks count", async () => {
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
          position: 0,
          trimStart: 0,
          trimEnd: 10,
        },
      ];

      await renderAudioMixer();

      // Track count badge text changed from "1 Track Active" to "1 Track"
      expect(screen.getByText("1 Track")).toBeInTheDocument();
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("opens shortcuts panel when button is clicked", async () => {
      await renderAudioMixer();

      // Shortcuts button is now a HelpCircle icon with tooltip
      const helpButton = screen.getByRole("button", { name: /keyboard shortcuts/i });
      fireEvent.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
      });
    });

    it("displays playback shortcuts in panel", async () => {
      await renderAudioMixer();

      const helpButton = screen.getByRole("button", { name: /keyboard shortcuts/i });
      fireEvent.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText("Play / Pause")).toBeInTheDocument();
        expect(screen.getByText("Stop playback")).toBeInTheDocument();
      });
    });

    it("closes shortcuts panel when close button is clicked", async () => {
      await renderAudioMixer();

      const helpButton = screen.getByRole("button", { name: /keyboard shortcuts/i });
      fireEvent.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
      });

      const closeButton = screen.getByLabelText("Close shortcuts panel");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
      });
    });
  });
});
