/**
 * AudioMixer Component - Main mixer interface
 * Resolves #332
 */

"use client";

import { Download, Pause, Play, Plus, Square, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioContext, useAudioRecording, useAudioTracks } from "../hooks";
import { mixTracksToBlob } from "../lib/audio-engine";
import { RecordingPanel } from "./RecordingPanel";
import { TrackItem } from "./TrackItem";

export function AudioMixer() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const audioContext = useAudioContext();
  const recording = useAudioRecording();
  const trackManager = useAudioTracks();

  // Initialize audio context on first interaction
  const handleInitialize = useCallback(async () => {
    if (!isInitialized) {
      await audioContext.initialize();
      setIsInitialized(true);
    }
  }, [isInitialized, audioContext]);

  // Update master volume
  useEffect(() => {
    if (audioContext.isInitialized) {
      audioContext.setMasterVolume(masterVolume);
    }
  }, [masterVolume, audioContext]);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;

      await handleInitialize();

      const { context, masterGain } = await audioContext.initialize();

      for (const file of files) {
        if (file.type.startsWith("audio/")) {
          await trackManager.addTrack(file, context, masterGain);
        }
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleInitialize, audioContext, trackManager],
  );

  // Handle recording
  const handleStartRecording = useCallback(async () => {
    await handleInitialize();
    await recording.startRecording();
  }, [handleInitialize, recording]);

  const handleStopRecording = useCallback(async () => {
    const { context, masterGain } = await audioContext.initialize();
    const buffer = await recording.getRecordingAsBuffer(context);

    if (buffer) {
      const recordingNumber = trackManager.tracks.filter((t) => t.type === "recording").length + 1;
      await trackManager.addRecordedTrack(
        buffer,
        context,
        masterGain,
        `Recording ${recordingNumber}`,
      );
    }
  }, [audioContext, recording, trackManager]);

  // Play all tracks
  const handlePlayAll = useCallback(async () => {
    const { context, masterGain } = await audioContext.initialize();
    trackManager.playAllTracks(context, masterGain);
    setIsPlaying(true);
  }, [audioContext, trackManager]);

  // Stop all tracks
  const handleStopAll = useCallback(() => {
    trackManager.stopAllTracks();
    setIsPlaying(false);
  }, [trackManager]);

  // Export mix
  const handleExport = useCallback(async () => {
    if (trackManager.tracks.length === 0) return;

    setIsExporting(true);

    try {
      const { context } = await audioContext.initialize();
      const maxDuration = Math.max(...trackManager.tracks.map((t) => t.duration));
      const blob = await mixTracksToBlob(context, trackManager.tracks, maxDuration);

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mix-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [audioContext, trackManager]);

  // Play individual track
  const handlePlayTrack = useCallback(
    async (trackId: string) => {
      const { context, masterGain } = await audioContext.initialize();
      trackManager.playTrack(trackId, context, masterGain);
    },
    [audioContext, trackManager],
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-20 px-6 pb-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Audio Mixer</h1>
          <p className="text-gray-400">Layer tracks and record your own audio</p>
        </div>

        {/* Master Controls */}
        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Master Controls</h2>
            <div className="flex items-center gap-4">
              {/* Master Volume */}
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                  className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  aria-label="Master volume"
                />
                <span className="text-gray-400 text-sm w-10">
                  {Math.round(masterVolume * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={isPlaying ? handleStopAll : handlePlayAll}
              disabled={trackManager.tracks.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isPlaying
                ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause All
                  </>
                )
                : (
                  <>
                    <Play className="w-4 h-4" />
                    Play All
                  </>
                )}
            </button>

            <button
              onClick={handleStopAll}
              disabled={trackManager.tracks.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>

            <button
              onClick={handleExport}
              disabled={trackManager.tracks.length === 0 || isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Exporting..." : "Export Mix"}
            </button>
          </div>
        </div>

        {/* Add Track Controls */}
        <div className="flex items-center gap-4">
          {/* File Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="audio-file-input"
          />
          <label
            htmlFor="audio-file-input"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Audio File
          </label>

          {/* Recording */}
          <RecordingPanel
            isRecording={recording.isRecording}
            isPaused={recording.isPaused}
            duration={recording.duration}
            onStart={handleStartRecording}
            onPause={recording.pauseRecording}
            onResume={recording.resumeRecording}
            onStop={handleStopRecording}
            onCancel={recording.cancelRecording}
          />
        </div>

        {/* Tracks List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Tracks ({trackManager.tracks.length})
          </h2>

          {trackManager.tracks.length === 0
            ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-400">
                  No tracks yet. Add an audio file or record something!
                </p>
              </div>
            )
            : (
              <div className="space-y-3">
                {trackManager.tracks.map((track) => (
                  <TrackItem
                    key={track.id}
                    track={track}
                    onPlay={() => handlePlayTrack(track.id)}
                    onStop={() => trackManager.stopTrack(track.id)}
                    onVolumeChange={(volume) => trackManager.setVolume(track.id, volume)}
                    onMuteToggle={() => trackManager.toggleMute(track.id)}
                    onSoloToggle={() => trackManager.toggleSolo(track.id)}
                    onRemove={() => trackManager.removeTrack(track.id)}
                  />
                ))}
              </div>
            )}
        </div>

        {/* Clear All */}
        {trackManager.tracks.length > 0 && (
          <div className="text-center">
            <button
              onClick={trackManager.clearTracks}
              className="text-red-400 hover:text-red-300 text-sm transition-colors"
            >
              Clear All Tracks
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
