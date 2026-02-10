import React from "react";
import { SpikeLandLogo } from "./SpikeLandLogo";
import { BridgeMindLogo } from "./BridgeMindLogo";
import { COLORS } from "../../lib/constants";


type LogoLockupProps = {
  size?: number;
  delay?: number;
};

export const LogoLockup: React.FC<LogoLockupProps> = ({ size = 80, delay = 0 }) => {


  // Animation calculation for connection lines
  // We want the lines to grow from left to right

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: size * 0.3,
      }}
    >
      {/* 1. SpikeLand */}
      <SpikeLandLogo size={size} delay={delay} showWordmark={false} />

      {/* Connection Line 1 */}
      <div style={{ 
        width: size * 0.5, 
        height: 2, 
        background: COLORS.textMuted,
        opacity: 0.5
      }} />

      {/* 2. MCP Pill */}
      <div style={{
          padding: `${size * 0.1}px ${size * 0.25}px`,
          borderRadius: size * 0.5,
          border: `2px solid ${COLORS.textMuted}`,
          color: COLORS.textMuted,
          fontSize: size * 0.3,
          fontWeight: 800,
          fontFamily: "Inter, sans-serif",
          opacity: 0.8
      }}>
        MCP
      </div>

      {/* Connection Line 2 */}
      <div style={{ 
        width: size * 0.5, 
        height: 2, 
        background: COLORS.bridgemindCyan,
        opacity: 0.8,
        boxShadow: `0 0 10px ${COLORS.bridgemindCyan}`
      }} />

      {/* 3. BridgeMind */}
      <BridgeMindLogo size={size * 0.8} delay={delay + 10} />
      
      <div style={{
          marginLeft: size * 0.2,
          fontSize: size * 0.4,
          fontWeight: 700,
          color: "white",
          fontFamily: "Inter, sans-serif"
      }}>
          BridgeMind
      </div>
    </div>
  );
};
