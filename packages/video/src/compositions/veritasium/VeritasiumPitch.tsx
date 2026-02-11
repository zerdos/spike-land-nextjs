import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Scene01_Hook } from "./Scene01_Hook";
import { Scene02_Problem } from "./Scene02_Problem";
import { Scene03_Solution } from "./Scene03_Solution";
import { Scene04_Magic } from "./Scene04_Magic";
import { Scene05_Proof } from "./Scene05_Proof";
import { Scene06_Implications } from "./Scene06_Implications";
import { Scene07_CTA } from "./Scene07_CTA";
import { COLORS, VERITASIUM_DURATIONS, VERITASIUM_TIMING } from "../../lib/constants";

/**
 * "The AI That Remembers Every Mistake" — Veritasium Pitch Video
 *
 * 4-minute production (7200 frames @ 30fps)
 *
 * Scene Arc:
 *   Hook (22s) → Problem (28s) → Solution (60s) → Magic (65s) → Proof (25s) → Implications (25s) → CTA (15s)
 *
 * Story: Most AI throws away its failures. Ours turns them into lessons
 * using a 250-year-old formula from Laplace. Every mistake makes it
 * permanently smarter, creating a data flywheel moat.
 */
export const VeritasiumPitch: React.FC = () => {
  const transitionDuration = VERITASIUM_TIMING.transitionFrames;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <TransitionSeries>
        {/* Scene 1: Hook — The Story */}
        <TransitionSeries.Sequence
          durationInFrames={VERITASIUM_DURATIONS.hook}
          style={{ overflow: "hidden" }}
        >
          <Scene01_Hook />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 2: The Problem — Single-shot limitations */}
        <TransitionSeries.Sequence
          durationInFrames={VERITASIUM_DURATIONS.problem}
          style={{ overflow: "hidden" }}
        >
          <Scene02_Problem />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 3: The Solution — Agent loop */}
        <TransitionSeries.Sequence
          durationInFrames={VERITASIUM_DURATIONS.solution}
          style={{ overflow: "hidden" }}
        >
          <Scene03_Solution />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 4: The Magic — Learning notes & Laplace (CENTERPIECE) */}
        <TransitionSeries.Sequence
          durationInFrames={VERITASIUM_DURATIONS.magic}
          style={{ overflow: "hidden" }}
        >
          <Scene04_Magic />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 5: The Proof — Success rates + demo */}
        <TransitionSeries.Sequence
          durationInFrames={VERITASIUM_DURATIONS.proof}
          style={{ overflow: "hidden" }}
        >
          <Scene05_Proof />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 6: Implications — Data flywheel */}
        <TransitionSeries.Sequence
          durationInFrames={VERITASIUM_DURATIONS.implications}
          style={{ overflow: "hidden" }}
        >
          <Scene06_Implications />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Scene 7: CTA — spike.land + Derek appeal */}
        <TransitionSeries.Sequence
          durationInFrames={VERITASIUM_DURATIONS.cta}
          style={{ overflow: "hidden" }}
        >
          <Scene07_CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
