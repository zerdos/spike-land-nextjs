import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { 
  Scene01_Struggle, 
  Scene02_Algorithm, 
  Scene03_Revealed, 
  Scene04_Features, 
  Scene05_Transformation, 
  Scene06_Testimony, 
  Scene07_CTA 
} from "./index";
import { BRIDGEMIND_DURATIONS, BRIDGEMIND_TIMING } from "../../lib/constants";
import { FormatProvider } from "../../lib/format-context";
import { interpolate } from "remotion";

/**
 * Utility to duck music volume when voiceover is playing
 */
const musicVolumeAtFrame = (
  frame: number, 
  totalFrames: number,
  _baseVolume: number = 0.2, 
  duckVolume: number = 0.05
) => {
  // Simple ducking: lower volume during the main narration scenes (0 to 1800)
  // We can refine this to specific ranges per scene
  return interpolate(
    frame,
    [0, 30, totalFrames - 30, totalFrames],
    [duckVolume, duckVolume, duckVolume, duckVolume], // Always ducked for now
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
};


export const BridgeMindPromo: React.FC = () => {
  return (
    <FormatProvider>
      <AbsoluteFill style={{ background: "#000" }}>
        {/* Transitions & Scenes */}
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={BRIDGEMIND_DURATIONS.struggle}>
            <Scene01_Struggle />
          </TransitionSeries.Sequence>
          
          <TransitionSeries.Transition
            timing={linearTiming({ durationInFrames: BRIDGEMIND_TIMING.transitionFrames })}
            presentation={slide()}
          />
          
          <TransitionSeries.Sequence durationInFrames={BRIDGEMIND_DURATIONS.algorithm}>
            <Scene02_Algorithm />
          </TransitionSeries.Sequence>
          
          <TransitionSeries.Transition
            timing={linearTiming({ durationInFrames: BRIDGEMIND_TIMING.transitionFrames })}
            presentation={slide()}
          />
          
          <TransitionSeries.Sequence durationInFrames={BRIDGEMIND_DURATIONS.revealed}>
            <Scene03_Revealed />
          </TransitionSeries.Sequence>
          
          <TransitionSeries.Transition
            timing={linearTiming({ durationInFrames: BRIDGEMIND_TIMING.transitionFrames })}
            presentation={slide()}
          />
          
          <TransitionSeries.Sequence durationInFrames={BRIDGEMIND_DURATIONS.features}>
            <Scene04_Features />
          </TransitionSeries.Sequence>
          
          <TransitionSeries.Transition
            timing={linearTiming({ durationInFrames: BRIDGEMIND_TIMING.transitionFrames })}
            presentation={slide()}
          />
          
          <TransitionSeries.Sequence durationInFrames={BRIDGEMIND_DURATIONS.transformation}>
            <Scene05_Transformation />
          </TransitionSeries.Sequence>
          
          <TransitionSeries.Transition
            timing={linearTiming({ durationInFrames: BRIDGEMIND_TIMING.transitionFrames })}
            presentation={slide()}
          />
          
          <TransitionSeries.Sequence durationInFrames={BRIDGEMIND_DURATIONS.testimony}>
            <Scene06_Testimony />
          </TransitionSeries.Sequence>
          
          <TransitionSeries.Transition
            timing={linearTiming({ durationInFrames: BRIDGEMIND_TIMING.transitionFrames })}
            presentation={slide()}
          />
          
          <TransitionSeries.Sequence durationInFrames={BRIDGEMIND_DURATIONS.cta}>
            <Scene07_CTA />
          </TransitionSeries.Sequence>
        </TransitionSeries>

        {/* Voiceover Layers — each starts when its scene begins */}
        <Sequence from={0}>
          <Audio src={staticFile("audio/bridgemind-scene1.mp3")} />
        </Sequence>
        <Sequence from={251}>
          <Audio src={staticFile("audio/bridgemind-scene2.mp3")} />
        </Sequence>
        <Sequence from={445}>
          <Audio src={staticFile("audio/bridgemind-scene3.mp3")} />
        </Sequence>
        <Sequence from={636}>
          <Audio src={staticFile("audio/bridgemind-scene4.mp3")} />
        </Sequence>
        <Sequence from={968}>
          <Audio src={staticFile("audio/bridgemind-scene5.mp3")} />
        </Sequence>
        <Sequence from={1191}>
          <Audio src={staticFile("audio/bridgemind-scene6.mp3")} />
        </Sequence>
        <Sequence from={1407}>
          <Audio src={staticFile("audio/bridgemind-scene7.mp3")} />
        </Sequence>

        {/* Background Music */}
        <Audio
          src={staticFile("audio/physics-of-attention.m4a")}
          volume={(f) => musicVolumeAtFrame(f, BRIDGEMIND_TIMING.totalFrames, 0.4, 0.1)}
          loop
        />

        {/* Captions removed — voiceover only */}
      </AbsoluteFill>
    </FormatProvider>
  );
};
