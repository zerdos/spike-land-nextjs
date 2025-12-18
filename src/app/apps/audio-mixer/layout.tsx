/**
 * Audio Mixer App Layout
 * Resolves #332
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audio Mixer | Spike Land",
  description: "Layer audio tracks and record your own",
};

export default function AudioMixerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
