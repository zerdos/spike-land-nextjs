import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS } from "../../lib/constants";
import { spring } from "remotion";
import { useFormat, formatValue } from "../../lib/format-context";
import { BoltIcon } from "../branding/SpikeLandLogo";
import { BridgeMindLogo } from "../branding/BridgeMindLogo";

export const OrchestrationDiagram: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const format = useFormat();
  
  // Animation timing
  const showSpike = spring({ frame, fps, config: SPRING_CONFIGS.snappy });
  const showBridge = spring({ frame: frame - 15, fps, config: SPRING_CONFIGS.snappy });
  const showMind = spring({ frame: frame - 30, fps, config: SPRING_CONFIGS.snappy });

  // Node styles
  const nodeSize = formatValue(format, { landscape: 120, portrait: 80, square: 100 });
  const iconSize = nodeSize * 0.6;
  const fontSize = formatValue(format, { landscape: 24, portrait: 16, square: 20 });
  const gap = formatValue(format, { landscape: 200, portrait: 120, square: 150 });
  
  // Layout direction
  const isPortrait = format === "portrait";
  const flexDirection = isPortrait ? "column" : "row";

  return (
    <AbsoluteFill style={{ 
      background: "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{ 
        display: "flex", 
        flexDirection,
        alignItems: "center", 
        justifyContent: "center",
        gap: gap 
      }}>
        
        {/* SpikeLand Node (Left/Top) */}
        <div style={{ 
          transform: `scale(${showSpike})`,
          opacity: showSpike,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10
        }}>
          <div style={{
            width: nodeSize, height: nodeSize,
            borderRadius: "50%",
            background: COLORS.darkCard,
            border: `2px solid ${COLORS.purple}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 30px ${COLORS.purple}30`
          }}>
            <BoltIcon size={iconSize} color={COLORS.purple} />
          </div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize }}>spike.land</div>
        </div>

        {/* Connection (MCP) */}
        <div style={{ 
          position: "relative",
          width: isPortrait ? 2 : gap,
          height: isPortrait ? gap : 2,
          background: `${COLORS.bridgemindCyan}40`,
          opacity: interpolate(showBridge, [0, 1], [0, 1]),
          display: "flex",
          alignItems: "center",
          justifyContent: "center" 
        }}>
          {/* MCP Label */}
          <div style={{
            position: "absolute",
            background: COLORS.bridgemindSlate,
            padding: "4px 12px",
            borderRadius: 12,
            border: `1px solid ${COLORS.bridgemindCyan}`,
            color: COLORS.bridgemindCyan,
            fontWeight: 800,
            fontSize: fontSize * 0.6,
            zIndex: 10
          }}>
            MCP
          </div>

          {/* Animated Particles */}
          <div style={{
             position: "absolute",
             width: isPortrait ? 4 : 40,
             height: isPortrait ? 40 : 4,
             background: COLORS.bridgemindCyan,
             borderRadius: 2,
             boxShadow: `0 0 10px ${COLORS.bridgemindCyan}`,
             offsetPath: `path('${isPortrait ? `M 0 0 V ${gap}` : `M 0 0 H ${gap}`}')`,
             offsetDistance: `${(frame * 2) % 100}%`,
             opacity: 0.8
          }} />
        </div>

        {/* BridgeMind Node (Right/Bottom) */}
        <div style={{ 
          transform: `scale(${showMind})`,
          opacity: showMind,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10
        }}>
           <div style={{
            width: nodeSize, height: nodeSize,
            borderRadius: "50%",
            background: COLORS.darkCard,
            border: `2px solid ${COLORS.bridgemindCyan}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 30px ${COLORS.bridgemindCyan}30`
          }}>
            <BridgeMindLogo size={iconSize} animate={false} />
          </div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize }}>BridgeMind</div>
        </div>

      </div>
    </AbsoluteFill>
  );
};
