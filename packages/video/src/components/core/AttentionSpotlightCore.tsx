import type { FC } from "react";
import { COLORS, VERITASIUM_COLORS } from "../../lib/constants";

export type AttentionSpotlightCoreProps = {
  tokenCount: number;
  progress: number;
  width?: number;
  height?: number;
  className?: string;
};

const TOKEN_COLORS = [
  VERITASIUM_COLORS.planning,
  VERITASIUM_COLORS.generating,
  VERITASIUM_COLORS.transpiling,
  VERITASIUM_COLORS.fixing,
  VERITASIUM_COLORS.learning,
  COLORS.cyan,
  COLORS.fuchsia,
  COLORS.amber,
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

const interpolate = (val: number, input: [number, number, number], output: [number, number, number]) => {
  if (val <= input[1]) {
    const p = (val - input[0]) / (input[1] - input[0]);
    return output[0] + p * (output[1] - output[0]);
  } else {
    const p = (val - input[1]) / (input[2] - input[1]);
    return output[1] + p * (output[2] - output[1]);
  }
};

export const AttentionSpotlightCore: FC<AttentionSpotlightCoreProps> = ({
  tokenCount,
  progress,
  width = 1920,
  height = 1080,
  className,
}) => {
  // Spotlight dims as token count increases
  const spotlightOpacity = interpolate(
    clamp(tokenCount, 1, 100),
    [1, 20, 100],
    [0.9, 0.5, 0.15]
  );

  const spotlightRadius = interpolate(
    clamp(tokenCount, 1, 100),
    [1, 50, 100],
    [35, 25, 15]
  );

  // Generate deterministic token positions around spotlight
  const tokens = Array.from({ length: tokenCount }, (_, i) => {
    const angle = seededRandom(i * 7) * Math.PI * 2;
    const dist = 150 + seededRandom(i * 13) * 300;
    return {
      x: 960 + Math.cos(angle) * dist,
      y: 540 + Math.sin(angle) * dist,
      color: TOKEN_COLORS[i % TOKEN_COLORS.length],
      size: 4 + seededRandom(i * 19) * 8,
    };
  });

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 1920 1080" 
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="spotlight-cone" cx="50%" cy="50%" r={`${spotlightRadius}%`}>
          <stop offset="0%" stopColor={COLORS.cyan} stopOpacity={spotlightOpacity} />
          <stop offset="40%" stopColor={COLORS.cyan} stopOpacity={spotlightOpacity * 0.4} />
          <stop offset="100%" stopColor={COLORS.cyan} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Spotlight cone */}
      <rect x={0} y={0} width={1920} height={1080} fill="url(#spotlight-cone)" />

      {/* Center glow */}
      <circle
        cx={960}
        cy={540}
        r={40}
        fill={COLORS.cyan}
        opacity={spotlightOpacity * 0.3}
        filter="blur(20px)"
      />

      {/* Token dots */}
      {tokens.map((token, i) => {
        // Simple linear entrance based on progress and index
        const tokenEntrance = clamp((progress * 2) - (i * 0.05), 0, 1);
        
        if (tokenEntrance <= 0) return null;

        return (
          <circle
            key={`token-${i}`}
            cx={token.x}
            cy={token.y}
            r={token.size * tokenEntrance}
            fill={token.color}
            opacity={0.6 * tokenEntrance}
          />
        );
      })}

      {/* Label */}
      <text
        x={960}
        y={980}
        textAnchor="middle"
        fill={COLORS.textSecondary}
        fontSize={18}
        fontFamily="JetBrains Mono, monospace"
      >
        {tokenCount} tokens — attention {Math.round(spotlightOpacity * 100)}%
      </text>
    </svg>
  );
}
