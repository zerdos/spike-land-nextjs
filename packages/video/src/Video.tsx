import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill } from "remotion";

import { AIDiscovery } from "./compositions/AIDiscovery";
import { ChatSolution } from "./compositions/ChatSolution";
import { EndCard } from "./compositions/EndCard";
import { GoingLive } from "./compositions/GoingLive";
import { IntroHook } from "./compositions/IntroHook";
import { ResultsProof } from "./compositions/ResultsProof";
import { TheProblem } from "./compositions/TheProblem";
import { Transformation } from "./compositions/Transformation";
import { COLORS, SCENE_DURATIONS } from "./lib/constants";

import "./styles/global.css";

/**
 * Main 60-second promo video composition
 *
 * Story Arc: Hook -> Problem -> Discovery -> Solution -> Transformation -> Deployment -> Proof -> CTA
 *
 * Scene breakdown:
 * - Scene 1 (0-5s): IntroHook - Brand reveal + hook question
 * - Scene 2 (5-13s): TheProblem - Dashboard shows declining metrics
 * - Scene 3 (13-19s): AIDiscovery - AI agent awakens
 * - Scene 4 (19-31s): ChatSolution - User chats with AI
 * - Scene 5 (31-41s): Transformation - AI transforms dashboard
 * - Scene 6 (41-49s): GoingLive - Syncing to all platforms
 * - Scene 7 (49-55s): ResultsProof - Before/after comparison
 * - Scene 8 (55-60s): EndCard - Brand and CTA
 *
 * Total: 1800 frames at 30fps = 60 seconds
 */
export function PromoVideo() {
  // Transition duration for fade between scenes (in frames)
  const transitionDuration = 20;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <TransitionSeries>
        {/* Scene 1: IntroHook */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.scene1}
          style={{ overflow: "hidden" }}
        >
          <IntroHook />
        </TransitionSeries.Sequence>

        {/* Transition 1→2 */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 2: TheProblem */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.scene2}
          style={{ overflow: "hidden" }}
        >
          <TheProblem />
        </TransitionSeries.Sequence>

        {/* Transition 2→3 */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 3: AIDiscovery */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.scene3}
          style={{ overflow: "hidden" }}
        >
          <AIDiscovery />
        </TransitionSeries.Sequence>

        {/* Transition 3→4 */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 4: ChatSolution */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.scene4}
          style={{ overflow: "hidden" }}
        >
          <ChatSolution />
        </TransitionSeries.Sequence>

        {/* Transition 4→5 */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 5: Transformation */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.scene5}
          style={{ overflow: "hidden" }}
        >
          <Transformation />
        </TransitionSeries.Sequence>

        {/* Transition 5→6 */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 6: GoingLive */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.scene6}
          style={{ overflow: "hidden" }}
        >
          <GoingLive />
        </TransitionSeries.Sequence>

        {/* Transition 6→7 */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 7: ResultsProof */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.scene7}
          style={{ overflow: "hidden" }}
        >
          <ResultsProof />
        </TransitionSeries.Sequence>

        {/* Transition 7→8 */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 8: EndCard */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.scene8}
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
export { PhysicsOfAttention } from "./compositions/PhysicsOfAttention";
export { AIDiscovery } from "./compositions/AIDiscovery";
export { ChatSolution } from "./compositions/ChatSolution";
export { EndCard } from "./compositions/EndCard";
export { GoingLive } from "./compositions/GoingLive";
export { IntroHook } from "./compositions/IntroHook";
export { ResultsProof } from "./compositions/ResultsProof";
export { TheProblem } from "./compositions/TheProblem";
export { Transformation } from "./compositions/Transformation";
// Legacy exports for backwards compatibility
export { LiveDeployment } from "./compositions/LiveDeployment";
export { LiveUpdate } from "./compositions/LiveUpdate";
export { MyAppsAgent } from "./compositions/MyAppsAgent";
export { OrbitDashboard } from "./compositions/OrbitDashboard";
