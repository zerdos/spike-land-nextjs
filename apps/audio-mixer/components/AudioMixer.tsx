/**
 * AudioMixer Component - Main mixer interface
 * Resolves #332
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  Check,
  Download,
  Keyboard,
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
  useTimeline,
} from "../hooks";
import { blobToAudioBuffer, mixTracksToBlob } from "../lib/audio-engine";
import { KeyboardShortcutsPanel, ShortcutToast } from "./KeyboardShortcutsPanel";
import { RecordingPanel } from "./RecordingPanel";
import { SplashScreen } from "./SplashScreen";
import { Timeline } from "./Timeline";

export function AudioMixer() {
  const [hasUserGesture, setHasUserGesture] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [shortcutToast, setShortcutToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingStartTimeRef = useRef<number>(0);

  const audioContext = useAudioContext();
  const recording = useAudioRecording();
  const trackManager = useAudioTracks();
  const audioStorage = useAudioStorage();
  const timeline = useTimeline();

  // Scrub audio ref for playing snippets
  const scrubSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Persistence
  const [persistenceState, persistenceActions] = useProjectPersistence(
    trackManager.tracks,
    masterVolume,
  );

  // Show toast and auto-hide
  const showToast = useCallback((message: string) => {
    setShortcutToast(message);
    setTimeout(() => setShortcutToast(null), 1000);
  }, []);

  // Handle splash screen click
  const handleStart = useCallback(() => {
    setHasUserGesture(true);
  }, []);

  // Load saved project on mount
  useEffect(() => {
    if (!hasUserGesture) return;

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
              console.warn(
                `Failed to load audio for track ${track.name}:`,
                error,
              );
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
            // Migration: use position if present, otherwise fall back to delay
            position: track.position ?? track.delay ?? 0,
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
  }, [hasUserGesture]); // Only run once on mount after user gesture

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
              await audioStorage.saveTrackToPath(
                opfsPath,
                new Uint8Array(arrayBuffer),
              );
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
    recordingStartTimeRef.current = timeline.state.playheadTime;
    return recording.startRecording();
  }, [handleInitialize, recording, timeline.state.playheadTime]);

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
          await audioStorage.saveTrackToPath(
            opfsPath,
            new Uint8Array(arrayBuffer),
          );
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
        recordingStartTimeRef.current,
      );
    }
  }, [audioContext, recording, trackManager, audioStorage]);

  // Play all tracks
  const handlePlayAll = useCallback(async () => {
    const { context, masterGain } = await audioContext.initialize();
    trackManager.playAllTracks(
      context,
      masterGain,
      timeline.state.playheadTime,
    );
    setIsPlaying(true);
    // Start playhead animation from current position
    timeline.startPlayheadAnimation(timeline.state.playheadTime);
  }, [audioContext, trackManager, timeline]);

  // Stop all tracks
  const handleStopAll = useCallback(() => {
    trackManager.stopAllTracks();
    setIsPlaying(false);
    timeline.stopPlayheadAnimation();
  }, [trackManager, timeline]);

  // Toggle play/pause
  const handleTogglePlayPause = useCallback(async () => {
    if (isPlaying) {
      handleStopAll();
      showToast("⏸ Paused");
    } else {
      await handlePlayAll();
      showToast("▶ Playing");
    }
  }, [isPlaying, handleStopAll, handlePlayAll, showToast]);

  // Handle playhead seek
  const handlePlayheadSeek = useCallback(
    (time: number) => {
      timeline.setPlayheadTime(time);
      // If playing, restart from new position
      if (isPlaying) {
        trackManager.stopAllTracks();
        audioContext.initialize().then(({ context, masterGain }) => {
          // Update currentTime on tracks before playing
          trackManager.playAllTracks(context, masterGain, time);
          timeline.startPlayheadAnimation(time);
        });
      }
    },
    [timeline, isPlaying, trackManager, audioContext],
  );

  // Handle scrub audio feedback
  const handleScrubAudio = useCallback(
    async (time: number) => {
      // Stop previous scrub snippet
      if (scrubSourceRef.current) {
        try {
          scrubSourceRef.current.stop();
        } catch {
          // Already stopped
        }
        scrubSourceRef.current = null;
      }

      const { context, masterGain } = await audioContext.initialize();

      // Play a short snippet from each track at the scrub position
      const hasSolo = trackManager.tracks.some((t) => t.solo);

      trackManager.tracks.forEach((track) => {
        if (!track.buffer || track.muted) return;
        if (hasSolo && !track.solo) return;

        const trackPosition = track.position ?? track.delay ?? 0;
        const effectiveTrimEnd = track.trimEnd > 0
          ? track.trimEnd
          : track.duration;

        // Position within track's timeline
        const timelinePosition = time - trackPosition;

        // Calculate actual buffer offset, accounting for negative trimStart (silence)
        let bufferOffset: number;
        if (track.trimStart < 0) {
          const silenceDuration = Math.abs(track.trimStart);
          // During silence period, don't play anything
          if (timelinePosition < silenceDuration) {
            return; // In silence region, nothing to scrub
          }
          bufferOffset = timelinePosition - silenceDuration;
        } else {
          bufferOffset = track.trimStart + timelinePosition;
        }

        // Only play if within valid buffer bounds
        if (bufferOffset >= 0 && bufferOffset < effectiveTrimEnd) {
          const source = context.createBufferSource();
          source.buffer = track.buffer;

          const gainNode = context.createGain();
          gainNode.gain.value = track.volume * 0.5; // Reduce volume for scrub
          source.connect(gainNode);
          gainNode.connect(masterGain);

          // Play 50ms snippet
          source.start(0, bufferOffset, 0.05);
          scrubSourceRef.current = source;
        }
      });
    },
    [audioContext, trackManager.tracks],
  );

  // Export mix
  const handleExport = useCallback(async () => {
    if (trackManager.tracks.length === 0) return;

    setIsExporting(true);
    showToast("📦 Exporting...");

    try {
      const { context } = await audioContext.initialize();
      const maxDuration = Math.max(
        ...trackManager.tracks.map((t) => t.duration),
      );
      const blob = await mixTracksToBlob(
        context,
        trackManager.tracks,
        maxDuration,
      );

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mix-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast("✓ Export complete");
    } catch (error) {
      console.error("Export failed:", error);
      showToast("✗ Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [audioContext, trackManager, showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!hasUserGesture) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const isMeta = e.metaKey || e.ctrlKey;

      // Toggle shortcuts panel
      if (key === "?" || (key === "/" && e.shiftKey)) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }

      // Close shortcuts panel or deselect
      if (key === "escape") {
        if (showShortcuts) {
          setShowShortcuts(false);
        } else {
          timeline.setSelectedTrackId(null);
          showToast("Deselected");
        }
        return;
      }

      // Playback controls
      if (key === " ") {
        e.preventDefault();
        handleTogglePlayPause();
        return;
      }

      if (key === "s" && !isMeta) {
        e.preventDefault();
        handleStopAll();
        showToast("⏹ Stopped");
        return;
      }

      // Seek controls
      if (key === "home") {
        e.preventDefault();
        handlePlayheadSeek(0);
        showToast("⏮ Start");
        return;
      }

      if (key === "end") {
        e.preventDefault();
        const maxTime = Math.max(
          ...trackManager.tracks.map((t) => {
            const effectiveTrimEnd = t.trimEnd > 0 ? t.trimEnd : t.duration;
            return (t.position ?? t.delay ?? 0) + effectiveTrimEnd -
              t.trimStart;
          }),
          0,
        );
        handlePlayheadSeek(maxTime);
        showToast("⏭ End");
        return;
      }

      if (key === "arrowleft" && !isMeta) {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        const newTime = Math.max(0, timeline.state.playheadTime - delta);
        handlePlayheadSeek(newTime);
        showToast(`⏪ -${delta}s`);
        return;
      }

      if (key === "arrowright" && !isMeta) {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        handlePlayheadSeek(timeline.state.playheadTime + delta);
        showToast(`⏩ +${delta}s`);
        return;
      }

      // Track selection
      if (key === "arrowup") {
        e.preventDefault();
        const tracks = trackManager.tracks;
        if (tracks.length === 0) return;
        const currentIndex = timeline.state.selectedTrackId
          ? tracks.findIndex((t) => t.id === timeline.state.selectedTrackId)
          : tracks.length;
        const newIndex = Math.max(0, currentIndex - 1);
        const nextTrack = tracks[newIndex];
        if (nextTrack) {
          timeline.setSelectedTrackId(nextTrack.id);
          showToast(`Track ${newIndex + 1}`);
        }
        return;
      }

      if (key === "arrowdown") {
        e.preventDefault();
        const tracks = trackManager.tracks;
        if (tracks.length === 0) return;
        const currentIndex = timeline.state.selectedTrackId
          ? tracks.findIndex((t) => t.id === timeline.state.selectedTrackId)
          : -1;
        const newIndex = Math.min(tracks.length - 1, currentIndex + 1);
        const nextTrack = tracks[newIndex];
        if (nextTrack) {
          timeline.setSelectedTrackId(nextTrack.id);
          showToast(`Track ${newIndex + 1}`);
        }
        return;
      }

      // Track controls (require selected track)
      const selectedTrack = timeline.state.selectedTrackId
        ? trackManager.tracks.find((t) => t.id === timeline.state.selectedTrackId)
        : null;

      if (key === "m" && !isMeta) {
        e.preventDefault();
        if (selectedTrack) {
          trackManager.toggleMute(selectedTrack.id);
          showToast(selectedTrack.muted ? "🔊 Unmuted" : "🔇 Muted");
        }
        return;
      }

      if (key === "o") {
        e.preventDefault();
        if (selectedTrack) {
          trackManager.toggleSolo(selectedTrack.id);
          showToast(selectedTrack.solo ? "Solo off" : "🎧 Solo");
        }
        return;
      }

      if (key === "delete" || key === "backspace") {
        e.preventDefault();
        if (selectedTrack) {
          trackManager.removeTrack(selectedTrack.id);
          timeline.setSelectedTrackId(null);
          showToast("🗑 Deleted");
        }
        return;
      }

      // Volume controls
      if (key === "[") {
        e.preventDefault();
        if (e.shiftKey) {
          // Master volume
          const newVolume = Math.max(0, masterVolume - 0.1);
          setMasterVolume(newVolume);
          showToast(`Master ${Math.round(newVolume * 100)}%`);
        } else if (selectedTrack) {
          const newVolume = Math.max(0, selectedTrack.volume - 0.1);
          trackManager.setVolume(selectedTrack.id, newVolume);
          showToast(`Volume ${Math.round(newVolume * 100)}%`);
        }
        return;
      }

      if (key === "]") {
        e.preventDefault();
        if (e.shiftKey) {
          // Master volume
          const newVolume = Math.min(1, masterVolume + 0.1);
          setMasterVolume(newVolume);
          showToast(`Master ${Math.round(newVolume * 100)}%`);
        } else if (selectedTrack) {
          const newVolume = Math.min(1, selectedTrack.volume + 0.1);
          trackManager.setVolume(selectedTrack.id, newVolume);
          showToast(`Volume ${Math.round(newVolume * 100)}%`);
        }
        return;
      }

      // Zoom controls
      if (key === "=" || key === "+") {
        e.preventDefault();
        timeline.setZoom(Math.min(200, timeline.state.zoom * 1.25));
        showToast("🔍 Zoom in");
        return;
      }

      if (key === "-") {
        e.preventDefault();
        timeline.setZoom(Math.max(10, timeline.state.zoom / 1.25));
        showToast("🔍 Zoom out");
        return;
      }

      if (key === "0" && !isMeta) {
        e.preventDefault();
        timeline.setZoom(50);
        showToast("🔍 Reset zoom");
        return;
      }

      // Snap toggle
      if (key === "g") {
        e.preventDefault();
        timeline.setSnapEnabled(!timeline.state.snapEnabled);
        showToast(
          timeline.state.snapEnabled ? "Grid snap off" : "Grid snap on",
        );
        return;
      }

      // Recording
      if (key === "r" && !isMeta) {
        e.preventDefault();
        if (recording.isRecording) {
          handleStopRecording();
          showToast("⏹ Recording stopped");
        } else {
          handleStartRecording();
          showToast("⏺ Recording...");
        }
        return;
      }

      // File operations
      if (key === "o" && isMeta) {
        e.preventDefault();
        fileInputRef.current?.click();
        return;
      }

      if (key === "e" && isMeta) {
        e.preventDefault();
        handleExport();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    hasUserGesture,
    showShortcuts,
    isPlaying,
    masterVolume,
    timeline,
    trackManager,
    recording,
    handleTogglePlayPause,
    handleStopAll,
    handlePlayheadSeek,
    handleStartRecording,
    handleStopRecording,
    handleExport,
    showToast,
  ]);

  // Show splash screen if no user gesture
  if (!hasUserGesture) {
    return <SplashScreen onStart={handleStart} />;
  }

  return (
    <div className="min-h-screen bg-gradient-page text-white pt-24 px-6 pb-12 relative overflow-hidden">
      {/* Background blobs for depth */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-secondary/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gradient-primary py-1">
              Audio Mixer
            </h1>
            {/* Save Status Indicator */}
            {persistenceState.isSaving && (
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 glass-1 border-white/10 text-gray-400"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </Badge>
            )}
            {!persistenceState.isSaving && persistenceState.lastSavedAt &&
              !persistenceState.hasUnsavedChanges && (
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 glass-1 border-white/10 text-green-400"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </Badge>
            )}
            {!persistenceState.isSaving && persistenceState.hasUnsavedChanges &&
              (
                <Badge
                  variant="outline"
                  className="glass-1 border-white/10 text-yellow-400"
                >
                  Unsaved changes
                </Badge>
              )}
          </div>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Professional multi-track layering and recording studio in your browser
          </p>
        </div>

        {/* Master Controls */}
        <Card className="glass-1 glass-edge border-none p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold font-heading">Master Station</h2>
              <p className="text-sm text-muted-foreground italic">
                Global output & monitoring
              </p>
            </div>
            <div className="flex items-center gap-6">
              {/* Keyboard shortcuts button */}
              <button
                onClick={() => setShowShortcuts(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white glass-0 hover:glass-1 rounded-xl transition-all border border-white/5 active:scale-95"
                title="Keyboard shortcuts (?)"
              >
                <Keyboard className="w-4 h-4" />
                <span className="hidden sm:inline">Shortcuts</span>
                <kbd className="hidden sm:inline px-1.5 py-0.5 bg-white/10 rounded text-xs font-mono">
                  ?
                </kbd>
              </button>

              {/* Master Volume */}
              <div className="flex items-center gap-3 bg-white/5 p-2 px-4 rounded-2xl glass-edge">
                <Volume2 className="w-5 h-5 text-primary" />
                <div className="w-32">
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={[masterVolume]}
                    onValueChange={(vals) => setMasterVolume(vals[0] ?? 0.8)}
                    aria-label="Master volume"
                  />
                </div>
                <span className="text-primary/90 text-sm font-mono w-10 text-right">
                  {Math.round(masterVolume * 100)}%
                </span>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5 mx-[-1.5rem]" />

          {/* Transport Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <Button
              size="lg"
              variant="default"
              onClick={isPlaying ? handleStopAll : handlePlayAll}
              disabled={trackManager.tracks.length === 0}
              className={cn(
                "rounded-xl font-bold min-w-[140px] transition-all duration-300",
                isPlaying
                  ? "bg-amber-600 hover:bg-amber-700 shadow-glow-primary"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-glow-cyan-sm",
              )}
            >
              {isPlaying
                ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause Mix
                  </>
                )
                : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Play Session
                  </>
                )}
            </Button>

            <Button
              size="lg"
              variant="secondary"
              onClick={handleStopAll}
              disabled={trackManager.tracks.length === 0}
              className="rounded-xl glass-2 border-white/10 text-white font-semibold hover:bg-white/10 transition-all active:scale-95"
            >
              <Square className="w-5 h-5 mr-2" />
              Stop
            </Button>

            <div className="flex-1" />

            <Button
              size="lg"
              variant="default"
              onClick={handleExport}
              disabled={trackManager.tracks.length === 0 || isExporting}
              className="rounded-xl bg-purple-600 hover:bg-purple-700 shadow-glow-fuchsia font-bold min-w-[140px] text-white"
            >
              {isExporting
                ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                )
                : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Export Mix
                  </>
                )}
            </Button>
          </div>
        </Card>

        {/* Add Track Controls */}
        <div className="flex items-center gap-4 p-2 bg-white/5 rounded-2xl glass-edge backdrop-blur-sm w-fit">
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
          <Button
            asChild
            variant="ghost"
            className="rounded-xl glass-2 border-white/10 text-white hover:bg-white/10 cursor-pointer h-12 px-6 font-semibold"
          >
            <label htmlFor="audio-file-input">
              <Plus className="w-5 h-5 mr-2 text-cyan-400" />
              Import Tracks
            </label>
          </Button>

          <div className="w-px h-8 bg-white/10 mx-1" />

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

        {/* Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-heading">
              Studio Timeline
            </h2>
            <Badge
              variant="secondary"
              className="glass-1 border-white/10 px-3 py-1 text-sm font-light"
            >
              {trackManager.tracks.length} {trackManager.tracks.length === 1 ? "Track" : "Tracks"}
              {" "}
              Active
            </Badge>
          </div>

          <Card className="glass-0 glass-edge border-none overflow-hidden">
            <Timeline
              tracks={trackManager.tracks}
              playheadTime={timeline.state.playheadTime}
              isPlaying={isPlaying}
              zoom={timeline.state.zoom}
              snapEnabled={timeline.state.snapEnabled}
              snapGrid={timeline.state.snapGrid}
              selectedTrackId={timeline.state.selectedTrackId}
              onTrackPositionChange={trackManager.setPosition}
              onPlayheadSeek={handlePlayheadSeek}
              onZoomChange={timeline.setZoom}
              onSnapToggle={timeline.setSnapEnabled}
              onSnapGridChange={timeline.setSnapGrid}
              onSelectTrack={timeline.setSelectedTrackId}
              onVolumeChange={trackManager.setVolume}
              onMuteToggle={trackManager.toggleMute}
              onSoloToggle={trackManager.toggleSolo}
              onTrimChange={trackManager.setTrim}
              onRemoveTrack={trackManager.removeTrack}
              onScrubAudio={handleScrubAudio}
            />
          </Card>
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

      {/* Keyboard Shortcuts Panel */}
      <KeyboardShortcutsPanel
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Shortcut Toast */}
      <ShortcutToast action={shortcutToast} />
    </div>
  );
}
