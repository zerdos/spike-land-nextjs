import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS } from "../../lib/constants";

type BridgeMindLogoProps = {
  size?: number;
  delay?: number;
  animate?: boolean;
};

export const BridgeMindLogo: React.FC<BridgeMindLogoProps> = ({
  size = 120,
  delay = 0,
  animate = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entryProgress = animate
    ? spring({
        frame: frame - delay,
        fps,
        config: SPRING_CONFIGS.snappy,
      })
    : 1;

  const scale = interpolate(entryProgress, [0, 1], [0, 1]);
  const rotate = interpolate(entryProgress, [0, 1], [-90, 0]);
  
  // Continuous pulse
  const glowPulse = Math.sin(((frame - delay) / fps) * Math.PI * 2) * 0.2 + 0.8;



  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        opacity: interpolate(entryProgress, [0, 0.5], [0, 1]),
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        filter: `drop-shadow(0 0 ${20 * glowPulse}px ${COLORS.bridgemindCyan}60)`,
      }}
    >
      {/* Hexagon Background */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="boltGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={COLORS.bridgemindCyan} />
            <stop offset="100%" stopColor={COLORS.bridgemindPink} />
          </linearGradient>
          <linearGradient id="borderGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={COLORS.bridgemindCyan} />
            <stop offset="100%" stopColor={COLORS.bridgemindSlate} />
          </linearGradient>
        </defs>

        {/* Hexagon Shape */}
        <path
          d="M50 0 L93.3 25 V75 L50 100 L6.7 75 V25 Z"
          fill={COLORS.darkCard}
          stroke="url(#borderGradient)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        
        {/* Bolt Icon Centered */}
        <g transform={`translate(50, 50) scale(${0.04 * size}) translate(-12, -12)`}>
            {/* Using the same path as SpikeLand but centered */}
            <path 
                d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" 
                fill="url(#boltGradient)" 
                stroke="white" 
                strokeWidth="0.5"
            />
        </g>
      </svg>
      
      {/* Optional: Text label below if needed, but the icon is the request */}
    </div>
  );
};
