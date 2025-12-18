/**
 * Audio Mixer App - Main Page
 * Resolves #332
 */

import { AudioMixer } from "@apps/audio-mixer/components";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audio Mixer - Layer Tracks and Record Audio",
  description:
    "A web-based audio mixer where you can layer multiple audio tracks, record your own audio, and export the final mix.",
};

export default function AudioMixerPage() {
  return <AudioMixer />;
}
