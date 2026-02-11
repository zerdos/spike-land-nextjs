import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { AgentLoopCore } from "../core/AgentLoopCore";

type AgentLoopDiagramProps = {
  /** How many states to reveal (0-7), animated over time */
  revealCount?: number;
  /** Currently active state index for glow effect */
  activeState?: number;
  /** Show the loop arrow (fixing -> generating) */
  showLoop?: boolean;
  /** Scale factor */
  scale?: number;
};

export const AgentLoopDiagram: React.FC<AgentLoopDiagramProps> = ({
  revealCount = 7,
  activeState = -1,
  showLoop = true,
  scale = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Map frame to progress. 
  // Let's assume the whole reveal happens in about 90 frames (3s)
  const progress = Math.min(frame / (fps * 3), 1);

  return (
    <div style={{ width: 1920, height: 1080, position: "relative" }}>
      <AgentLoopCore 
        revealCount={revealCount} 
        activeState={activeState} 
        showLoop={showLoop} 
        progress={progress}
        className="w-full h-full"
      />
      {/* Apply manual scale from props at the top level */}
      <style dangerouslySetInnerHTML={{ __html: `
        .agent-loop-scaled {
          transform: scale(${scale});
          transform-origin: center center;
        }
      ` }} />
    </div>
  );
};
