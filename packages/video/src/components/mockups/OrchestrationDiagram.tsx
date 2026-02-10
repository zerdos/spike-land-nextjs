import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../../lib/constants";

export const OrchestrationDiagram: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const radius = 300;

  const agents = [
    { name: "Claude Code", color: COLORS.bridgemindCyan },
    { name: "Cursor", color: "#60a5fa" },
    { name: "Copilot", color: "#34d399" },
    { name: "Windsurf", color: COLORS.bridgemindPink },
  ];

  const nodePositions = agents.map((_, i) => {
    const angle = (i * (360 / agents.length) + (frame / fps) * 15) * (Math.PI / 180);
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });

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
      <div style={{ position: "relative", width: 800, height: 800 }}>
        {/* Hub - centered */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
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

        {/* Connection Lines */}
        <svg style={{ position: "absolute", inset: 0, overflow: "visible", zIndex: 1 }}>
          {agents.map((agent, i) => {
            const { x, y } = nodePositions[i];
            return (
              <line
                key={agent.name}
                x1={400}
                y1={400}
                x2={400 + x}
                y2={400 + y}
                stroke={agent.color}
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.3"
              />
            );
          })}
        </svg>

        {/* Orbiting Nodes */}
        {agents.map((agent, i) => {
          const { x, y } = nodePositions[i];
          return (
            <div
              key={agent.name}
              style={{
                position: "absolute",
                left: 400 + x - 70,
                top: 400 + y - 30,
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
          );
        })}
      </div>
    </div>
  );
};
