/**
 * useAudioTracks - Hook for managing audio tracks
 * Resolves #332
 */

"use client";

import { useCallback, useReducer, useRef } from "react";
import { createTrackNodes, generateWaveformData, loadAudioFile } from "../lib/audio-engine";
import type { AudioTrack, TrackAction } from "../types";

function generateId(): string {
  return `track-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function tracksReducer(state: AudioTrack[], action: TrackAction): AudioTrack[] {
  switch (action.type) {
    case "ADD_TRACK":
      return [
        ...state,
        {
          id: generateId(),
          name: "New Track",
          source: null,
          buffer: null,
          gainNode: null,
          volume: 0.8,
          pan: 0,
          muted: false,
          solo: false,
          isPlaying: false,
          duration: 0,
          currentTime: 0,
          waveformData: [],
          type: "file",
          ...action.payload,
        },
      ];
    case "REMOVE_TRACK":
      return state.filter((track) => track.id !== action.payload);
    case "UPDATE_TRACK":
      return state.map((track) =>
        track.id === action.payload.id ? { ...track, ...action.payload.updates } : track
      );
    case "SET_VOLUME":
      return state.map((track) =>
        track.id === action.payload.id ? { ...track, volume: action.payload.volume } : track
      );
    case "SET_PAN":
      return state.map((track) =>
        track.id === action.payload.id ? { ...track, pan: action.payload.pan } : track
      );
    case "TOGGLE_MUTE":
      return state.map((track) =>
        track.id === action.payload ? { ...track, muted: !track.muted } : track
      );
    case "TOGGLE_SOLO":
      return state.map((track) =>
        track.id === action.payload ? { ...track, solo: !track.solo } : track
      );
    case "PLAY_TRACK":
      return state.map((track) =>
        track.id === action.payload ? { ...track, isPlaying: true } : track
      );
    case "STOP_TRACK":
      return state.map((track) =>
        track.id === action.payload ? { ...track, isPlaying: false, currentTime: 0 } : track
      );
    case "CLEAR_TRACKS":
      return [];
    default:
      return state;
  }
}

export function useAudioTracks() {
  const [tracks, dispatch] = useReducer(tracksReducer, []);
  const sourceRefs = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const startTimeRefs = useRef<Map<string, number>>(new Map());

  const addTrack = useCallback(
    async (
      file: File,
      context: AudioContext,
      masterGain: GainNode,
    ): Promise<AudioTrack> => {
      const buffer = await loadAudioFile(context, file);
      const waveformData = generateWaveformData(buffer, 100);
      const { gainNode } = createTrackNodes(context, masterGain, buffer);

      const track: Partial<AudioTrack> = {
        name: file.name.replace(/\.[^.]+$/, ""),
        buffer,
        gainNode,
        duration: buffer.duration,
        waveformData,
        type: "file",
        file,
      };

      dispatch({ type: "ADD_TRACK", payload: track });

      return {
        id: "",
        source: null,
        volume: 0.8,
        pan: 0,
        muted: false,
        solo: false,
        isPlaying: false,
        currentTime: 0,
        ...track,
      } as AudioTrack;
    },
    [],
  );

  const addRecordedTrack = useCallback(
    async (
      buffer: AudioBuffer,
      context: AudioContext,
      masterGain: GainNode,
      name: string = "Recording",
    ): Promise<void> => {
      const waveformData = generateWaveformData(buffer, 100);
      const { gainNode } = createTrackNodes(context, masterGain, buffer);

      dispatch({
        type: "ADD_TRACK",
        payload: {
          name,
          buffer,
          gainNode,
          duration: buffer.duration,
          waveformData,
          type: "recording",
        },
      });
    },
    [],
  );

  const removeTrack = useCallback((id: string) => {
    const source = sourceRefs.current.get(id);
    if (source) {
      try {
        source.stop();
      } catch {
        // Already stopped
      }
      sourceRefs.current.delete(id);
    }
    startTimeRefs.current.delete(id);
    dispatch({ type: "REMOVE_TRACK", payload: id });
  }, []);

  const setVolume = useCallback(
    (id: string, volume: number) => {
      const track = tracks.find((t) => t.id === id);
      if (track?.gainNode) {
        track.gainNode.gain.value = volume;
      }
      dispatch({ type: "SET_VOLUME", payload: { id, volume } });
    },
    [tracks],
  );

  const toggleMute = useCallback(
    (id: string) => {
      const track = tracks.find((t) => t.id === id);
      if (track?.gainNode) {
        track.gainNode.gain.value = track.muted ? track.volume : 0;
      }
      dispatch({ type: "TOGGLE_MUTE", payload: id });
    },
    [tracks],
  );

  const toggleSolo = useCallback((id: string) => {
    dispatch({ type: "TOGGLE_SOLO", payload: id });
  }, []);

  const playTrack = useCallback(
    (id: string, context: AudioContext, masterGain: GainNode) => {
      const track = tracks.find((t) => t.id === id);
      if (!track?.buffer) return;

      // Stop existing playback
      const existingSource = sourceRefs.current.get(id);
      if (existingSource) {
        try {
          existingSource.stop();
        } catch {
          // Already stopped
        }
      }

      const source = context.createBufferSource();
      source.buffer = track.buffer;

      const gainNode = context.createGain();
      gainNode.gain.value = track.muted ? 0 : track.volume;

      source.connect(gainNode);
      gainNode.connect(masterGain);

      source.onended = () => {
        dispatch({ type: "STOP_TRACK", payload: id });
        sourceRefs.current.delete(id);
      };

      source.start(0, track.currentTime);
      sourceRefs.current.set(id, source);
      startTimeRefs.current.set(id, context.currentTime - track.currentTime);

      dispatch({ type: "PLAY_TRACK", payload: id });
    },
    [tracks],
  );

  const stopTrack = useCallback((id: string) => {
    const source = sourceRefs.current.get(id);
    if (source) {
      try {
        source.stop();
      } catch {
        // Already stopped
      }
      sourceRefs.current.delete(id);
    }
    startTimeRefs.current.delete(id);
    dispatch({ type: "STOP_TRACK", payload: id });
  }, []);

  const stopAllTracks = useCallback(() => {
    tracks.forEach((track) => {
      stopTrack(track.id);
    });
  }, [tracks, stopTrack]);

  const playAllTracks = useCallback(
    (context: AudioContext, masterGain: GainNode) => {
      const hasSolo = tracks.some((t) => t.solo);

      tracks.forEach((track) => {
        if (track.buffer) {
          const shouldPlay = hasSolo ? track.solo : !track.muted;
          if (shouldPlay) {
            playTrack(track.id, context, masterGain);
          }
        }
      });
    },
    [tracks, playTrack],
  );

  const clearTracks = useCallback(() => {
    stopAllTracks();
    sourceRefs.current.clear();
    startTimeRefs.current.clear();
    dispatch({ type: "CLEAR_TRACKS" });
  }, [stopAllTracks]);

  return {
    tracks,
    addTrack,
    addRecordedTrack,
    removeTrack,
    setVolume,
    toggleMute,
    toggleSolo,
    playTrack,
    stopTrack,
    playAllTracks,
    stopAllTracks,
    clearTracks,
  };
}
