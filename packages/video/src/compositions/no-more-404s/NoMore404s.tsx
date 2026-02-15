import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { COLORS, TYPOGRAPHY } from "../../lib/constants";
import { N404_DURATIONS, N404_TIMING } from "../../lib/n404-constants";
import { getN404SceneAudioEntries } from "../../lib/n404-narration";

import { Scene01_Hook } from "./Scene01_Hook";
import { Scene02_Problem } from "./Scene02_Problem";
import { Scene03_Pipeline } from "./Scene03_Pipeline";
import { Scene04_Reviewers } from "./Scene04_Reviewers";
import { Scene05_Demo } from "./Scene05_Demo";
import { Scene06_BridgeMind } from "./Scene06_BridgeMind";
import { Scene07_Flywheel } from "./Scene07_Flywheel";
import { Scene08_EndCard } from "./Scene08_EndCard";

const SCENES = [
  { component: Scene01_Hook, duration: N404_DURATIONS.hook },
  { component: Scene02_Problem, duration: N404_DURATIONS.problem },
  { component: Scene03_Pipeline, duration: N404_DURATIONS.pipeline },
  { component: Scene04_Reviewers, duration: N404_DURATIONS.reviewers },
  { component: Scene05_Demo, duration: N404_DURATIONS.demo },
  { component: Scene06_BridgeMind, duration: N404_DURATIONS.bridgemind },
  { component: Scene07_Flywheel, duration: N404_DURATIONS.flywheel },
  { component: Scene08_EndCard, duration: N404_DURATIONS.endCard },
] as const;

const sceneAudioEntries = getN404SceneAudioEntries();

export const NoMore404s: React.FC = () => {
  const transitionDuration = N404_TIMING.transitionFrames;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Per-scene voiceover audio */}
      {sceneAudioEntries.map(({ sceneId, startFrame }) => (
        <Sequence key={sceneId} from={startFrame} durationInFrames={N404_DURATIONS[sceneId as keyof typeof N404_DURATIONS]}>
          <Audio src={staticFile(`audio/n404-${sceneId}.mp3`)} volume={1.0} />
        </Sequence>
      ))}

      {/* Visual scenes */}
      <TransitionSeries>
        {SCENES.map((scene, index) => {
          const SceneComponent = scene.component;
          return (
            <React.Fragment key={index}>
              <TransitionSeries.Sequence durationInFrames={scene.duration}>
                <SceneComponent />
              </TransitionSeries.Sequence>
              {index < SCENES.length - 1 && (
                <TransitionSeries.Transition
                  presentation={fade()}
                  timing={linearTiming({ durationInFrames: transitionDuration })}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
