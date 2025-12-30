/**
 * Audio Engine Tests
 * Resolves #332
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  audioBufferToWav,
  blobToAudioBuffer,
  createAnalyser,
  createAudioContext,
  createMasterGain,
  createRecorder,
  createTrackNodes,
  drawWaveform,
  formatTime,
  generateWaveformData,
  loadAudioFile,
  mixTracksToBlob,
} from "./audio-engine";

// Mock values
const mockGainNode = {
  connect: vi.fn(),
  gain: { value: 1 },
};

const mockAnalyserNode = {
  fftSize: 2048,
  frequencyBinCount: 1024,
  connect: vi.fn(),
};

const mockBufferSource = {
  buffer: null as AudioBuffer | null,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockAudioContextInstance = {
  createGain: vi.fn(() => mockGainNode),
  createAnalyser: vi.fn(() => mockAnalyserNode),
  createBufferSource: vi.fn(() => mockBufferSource),
  decodeAudioData: vi.fn(),
  destination: {},
  sampleRate: 44100,
  currentTime: 0,
};

const mockOfflineContextInstance = {
  createGain: vi.fn(() => ({ ...mockGainNode, gain: { value: 1 } })),
  createBufferSource: vi.fn(() => ({ ...mockBufferSource, buffer: null })),
  destination: {},
  startRendering: vi.fn(),
};

const mockMediaRecorderInstance = {
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  ondataavailable: null,
  onstop: null,
  mimeType: "audio/webm",
  state: "inactive",
};

// Store original globals
const originalAudioContext = globalThis.AudioContext;
const originalOfflineAudioContext = globalThis.OfflineAudioContext;
const originalMediaRecorder = globalThis.MediaRecorder;

describe("audio-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock instances
    mockBufferSource.buffer = null;
    mockGainNode.gain.value = 1;

    // Mock AudioContext class
    class MockAudioContext {
      createGain = vi.fn(() => mockGainNode);
      createAnalyser = vi.fn(() => mockAnalyserNode);
      createBufferSource = vi.fn(() => mockBufferSource);
      decodeAudioData = mockAudioContextInstance.decodeAudioData;
      destination = mockAudioContextInstance.destination;
      sampleRate = mockAudioContextInstance.sampleRate;
      currentTime = mockAudioContextInstance.currentTime;
    }

    // Mock OfflineAudioContext class
    class MockOfflineAudioContext {
      createGain = mockOfflineContextInstance.createGain;
      createBufferSource = mockOfflineContextInstance.createBufferSource;
      destination = mockOfflineContextInstance.destination;
      startRendering = mockOfflineContextInstance.startRendering;
    }

    // Mock MediaRecorder class
    class MockMediaRecorder {
      start = mockMediaRecorderInstance.start;
      stop = mockMediaRecorderInstance.stop;
      pause = mockMediaRecorderInstance.pause;
      resume = mockMediaRecorderInstance.resume;
      ondataavailable = mockMediaRecorderInstance.ondataavailable;
      onstop = mockMediaRecorderInstance.onstop;
      mimeType = mockMediaRecorderInstance.mimeType;
      state = mockMediaRecorderInstance.state;
      static isTypeSupported = vi.fn(() => true);
    }

    globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;
    globalThis.OfflineAudioContext =
      MockOfflineAudioContext as unknown as typeof OfflineAudioContext;
    globalThis.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;
  });

  afterEach(() => {
    globalThis.AudioContext = originalAudioContext;
    globalThis.OfflineAudioContext = originalOfflineAudioContext;
    globalThis.MediaRecorder = originalMediaRecorder;
  });

  describe("createAudioContext", () => {
    it("creates a new AudioContext", () => {
      const context = createAudioContext();
      expect(context).toBeDefined();
      expect(context.createGain).toBeDefined();
    });

    it("uses webkitAudioContext if AudioContext not available", () => {
      // @ts-expect-error - testing fallback
      delete globalThis.AudioContext;

      class MockWebkitAudioContext {
        createGain = vi.fn(() => mockGainNode);
      }

      // @ts-expect-error - testing webkit fallback
      globalThis.webkitAudioContext = MockWebkitAudioContext;

      const context = createAudioContext();
      expect(context).toBeDefined();

      // @ts-expect-error - cleanup
      delete globalThis.webkitAudioContext;
    });
  });

  describe("createMasterGain", () => {
    it("creates a gain node connected to destination", () => {
      const context = createAudioContext();
      const gain = createMasterGain(context);

      expect(context.createGain).toHaveBeenCalled();
      expect(mockGainNode.connect).toHaveBeenCalled();
      expect(gain).toBe(mockGainNode);
    });
  });

  describe("createAnalyser", () => {
    it("creates an analyser node with correct fftSize", () => {
      const context = createAudioContext();
      const analyser = createAnalyser(context);

      expect(context.createAnalyser).toHaveBeenCalled();
      expect(analyser.fftSize).toBe(2048);
    });
  });

  describe("loadAudioFile", () => {
    it("loads and decodes audio file", async () => {
      const mockBuffer = { duration: 10 };
      mockAudioContextInstance.decodeAudioData.mockResolvedValue(mockBuffer);

      const context = createAudioContext();
      const mockArrayBuffer = new ArrayBuffer(8);
      const file = {
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
      } as unknown as File;
      const buffer = await loadAudioFile(context, file);

      expect(file.arrayBuffer).toHaveBeenCalled();
      expect(mockAudioContextInstance.decodeAudioData).toHaveBeenCalled();
      expect(buffer).toBe(mockBuffer);
    });
  });

  describe("createTrackNodes", () => {
    it("creates source and gain nodes for a track", () => {
      const context = createAudioContext();
      const mockBuffer = { duration: 10 } as AudioBuffer;
      const result = createTrackNodes(
        context,
        mockGainNode as unknown as GainNode,
        mockBuffer,
      );

      expect(context.createBufferSource).toHaveBeenCalled();
      expect(context.createGain).toHaveBeenCalled();
      expect(result.source.buffer).toBe(mockBuffer);
    });
  });

  describe("generateWaveformData", () => {
    it("generates normalized waveform data", () => {
      const channelData = new Float32Array([0.5, -0.5, 0.3, -0.3, 0.1, -0.1]);
      const mockBuffer = {
        getChannelData: vi.fn(() => channelData),
        length: channelData.length,
      } as unknown as AudioBuffer;

      const waveform = generateWaveformData(mockBuffer, 3);

      expect(mockBuffer.getChannelData).toHaveBeenCalledWith(0);
      expect(waveform.length).toBe(3);
      expect(waveform.every((v) => v >= 0 && v <= 1)).toBe(true);
    });

    it("handles empty buffer", () => {
      const channelData = new Float32Array([]);
      const mockBuffer = {
        getChannelData: vi.fn(() => channelData),
        length: 0,
      } as unknown as AudioBuffer;

      const waveform = generateWaveformData(mockBuffer, 10);
      expect(waveform.length).toBe(10);
    });
  });

  describe("drawWaveform", () => {
    it("draws waveform on canvas", () => {
      const mockCtx = {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        fillStyle: "",
      };

      const mockCanvas = {
        getContext: vi.fn(() => mockCtx),
      } as unknown as HTMLCanvasElement;

      const waveformData = [0.5, 0.8, 0.3, 0.6];

      drawWaveform(mockCanvas, waveformData, 0.5, {
        width: 100,
        height: 50,
        barWidth: 10,
        barGap: 2,
        barColor: "#333",
        progressColor: "#00f",
      });

      expect(mockCanvas.getContext).toHaveBeenCalledWith("2d");
      expect(mockCtx.clearRect).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it("handles null context", () => {
      const mockCanvas = {
        getContext: vi.fn(() => null),
      } as unknown as HTMLCanvasElement;

      expect(() =>
        drawWaveform(mockCanvas, [0.5], 0.5, {
          width: 100,
          height: 50,
          barWidth: 10,
          barGap: 2,
          barColor: "#333",
          progressColor: "#00f",
        })
      ).not.toThrow();
    });
  });

  describe("formatTime", () => {
    it("formats seconds to mm:ss", () => {
      expect(formatTime(0)).toBe("0:00");
      expect(formatTime(30)).toBe("0:30");
      expect(formatTime(60)).toBe("1:00");
      expect(formatTime(90)).toBe("1:30");
      expect(formatTime(125)).toBe("2:05");
    });
  });

  describe("audioBufferToWav", () => {
    it("converts audio buffer to WAV blob", () => {
      const channelData = new Float32Array([0.5, -0.5, 0.3, -0.3]);
      const mockBuffer = {
        numberOfChannels: 1,
        sampleRate: 44100,
        length: 4,
        getChannelData: vi.fn(() => channelData),
      } as unknown as AudioBuffer;

      const blob = audioBufferToWav(mockBuffer);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("audio/wav");
    });

    it("handles stereo buffer", () => {
      const channelData = new Float32Array([0.5, -0.5]);
      const mockBuffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 2,
        getChannelData: vi.fn(() => channelData),
      } as unknown as AudioBuffer;

      const blob = audioBufferToWav(mockBuffer);

      expect(blob).toBeInstanceOf(Blob);
      expect(mockBuffer.getChannelData).toHaveBeenCalledTimes(2);
    });
  });

  describe("mixTracksToBlob", () => {
    it("mixes tracks and returns WAV blob", async () => {
      const channelData = new Float32Array([0.5, -0.5]);
      const mockRenderedBuffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 2,
        getChannelData: vi.fn(() => channelData),
      };

      mockOfflineContextInstance.startRendering.mockResolvedValue(
        mockRenderedBuffer,
      );

      const context = createAudioContext();
      const tracks = [
        {
          id: "1",
          buffer: { duration: 1 } as AudioBuffer,
          muted: false,
          volume: 0.8,
        },
      ];

      const blob = await mixTracksToBlob(
        context,
        tracks as Parameters<typeof mixTracksToBlob>[1],
        1,
      );

      expect(blob).toBeInstanceOf(Blob);
      expect(mockOfflineContextInstance.startRendering).toHaveBeenCalled();
    });

    it("skips muted tracks", async () => {
      const channelData = new Float32Array([0]);
      const mockRenderedBuffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 1,
        getChannelData: vi.fn(() => channelData),
      };

      // Reset mock
      mockOfflineContextInstance.createBufferSource.mockClear();
      mockOfflineContextInstance.startRendering.mockResolvedValue(
        mockRenderedBuffer,
      );

      const context = createAudioContext();
      const tracks = [
        {
          id: "1",
          buffer: { duration: 1 } as AudioBuffer,
          muted: true,
          volume: 0.8,
        },
      ];

      await mixTracksToBlob(
        context,
        tracks as Parameters<typeof mixTracksToBlob>[1],
        1,
      );

      // Source should not be created for muted track
      expect(mockOfflineContextInstance.createBufferSource).not
        .toHaveBeenCalled();
    });
  });

  describe("createRecorder", () => {
    it("creates MediaRecorder with webm if supported", () => {
      const mockStream = {} as MediaStream;
      const recorder = createRecorder(mockStream);

      expect(recorder).toBeDefined();
    });

    it("falls back to mp4 if webm not supported", () => {
      class MockMediaRecorderMp4 {
        start = vi.fn();
        static isTypeSupported = vi.fn(() => false);
      }

      globalThis.MediaRecorder = MockMediaRecorderMp4 as unknown as typeof MediaRecorder;

      const mockStream = {} as MediaStream;
      const recorder = createRecorder(mockStream);

      expect(recorder).toBeDefined();
    });
  });

  describe("blobToAudioBuffer", () => {
    it("converts blob to audio buffer", async () => {
      const mockBuffer = { duration: 10 };
      mockAudioContextInstance.decodeAudioData.mockResolvedValue(mockBuffer);

      const context = createAudioContext();
      const mockArrayBuffer = new ArrayBuffer(8);
      const blob = {
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
      } as unknown as Blob;
      const buffer = await blobToAudioBuffer(context, blob);

      expect(blob.arrayBuffer).toHaveBeenCalled();
      expect(mockAudioContextInstance.decodeAudioData).toHaveBeenCalled();
      expect(buffer).toBe(mockBuffer);
    });
  });
});
