"use client";

import { Player } from "@remotion/player";
import { VibeCodingParadox } from "@spike-npm-land/video/compositions/vibe-coding-paradox";
import { VIDEO_CONFIG, VCP_TIMING } from "@spike-npm-land/video/lib/constants";

export default function VeritasiumPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-4">
      <div className="w-full max-w-6xl">
        <h1 className="mb-6 text-center text-3xl font-bold text-white">
          The Vibe Coding Paradox
        </h1>
        <p className="mb-8 text-center text-gray-400">
          Why giving AI more freedom produces worse results
        </p>
        <Player
          component={VibeCodingParadox}
          durationInFrames={VCP_TIMING.totalFrames}
          fps={VCP_TIMING.fps}
          compositionWidth={VIDEO_CONFIG.width}
          compositionHeight={VIDEO_CONFIG.height}
          style={{ width: "100%" }}
          controls
          autoPlay={false}
        />
      </div>
    </div>
  );
}
