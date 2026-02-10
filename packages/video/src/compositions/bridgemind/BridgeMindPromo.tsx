import React from "react";
import { AbsoluteFill } from "remotion";
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
import { WordHighlightCaption } from "../../components/captions/WordHighlightCaption";
import { BRIDGEMIND_DURATIONS, BRIDGEMIND_TIMING } from "../../lib/constants";
import { FormatProvider } from "../../lib/format-context";

// Placeholder narration data - will be updated in Phase 3
const NARRATION_DATA = {
  words: [
    { text: "spike.land", start_time: 0.5, end_time: 1.2 },
    { text: "was", start_time: 1.3, end_time: 1.5 },
    { text: "ready", start_time: 1.6, end_time: 2.0 },
    // ... more words to be generated in Phase 3
  ]
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

        {/* Audio Layers */}
        {/* 
        <Audio 
          src={staticFile("audio/bridgemind-voiceover.mp3")} 
          volume={0.9} 
        />
        <Audio 
          src={staticFile("audio/bridgemind-music.mp3")} 
          volume={(f) => musicVolumeAtFrame(f, [[0, 1800]], 0.4, 0.12)} 
        />
        */}

        {/* Captions Overlay */}
        <WordHighlightCaption words={NARRATION_DATA.words} currentTime={0} />
      </AbsoluteFill>
    </FormatProvider>
  );
};
