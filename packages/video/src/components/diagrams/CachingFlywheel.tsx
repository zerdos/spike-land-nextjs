import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { pulse, stagger } from "../../lib/animations";
import { COLORS, SPRING_CONFIGS, TYPOGRAPHY, VERITASIUM_COLORS } from "../../lib/constants";

type CachingFlywheelProps = {
  delay?: number;
};

const STEPS = [
  { label: "Generate", color: VERITASIUM_COLORS.generating },
  { label: "Cache", color: COLORS.amber },
  { label: "Serve", color: VERITASIUM_COLORS.published },
  { label: "Improve", color: VERITASIUM_COLORS.learning },
];

export function CachingFlywheel({ delay = 0 }: CachingFlywheelProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const centerX = 240;
  const centerY = 240;
  const radius = 160;

  const entryProgress = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIGS.heavy,
  });

  // Slow rotation
  const elapsed = Math.max(0, frame - delay);
  const rotation = elapsed * 0.15;

  // Pulsing glow
  const glowIntensity = pulse(frame, fps, 1.5);

  // Positions: 12 o'clock, 3, 6, 9
  const positions = STEPS.map((_, i) => {
    const angle = (i / STEPS.length) * Math.PI * 2 - Math.PI / 2;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  });

  return (
    <div
      style={{
        position: "relative",
        width: 480,
        height: 480,
        transform: `scale(${entryProgress})`,
        opacity: interpolate(entryProgress, [0, 0.3], [0, 1], {
          extrapolateRight: "clamp",
        }),
      }}
    >
      {/* SVG Circle + Arrows */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
        viewBox="0 0 480 480"
      >
        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke={`${VERITASIUM_COLORS.flywheel}15`}
          strokeWidth={3}
          strokeDasharray="10 6"
        />

        {/* Spinning highlight arc */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke={VERITASIUM_COLORS.flywheel}
          strokeWidth={4}
          strokeDasharray="60 440"
          strokeLinecap="round"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `${centerX}px ${centerY}px`,
          }}
          opacity={0.6 + glowIntensity * 0.3}
        />

        {/* Curved arrows between steps */}
        {STEPS.map((_, i) => {
          const next = (i + 1) % STEPS.length;
          const startAngle = (i / STEPS.length) * Math.PI * 2 - Math.PI / 2;
          const endAngle = (next / STEPS.length) * Math.PI * 2 - Math.PI / 2;
          const midAngle = (startAngle + endAngle) / 2;

          // Arrow at midpoint of arc
          const arrowX = centerX + Math.cos(midAngle) * (radius + 2);
          const arrowY = centerY + Math.sin(midAngle) * (radius + 2);

          // Arrow direction perpendicular to radius
          const arrowAngle = (midAngle * 180) / Math.PI + 90;

          return (
            <g key={`arrow-${i}`}>
              <polygon
                points="-6,-5 6,0 -6,5"
                fill={COLORS.textMuted}
                transform={`translate(${arrowX}, ${arrowY}) rotate(${arrowAngle})`}
                opacity={0.7}
              />
            </g>
          );
        })}
      </svg>

      {/* Center label */}
      <div
        style={{
          position: "absolute",
          left: centerX - 60,
          top: centerY - 30,
          width: 120,
          height: 60,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: TYPOGRAPHY.fontSize.lg,
            fontWeight: 700,
            color: COLORS.textPrimary,
            fontFamily: TYPOGRAPHY.fontFamily.sans,
            textShadow: `0 0 ${10 + glowIntensity * 15}px ${VERITASIUM_COLORS.flywheel}40`,
          }}
        >
          Caching
        </div>
        <div
          style={{
            fontSize: TYPOGRAPHY.fontSize.xs,
            color: COLORS.textMuted,
            fontFamily: TYPOGRAPHY.fontFamily.sans,
          }}
        >
          flywheel
        </div>
      </div>

      {/* Step nodes */}
      {STEPS.map((step, i) => {
        const nodeDelay = delay + stagger(i, 8);
        const nodeProgress = spring({
          frame: frame - nodeDelay,
          fps,
          config: SPRING_CONFIGS.snappy,
        });

        const pos = positions[i];
        const nodeSize = 90;

        return (
          <div
            key={step.label}
            style={{
              position: "absolute",
              left: pos.x - nodeSize / 2,
              top: pos.y - nodeSize / 2,
              width: nodeSize,
              height: nodeSize,
              borderRadius: nodeSize / 2,
              background: `${step.color}15`,
              border: `2px solid ${step.color}60`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${nodeProgress})`,
              boxShadow: `0 4px 20px ${step.color}20`,
            }}
          >
            <span
              style={{
                fontSize: TYPOGRAPHY.fontSize.sm,
                fontWeight: 700,
                color: step.color,
                fontFamily: TYPOGRAPHY.fontFamily.sans,
                textAlign: "center",
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
