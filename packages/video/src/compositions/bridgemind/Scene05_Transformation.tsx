import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { AgentPanel, DeploymentSequence, TaskBoard, ProgressBar, TokenFlow } from "../../components";
import { COLORS } from "../../lib/constants";

export const Scene05_Transformation: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      {/* 0-90f: Agent Panels */}
      <AbsoluteFill style={{ display: "flex", flexDirection: "row", gap: 20, padding: 40, opacity: interpolate(frame, [0, 15, 75, 90], [0, 1, 1, 0]) }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ flex: 1, transform: `translateY(${interpolate(frame, [i*10, 30+i*10], [50, 0], { extrapolateRight: "clamp" })}px)` }}>
            <AgentPanel header={`Agent #${i+1}`} borderColor={i === 1 ? COLORS.bridgemindPink : COLORS.bridgemindCyan}>
              <div style={{ color: COLORS.textSecondary, fontFamily: "monospace", fontSize: 14 }}>
                 {i === 0 ? "> Resuming session #47..." : i === 1 ? "> Context loaded from BridgeMind" : "> Generating tests..."}
              </div>
              <div style={{ marginTop: 20 }}>
                 <TokenFlow text="EXEC_TASK SYNC_STATE" delay={20 + i * 15} />
              </div>
            </AgentPanel>
          </div>
        ))}
      </AbsoluteFill>

      {/* 90-180f: Progress Overlaid */}
      <AbsoluteFill style={{ opacity: interpolate(frame, [90, 105, 165, 180], [0, 1, 1, 0]), display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: width * 0.8 }}>
          <TaskBoard />
        </div>
        <div style={{ position: "absolute", bottom: 100, width: width * 0.6 }}>
           <ProgressBar progress={interpolate(frame, [90, 180], [20, 85])} />
        </div>
      </AbsoluteFill>

      {/* 180-315f: Deployment */}
      {frame > 180 && (
         <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#050510" }}>
           <div style={{ width: 400 }}>
             <DeploymentSequence 
               delay={190}
               steps={[
                 { label: "Build Optimized", status: "success" },
                 { label: "Tests Passed", status: "success" },
                 { label: "Bridge Sync", status: "success" },
                 { label: "Deploying...", status: frame > 280 ? "success" : "pending" },
               ]} 
             />
           </div>
           {frame > 290 && (
             <div style={{ position: "absolute", right: 200, padding: "10px 40px", background: COLORS.success, color: "white", fontWeight: 900, fontSize: 40, borderRadius: 10 }}>
               LIVE
             </div>
           )}
         </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
