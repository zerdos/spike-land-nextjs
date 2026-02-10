import React from "react";
import { COLORS } from "../../lib/constants";

type AgentPanelProps = {
  children: React.ReactNode;
  header: string;
  borderColor?: string;
  width?: number | string;
};

export const AgentPanel: React.FC<AgentPanelProps> = ({
  children,
  header,
  borderColor = COLORS.bridgemindCyan,
  width = "100%",
}) => {
  return (
    <div
      style={{
        width,
        background: COLORS.darkBg,
        borderRadius: 12,
        border: `1px solid ${COLORS.darkBorder}`,
        borderTop: `4px solid ${borderColor}`,
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: `1px solid ${COLORS.darkBorder}`,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f56" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffbd2e" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#27c93f" }} />
        <div
          style={{
            marginLeft: 8,
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: COLORS.textMuted,
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {header}
        </div>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
};
