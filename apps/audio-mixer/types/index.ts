/**
 * Audio Mixer Types
 * Resolves #332
 */

export interface AudioTrack {
  id: string;
  name: string;
  source: AudioBufferSourceNode | null;
  buffer: AudioBuffer | null;
  gainNode: GainNode | null;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  waveformData: number[];
  type: "file" | "recording";
  file?: File;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  mediaRecorder: MediaRecorder | null;
  chunks: Blob[];
}

export interface MixerState {
  tracks: AudioTrack[];
  masterVolume: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bpm: number;
}

export interface AudioContextState {
  context: AudioContext | null;
  masterGain: GainNode | null;
  analyser: AnalyserNode | null;
  isInitialized: boolean;
}

export interface WaveformOptions {
  width: number;
  height: number;
  barWidth: number;
  barGap: number;
  barColor: string;
  progressColor: string;
}

export type TrackAction =
  | { type: "ADD_TRACK"; payload: Partial<AudioTrack>; }
  | { type: "REMOVE_TRACK"; payload: string; }
  | { type: "UPDATE_TRACK"; payload: { id: string; updates: Partial<AudioTrack>; }; }
  | { type: "SET_VOLUME"; payload: { id: string; volume: number; }; }
  | { type: "SET_PAN"; payload: { id: string; pan: number; }; }
  | { type: "TOGGLE_MUTE"; payload: string; }
  | { type: "TOGGLE_SOLO"; payload: string; }
  | { type: "PLAY_TRACK"; payload: string; }
  | { type: "STOP_TRACK"; payload: string; }
  | { type: "CLEAR_TRACKS"; };

export interface MixerControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setMasterVolume: (volume: number) => void;
  exportMix: () => Promise<Blob>;
}
