/**
 * AudioMixer Component - Main mixer interface
 * Resolves #332
 */

"use client";

import {
  Check,
  Download,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Square,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAudioContext,
  useAudioRecording,
  useAudioStorage,
  useAudioTracks,
  useProjectPersistence,
} from "../hooks";
import { blobToAudioBuffer, mixTracksToBlob } from "../lib/audio-engine";
import { RecordingPanel } from "./RecordingPanel";
import { SortableTrackList } from "./SortableTrackList";

export function AudioMixer() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const audioContext = useAudioContext();
  const recording = useAudioRecording();
  const trackManager = useAudioTracks();
  const audioStorage = useAudioStorage();

  // Persistence
  const [persistenceState, persistenceActions] = useProjectPersistence(
    trackManager.tracks,
    masterVolume,
  );

  // Load saved project on mount
  useEffect(() => {
    const loadSavedProject = async () => {
      const savedProject = persistenceActions.loadProject();
      if (!savedProject || savedProject.tracks.length === 0) return;

      // Restore master volume
      setMasterVolume(savedProject.masterVolume);

      // Check if OPFS is supported
      const opfsSupported = await audioStorage.checkSupport();

      // Initialize audio context for decoding
      const { context, masterGain } = await audioContext.initialize();
      setIsInitialized(true);

      // Restore tracks with audio data from OPFS
      const restoredTracks = await Promise.all(
        savedProject.tracks.map(async (track) => {
          let buffer: AudioBuffer | null = null;

          // Try to load audio from OPFS if path exists
          if (opfsSupported && track.opfsPath) {
            try {
              const result = await audioStorage.loadTrackByPath(track.opfsPath);
              if (result.success && result.data) {
                // Decode the audio data - slice to get proper ArrayBuffer
                const arrayBuffer = result.data.buffer.slice(
                  result.data.byteOffset,
                  result.data.byteOffset + result.data.byteLength,
                ) as ArrayBuffer;
                buffer = await context.decodeAudioData(arrayBuffer);
              }
            } catch (error) {
              console.warn(`Failed to load audio for track ${track.name}:`, error);
            }
          }

          return {
            id: track.id,
            name: track.name,
            volume: track.volume,
            pan: track.pan,
            muted: track.muted,
            solo: track.solo,
            delay: track.delay,
            trimStart: track.trimStart,
            trimEnd: track.trimEnd,
            duration: track.duration,
            type: track.type,
            waveformData: track.waveformData,
            opfsPath: track.opfsPath,
            buffer,
            gainNode: buffer
              ? (() => {
                const gainNode = context.createGain();
                gainNode.gain.value = track.muted ? 0 : track.volume;
                gainNode.connect(masterGain);
                return gainNode;
              })()
              : null,
          };
        }),
      );

      trackManager.restoreTracks(restoredTracks);
    };

    loadSavedProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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
      const opfsSupported = await audioStorage.checkSupport();

      for (const file of files) {
        if (file.type.startsWith("audio/")) {
          let opfsPath: string | undefined;

          // Save audio to OPFS first for persistence
          if (opfsSupported) {
            try {
              const arrayBuffer = await file.arrayBuffer();
              opfsPath = `audio-mixer/tracks/${Date.now()}-${file.name}`;
              await audioStorage.saveTrackToPath(opfsPath, new Uint8Array(arrayBuffer));
            } catch (error) {
              console.warn("Failed to save track to OPFS:", error);
              opfsPath = undefined;
            }
          }

          // Add track with OPFS path
          await trackManager.addTrack(file, context, masterGain, opfsPath);
        }
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleInitialize, audioContext, trackManager, audioStorage],
  );

  // Handle recording
  const handleStartRecording = useCallback(async () => {
    await handleInitialize();
    return recording.startRecording();
  }, [handleInitialize, recording]);

  const handleStopRecording = useCallback(async () => {
    const { context, masterGain } = await audioContext.initialize();
    const blob = await recording.stopRecording();

    if (blob) {
      const buffer = await blobToAudioBuffer(context, blob);
      const recordingNumber = trackManager.tracks.filter((t) => t.type === "recording").length + 1;
      const recordingName = `Recording ${recordingNumber}`;

      // Save recording to OPFS for persistence
      let opfsPath: string | undefined;
      const opfsSupported = await audioStorage.checkSupport();
      if (opfsSupported) {
        try {
          const arrayBuffer = await blob.arrayBuffer();
          opfsPath = `audio-mixer/recordings/${Date.now()}-${
            recordingName.replace(/\s+/g, "-")
          }.webm`;
          await audioStorage.saveTrackToPath(opfsPath, new Uint8Array(arrayBuffer));
        } catch (error) {
          console.warn("Failed to save recording to OPFS:", error);
          opfsPath = undefined;
        }
      }

      await trackManager.addRecordedTrack(
        buffer,
        context,
        masterGain,
        recordingName,
        opfsPath,
      );
    }
  }, [audioContext, recording, trackManager, audioStorage]);

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
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-3xl font-bold">Audio Mixer</h1>
            {/* Save Status Indicator */}
            {persistenceState.isSaving && (
              <div className="flex items-center gap-1 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
            {!persistenceState.isSaving && persistenceState.lastSavedAt &&
              !persistenceState.hasUnsavedChanges && (
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <Check className="w-4 h-4" />
                <span>Saved</span>
              </div>
            )}
            {!persistenceState.isSaving && persistenceState.hasUnsavedChanges && (
              <div className="text-yellow-400 text-sm">Unsaved changes</div>
            )}
          </div>
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
              <SortableTrackList
                tracks={trackManager.tracks}
                onReorder={trackManager.reorderTracks}
                onPlay={handlePlayTrack}
                onStop={trackManager.stopTrack}
                onVolumeChange={trackManager.setVolume}
                onMuteToggle={trackManager.toggleMute}
                onSoloToggle={trackManager.toggleSolo}
                onRemove={trackManager.removeTrack}
                onDelayChange={trackManager.setDelay}
                onTrimChange={trackManager.setTrim}
              />
            )}
        </div>

        {/* Clear All & New Project */}
        {trackManager.tracks.length > 0 && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={trackManager.clearTracks}
              className="text-red-400 hover:text-red-300 text-sm transition-colors"
            >
              Clear All Tracks
            </button>
            <span className="text-gray-600">|</span>
            <button
              onClick={() => {
                trackManager.clearTracks();
                persistenceActions.createNewProject();
              }}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              New Project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
