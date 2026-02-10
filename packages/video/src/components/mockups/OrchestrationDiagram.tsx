import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../../lib/constants";

export const OrchestrationDiagram: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps: _fps } = useVideoConfig();

  const centerX = 0;
  const centerY = 0;
  const radius = 300;
  
  const agents = [
    { name: "Claude Code", color: COLORS.bridgemindCyan },
    { name: "Cursor", color: "#60a5fa" },
    { name: "Copilot", color: "#34d399" },
    { name: "Windsurf", color: COLORS.bridgemindPink },
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle, rgba(34, 211, 238, 0.05) 0%, transparent 70%)",
      }}
    >
      <div style={{ position: "relative" }}>
        {/* Hub */}
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.bridgemindCyan}, ${COLORS.bridgemindPink})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 60px ${COLORS.bridgemindCyan}40`,
            zIndex: 10,
            border: "4px solid rgba(255,255,255,0.2)",
          }}
        >
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>BridgeMind</div>
          <div style={{ color: "#fff", fontWeight: 500, fontSize: 12, opacity: 0.8 }}>CLI HUB</div>
        </div>

        {/* Orbiting Nodes */}
        {agents.map((agent, i) => {
          const angle = (i * (360 / agents.length) + frame * 0.5) * (Math.PI / 180);
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <React.Fragment key={agent.name}>
              {/* Connection Line */}
              <svg
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 1,
                  height: 1,
                  overflow: "visible",
                  zIndex: 1,
                }}
              >
                <line
                  x1={centerX + 80}
                  y1={centerY + 80}
                  x2={x + 80}
                  y2={y + 80}
                  stroke={agent.color}
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.3"
                />
              </svg>

              {/* Node */}
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: 140,
                  height: 60,
                  background: COLORS.darkCard,
                  borderRadius: 12,
                  border: `1px solid ${agent.color}80`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  color: "#fff",
                  boxShadow: `0 0 20px ${agent.color}30`,
                  zIndex: 5,
                }}
              >
                {agent.name}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
