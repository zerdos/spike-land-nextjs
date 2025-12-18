"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trash2, Play, Square, Mic, Upload, Volume2, VolumeX } from "lucide-react";

interface Track {
  id: string;
  name: string;
  url: string;
  volume: number;
  isMuted: boolean;
  audioElement: HTMLAudioElement;
}

export default function MusicCreatorPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop recording if active
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }

      // Cleanup tracks
      tracks.forEach(track => {
        track.audioElement.pause();
        URL.revokeObjectURL(track.url);
      });
    };
  }, [tracks]);

  // Helper to create a new track
  const addTrack = useCallback((name: string, blob: Blob | File) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = "metadata";

    // Wait for metadata to load to get duration if needed,
    // but for now we just add it.

    const newTrack: Track = {
      id: crypto.randomUUID(),
      name,
      url,
      volume: 1,
      isMuted: false,
      audioElement: audio,
    };

    setTracks(prev => [...prev, newTrack]);
  }, []);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      addTrack(file.name, file);
    }
    // Reset input
    if (event.target) event.target.value = '';
  };

  // Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        addTrack(`Recording ${new Date().toLocaleTimeString()}`, blob);

        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Play other tracks while recording?
      // User might want to listen while recording.
      // If we are vibe coding, yes, let's play if not already playing.
      if (!isPlaying && tracks.length > 0) {
        playAll();
      }

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      // Stop playback if we started it
      if (isPlaying) {
        stopAll();
      }
    }
  };

  // Playback Logic
  const playAll = () => {
    // Determine the longest duration or just play all
    // Reset all to 0? Or play from current?
    // For simplicity, let's reset to 0 for now unless we implement seeking.

    tracks.forEach(track => {
      track.audioElement.currentTime = 0; // Simple start from beginning
      if (!track.isMuted) {
        track.audioElement.play().catch(e => console.error("Play error", e));
      }
    });
    setIsPlaying(true);
  };

  const stopAll = () => {
    tracks.forEach(track => {
      track.audioElement.pause();
      track.audioElement.currentTime = 0;
    });
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopAll();
    } else {
      playAll();
    }
  };

  // Track Controls
  const toggleMute = (id: string) => {
    setTracks(prev => prev.map(track => {
      if (track.id === id) {
        const newMuted = !track.isMuted;
        track.audioElement.muted = newMuted;
        return { ...track, isMuted: newMuted };
      }
      return track;
    }));
  };

  const setVolume = (id: string, volume: number) => {
    setTracks(prev => prev.map(track => {
      if (track.id === id) {
        track.audioElement.volume = volume;
        return { ...track, volume };
      }
      return track;
    }));
  };

  const removeTrack = (id: string) => {
    setTracks(prev => {
      const trackToRemove = prev.find(t => t.id === id);
      if (trackToRemove) {
        trackToRemove.audioElement.pause();
        URL.revokeObjectURL(trackToRemove.url);
      }
      return prev.filter(t => t.id !== id);
    });
  };

  // Update loop for progress bar (optional, kept simple for now)
  // We can just rely on basic controls for this MVP.

  return (
    <div className="container mx-auto p-8 pt-24 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Music Creator</h1>
        <p className="text-muted-foreground">Layer tracks, record your voice, and make music.</p>
      </div>

      <div className="grid gap-6">
        {/* Global Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={togglePlay}
                variant={isPlaying ? "destructive" : "default"}
                aria-label={isPlaying ? "Stop" : "Play"}
              >
                {isPlaying ? <Square className="fill-current" /> : <Play className="fill-current" />}
                <span className="ml-2">{isPlaying ? "Stop" : "Play All"}</span>
              </Button>

              <Button
                size="lg"
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "outline"}
                className={isRecording ? "animate-pulse" : ""}
                aria-label={isRecording ? "Stop Recording" : "Record"}
              >
                <Mic className={isRecording ? "fill-current" : ""} />
                <span className="ml-2">
                  {isRecording ? `Recording (${recordingTime}s)` : "Record"}
                </span>
              </Button>
            </div>

            <div className="flex gap-4">
               <input
                type="file"
                accept="audio/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Add Track
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tracks List */}
        <div className="space-y-4">
          {tracks.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
              <p>No tracks yet. Upload an audio file or start recording!</p>
            </div>
          )}

          {tracks.map(track => (
            <Card key={track.id} className="overflow-hidden">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                  <Volume2 className="h-6 w-6 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate" title={track.name}>{track.name}</h3>
                  <p className="text-xs text-muted-foreground">Audio Track</p>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-2 w-32">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <Slider
                    defaultValue={[track.volume]}
                    max={1}
                    step={0.01}
                    onValueChange={(vals) => setVolume(track.id, vals[0])}
                    className="w-20"
                    aria-label={`Volume for ${track.name}`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleMute(track.id)}
                    aria-label={track.isMuted ? "Unmute" : "Mute"}
                  >
                    {track.isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive/90"
                    onClick={() => removeTrack(track.id)}
                    aria-label={`Delete ${track.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
