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
          delay: 0,
          position: 0,
          trimStart: 0,
          trimEnd: 0,
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
    case "SET_DELAY":
      return state.map((track) =>
        track.id === action.payload.id
          ? { ...track, delay: Math.max(-5, Math.min(10, action.payload.delay)) }
          : track
      );
    case "SET_POSITION":
      return state.map((track) =>
        track.id === action.payload.id
          ? { ...track, position: Math.max(0, action.payload.position) }
          : track
      );
    case "SET_TRIM":
      return state.map((track) =>
        track.id === action.payload.id
          ? {
            ...track,
            // Allow negative trimStart for lead-in silence (up to -30s)
            trimStart: Math.max(-30, action.payload.trimStart),
            trimEnd: Math.min(track.duration || Infinity, action.payload.trimEnd),
          }
          : track
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
    case "REORDER_TRACKS": {
      const orderMap = new Map(action.payload.map((id, index) => [id, index]));
      return [...state].sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    }
    case "RESTORE_TRACKS":
      return action.payload.map((trackData) => ({
        id: trackData.id || generateId(),
        name: trackData.name || "Restored Track",
        source: null,
        buffer: trackData.buffer || null,
        gainNode: trackData.gainNode || null,
        volume: trackData.volume ?? 0.8,
        pan: trackData.pan ?? 0,
        muted: trackData.muted ?? false,
        solo: trackData.solo ?? false,
        isPlaying: false,
        duration: trackData.duration ?? 0,
        currentTime: 0,
        waveformData: trackData.waveformData ?? [],
        type: trackData.type ?? "file",
        file: trackData.file,
        delay: trackData.delay ?? 0,
        // Migration: use position if present, otherwise fall back to delay
        position: trackData.position ?? trackData.delay ?? 0,
        trimStart: trackData.trimStart ?? 0,
        trimEnd: trackData.trimEnd ?? 0,
      }));
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
      opfsPath?: string,
    ): Promise<AudioTrack> => {
      const buffer = await loadAudioFile(context, file);
      const waveformData = generateWaveformData(buffer, 100);
      const { gainNode } = createTrackNodes(context, masterGain, buffer);

      // Generate ID upfront so we can return it
      const trackId = generateId();

      const track: Partial<AudioTrack> = {
        id: trackId,
        name: file.name.replace(/\.[^.]+$/, ""),
        buffer,
        gainNode,
        duration: buffer.duration,
        waveformData,
        type: "file",
        file,
        opfsPath,
        trimEnd: buffer.duration,
      };

      dispatch({ type: "ADD_TRACK", payload: track });

      return {
        id: trackId,
        source: null,
        volume: 0.8,
        pan: 0,
        muted: false,
        solo: false,
        isPlaying: false,
        currentTime: 0,
        delay: 0,
        position: 0,
        trimStart: 0,
        trimEnd: buffer.duration,
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
      opfsPath?: string,
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
          opfsPath,
          trimEnd: buffer.duration,
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

  const setDelay = useCallback((id: string, delay: number) => {
    dispatch({ type: "SET_DELAY", payload: { id, delay } });
  }, []);

  const setPosition = useCallback((id: string, position: number) => {
    dispatch({ type: "SET_POSITION", payload: { id, position } });
  }, []);

  const setTrim = useCallback((id: string, trimStart: number, trimEnd: number) => {
    dispatch({ type: "SET_TRIM", payload: { id, trimStart, trimEnd } });
  }, []);

  const reorderTracks = useCallback((newOrder: string[]) => {
    dispatch({ type: "REORDER_TRACKS", payload: newOrder });
  }, []);

  const restoreTracks = useCallback((trackStates: Partial<AudioTrack>[]) => {
    dispatch({ type: "RESTORE_TRACKS", payload: trackStates });
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

      // Calculate effective playback parameters with position and trim
      const effectiveTrimEnd = track.trimEnd > 0 ? track.trimEnd : track.duration;
      const trackPosition = track.position ?? track.delay ?? 0;

      // Handle negative trimStart (lead-in silence)
      let playbackOffset: number;
      let playbackDuration: number;
      let scheduleDelay: number;

      if (track.trimStart < 0) {
        // Negative trimStart: add silence before audio
        const silenceDuration = Math.abs(track.trimStart);
        const currentTimeInTrack = track.currentTime;

        if (currentTimeInTrack < silenceDuration) {
          // Still in the silence region - schedule audio to start after remaining silence
          scheduleDelay = silenceDuration - currentTimeInTrack;
          playbackOffset = 0;
          playbackDuration = effectiveTrimEnd;
        } else {
          // Past the silence - start audio from offset
          scheduleDelay = 0;
          playbackOffset = currentTimeInTrack - silenceDuration;
          playbackDuration = Math.max(0, effectiveTrimEnd - playbackOffset);
        }
      } else {
        // Normal positive trimStart
        scheduleDelay = 0;
        playbackOffset = track.trimStart + track.currentTime;
        const trimmedDuration = effectiveTrimEnd - track.trimStart;
        playbackDuration = Math.max(0, trimmedDuration - track.currentTime);
      }

      // Calculate when to start
      const startTime = Math.max(0, context.currentTime + trackPosition + scheduleDelay);

      source.start(startTime, playbackOffset, playbackDuration);
      sourceRefs.current.set(id, source);
      startTimeRefs.current.set(id, context.currentTime - track.currentTime + trackPosition);

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
    setDelay,
    setPosition,
    setTrim,
    reorderTracks,
    restoreTracks,
    playTrack,
    stopTrack,
    playAllTracks,
    stopAllTracks,
    clearTracks,
  };
}
