import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill } from "remotion";

import { EndCard } from "./compositions/EndCard";
import { LiveUpdate } from "./compositions/LiveUpdate";
import { MyAppsAgent } from "./compositions/MyAppsAgent";
import { OrbitDashboard } from "./compositions/OrbitDashboard";
import { COLORS, SCENE_DURATIONS } from "./lib/constants";

import "./styles/global.css";

/**
 * Main 15-second promo video composition
 *
 * Scene breakdown:
 * - Scene 1 (0-3s): Orbit Dashboard - A/B test discovering winner
 * - Scene 2 (3-8s): My-Apps Agent - Chat interface with live preview
 * - Scene 3 (8-12s): Live Update - Glitch transition showing changes
 * - Scene 4 (12-15s): End Card - Brand reveal and CTA
 *
 * Total: 450 frames at 30fps = 15 seconds
 */
export function PromoVideo() {
  // Transition duration for fade between scenes (in frames)
  const transitionDuration = 15;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <TransitionSeries>
        {/* Scene 1: Orbit Dashboard */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.scene1}
          style={{ overflow: "hidden" }}
        >
          <OrbitDashboard />
        </TransitionSeries.Sequence>

        {/* Transition 1→2 */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 2: My-Apps Agent Chat */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.scene2}
          style={{ overflow: "hidden" }}
        >
          <MyAppsAgent />
        </TransitionSeries.Sequence>

        {/* Transition 2→3 */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 3: Live Update with Glitch */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.scene3}
          style={{ overflow: "hidden" }}
        >
          <LiveUpdate />
        </TransitionSeries.Sequence>

        {/* Transition 3→4 */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 4: End Card */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.scene4}
          style={{ overflow: "hidden" }}
        >
          <EndCard />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
}

/**
 * Individual scene compositions for preview/testing
 */
export { EndCard } from "./compositions/EndCard";
export { LiveUpdate } from "./compositions/LiveUpdate";
export { MyAppsAgent } from "./compositions/MyAppsAgent";
export { OrbitDashboard } from "./compositions/OrbitDashboard";
