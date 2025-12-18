/**
 * useAudioRecording - Hook for recording audio from microphone
 * Resolves #332
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { blobToAudioBuffer, createRecorder } from "../lib/audio-engine";
import type { RecordingState } from "../types";

export function useAudioRecording() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    mediaRecorder: null,
    chunks: [],
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = createRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;

      // Update duration timer
      timerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000;
        setState((prev) => ({ ...prev, duration: elapsed }));
      }, 100);

      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        mediaRecorder,
        chunks: [],
      });

      return true;
    } catch (error) {
      console.error("Failed to start recording:", error);
      return false;
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setState((prev) => ({ ...prev, isPaused: true }));
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      const pauseTime = Date.now();
      mediaRecorderRef.current.resume();

      // Update timer
      timerRef.current = window.setInterval(() => {
        pausedDurationRef.current += Date.now() - pauseTime;
        const elapsed = (Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000;
        setState((prev) => ({ ...prev, duration: elapsed }));
      }, 100);

      setState((prev) => ({ ...prev, isPaused: false }));
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || "audio/webm",
        });

        // Stop all tracks
        streamRef.current?.getTracks().forEach((track) => track.stop());

        setState({
          isRecording: false,
          isPaused: false,
          duration: 0,
          mediaRecorder: null,
          chunks: [],
        });

        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Already stopped
      }
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());

    chunksRef.current = [];
    mediaRecorderRef.current = null;
    streamRef.current = null;

    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      mediaRecorder: null,
      chunks: [],
    });
  }, []);

  const getRecordingAsBuffer = useCallback(
    async (context: AudioContext): Promise<AudioBuffer | null> => {
      const blob = await stopRecording();
      if (!blob) return null;
      return blobToAudioBuffer(context, blob);
    },
    [stopRecording],
  );

  return {
    ...state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    getRecordingAsBuffer,
  };
}
