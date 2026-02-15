import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, SPRING_CONFIGS, TYPOGRAPHY, VERITASIUM_COLORS } from "../../lib/constants";
import { stagger } from "../../lib/animations";
import { KineticText } from "../../components/ui/KineticText";
import { BarChart } from "../../components/ui/BarChart";

/**
 * Inline flywheel diagram since CachingFlywheel component may not exist yet.
 * Shows a circular flow: Visitors -> Generate -> Cache -> More URLs -> repeat
 */
const FlywheelDiagram: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const STEPS = [
    { label: "Visitors", angle: 0, color: COLORS.cyan },
    { label: "Generate", angle: 72, color: VERITASIUM_COLORS.generating },
    { label: "Review", angle: 144, color: VERITASIUM_COLORS.planning },
    { label: "Cache", angle: 216, color: COLORS.amber },
    { label: "Grow", angle: 288, color: COLORS.success },
  ];

  const radius = 220;
  const centerX = 400;
  const centerY = 280;

  return (
    <div
      style={{
        position: "relative",
        width: 800,
        height: 560,
      }}
    >
      {/* Center label */}
      <div
        style={{
          position: "absolute",
          left: centerX - 80,
          top: centerY - 30,
          width: 160,
          textAlign: "center",
          fontSize: TYPOGRAPHY.fontSize["2xl"],
          fontWeight: 800,
          color: VERITASIUM_COLORS.flywheel,
          fontFamily: TYPOGRAPHY.fontFamily.sans,
          opacity: spring({
            frame: frame - delay - 10,
            fps,
            config: SPRING_CONFIGS.smooth,
          }),
          textShadow: `0 0 30px ${VERITASIUM_COLORS.flywheel}60`,
        }}
      >
        Flywheel
      </div>

      {/* Steps around the circle */}
      {STEPS.map((step, index) => {
        const itemDelay = delay + stagger(index, 10);
        const progress = spring({
          frame: frame - itemDelay,
          fps,
          config: SPRING_CONFIGS.snappy,
        });

        const angleRad = (step.angle - 90) * (Math.PI / 180);
        const x = centerX + radius * Math.cos(angleRad) - 60;
        const y = centerY + radius * Math.sin(angleRad) - 30;

        return (
          <div
            key={step.label}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 120,
              height: 60,
              borderRadius: 14,
              background: `${step.color}15`,
              border: `2px solid ${step.color}60`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${progress})`,
              opacity: progress,
              boxShadow: `0 4px 20px ${step.color}20`,
            }}
          >
            <span
              style={{
                fontSize: TYPOGRAPHY.fontSize.base,
                fontWeight: 700,
                color: step.color,
                fontFamily: TYPOGRAPHY.fontFamily.sans,
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}

      {/* Connecting arrows (circular arcs represented as curved lines) */}
      {STEPS.map((step, index) => {
        const nextIndex = (index + 1) % STEPS.length;
        const itemDelay = delay + stagger(index, 10) + 8;
        const arrowProgress = spring({
          frame: frame - itemDelay,
          fps,
          config: SPRING_CONFIGS.gentle,
        });

        const angle1 = (step.angle - 90) * (Math.PI / 180);
        const angle2 = (STEPS[nextIndex].angle - 90) * (Math.PI / 180);
        const midAngle = (angle1 + angle2) / 2;

        const arrowR = radius - 40;
        const ax = centerX + arrowR * Math.cos(midAngle);
        const ay = centerY + arrowR * Math.sin(midAngle);

        return (
          <div
            key={`arrow-${index}`}
            style={{
              position: "absolute",
              left: ax - 8,
              top: ay - 8,
              width: 16,
              height: 16,
              opacity: arrowProgress * 0.6,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="4" fill={COLORS.textMuted} />
            </svg>
          </div>
        );
      })}
    </div>
  );
};

export const Scene07_Flywheel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps: _fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Flywheel diagram (0-450) */}
      <Sequence from={0} durationInFrames={450}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: TYPOGRAPHY.fontSize["4xl"],
              fontWeight: 700,
              color: COLORS.textPrimary,
              opacity: interpolate(frame, [10, 30], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            The Caching Flywheel
          </div>
          <FlywheelDiagram delay={20} />
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: Growth text + bar chart (450-900) */}
      <Sequence from={450} durationInFrames={450}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 50,
          }}
        >
          <KineticText
            text="spike.land grows organically"
            fontSize={56}
            color={COLORS.textPrimary}
            type="reveal"
            delay={460}
          />
          <BarChart
            data={[
              { label: "Week 1", value: 12, color: COLORS.cyan },
              { label: "Week 2", value: 45, color: COLORS.cyan },
              { label: "Week 3", value: 120, color: COLORS.purple },
              { label: "Week 4", value: 340, color: COLORS.purple },
              { label: "Week 5", value: 780, color: COLORS.success },
              { label: "Week 6", value: 1500, color: COLORS.success },
            ]}
            maxValue={1500}
            height={300}
            barWidth={80}
            gap={30}
            delay={500}
          />
          <div
            style={{
              fontSize: TYPOGRAPHY.fontSize.lg,
              color: COLORS.textMuted,
              opacity: interpolate(frame, [700, 730], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            From the URLs people actually want
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
