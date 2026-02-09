import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GradientMesh } from "../components/branding/GradientMesh";
import { bezierPath, pulse } from "../lib/animations";
import { COLORS, SPRING_CONFIGS } from "../lib/constants";

/**
 * Scene 3: AIDiscovery (390-570 frames / 13-19 seconds)
 *
 * AI agent awakens and offers help.
 *
 * Timeline (180 frames / 6s):
 * - 0-30f: Dashboard dims
 * - 30-90f: AI orb materializes from off-screen with particle trail
 * - 90-120f: Orb pulses (awakening)
 * - 120-150f: Orb "looks" at dashboard
 * - 150-180f: Text: "Your AI-powered command center"
 */
export function AIDiscovery() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dashboard dim effect
  const dashboardOpacity = interpolate(frame, [0, 30], [1, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Orb entry animation
  const orbEntryProgress = interpolate(frame, [30, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Orb awakening pulse
  const awakeningProgress = interpolate(frame, [90, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Orb looking at dashboard
  const lookProgress = interpolate(frame, [120, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Text reveal
  const textProgress = spring({
    frame: frame - 150,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  const textOpacity = interpolate(textProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const textY = interpolate(textProgress, [0, 1], [20, 0]);

  return (
    <AbsoluteFill>
      {/* Background */}
      <GradientMesh animationSpeed={0.01} />

      {/* Dimmed dashboard representation */}
      <AbsoluteFill
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          opacity: dashboardOpacity,
        }}
      >
        <DimmedDashboard />
      </AbsoluteFill>

      {/* AI Orb */}
      <AIOrb
        entryProgress={orbEntryProgress}
        awakeningProgress={awakeningProgress}
        lookProgress={lookProgress}
      />

      {/* Text overlay */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: 100,
        }}
      >
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
          }}
        >
          <div
            style={{
              padding: "20px 48px",
              background: `linear-gradient(135deg, ${COLORS.darkCard}ee, ${COLORS.darkBg}ee)`,
              borderRadius: 16,
              border: `1px solid ${COLORS.cyan}40`,
              boxShadow: `0 0 40px ${COLORS.cyan}30`,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                color: COLORS.textPrimary,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span>🤖</span>
              Your{" "}
              <span
                style={{
                  background: `linear-gradient(135deg, ${COLORS.cyan}, ${COLORS.purple})`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                AI-powered
              </span>{" "}
              command center
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/**
 * Dimmed version of dashboard for background
 */
function DimmedDashboard() {
  return (
    <div
      style={{
        width: 900,
        backgroundColor: `${COLORS.darkCard}80`,
        borderRadius: 20,
        border: `1px solid ${COLORS.darkBorder}`,
        padding: 32,
        filter: "blur(2px)",
      }}
    >
      {/* Dashboard header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${COLORS.success}60, #059669)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
          }}
        >
          📊
        </div>
        <div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: COLORS.textPrimary,
              fontFamily: "Inter, sans-serif",
              opacity: 0.7,
            }}
          >
            Pulse Dashboard
          </div>
          <div
            style={{
              fontSize: 14,
              color: COLORS.textMuted,
              fontFamily: "Inter, sans-serif",
            }}
          >
            Awaiting optimization...
          </div>
        </div>
      </div>

      {/* Platform cards placeholder */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {["IG", "FB", "X"].map((p) => (
          <div
            key={p}
            style={{
              padding: 16,
              backgroundColor: `${COLORS.darkBg}60`,
              borderRadius: 10,
              border: `1px solid ${COLORS.darkBorder}`,
              opacity: 0.6,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.textMuted,
                fontFamily: "Inter, sans-serif",
                marginBottom: 8,
              }}
            >
              {p}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: COLORS.textSecondary,
                fontFamily: "Inter, sans-serif",
              }}
            >
              --
            </div>
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div
        style={{
          height: 120,
          backgroundColor: `${COLORS.darkBg}40`,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 14,
            color: COLORS.textMuted,
            fontFamily: "Inter, sans-serif",
          }}
        >
          Metrics loading...
        </span>
      </div>
    </div>
  );
}

type AIOrbProps = {
  entryProgress: number;
  awakeningProgress: number;
  lookProgress: number;
};

/**
 * AI Agent orb with particle trail and glow effects
 */
function AIOrb({ entryProgress, awakeningProgress, lookProgress }: AIOrbProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glowPulse = pulse(frame, fps, 2);

  // Entry path - bezier curve from right side
  let orbX: number;
  let orbY: number;
  let orbScale: number;

  if (entryProgress < 1) {
    // Entry: curved path from off-screen
    const path = bezierPath(
      entryProgress,
      { x: 600, y: 0 }, // Start off-screen right
      { x: 400, y: -100 }, // Control point 1
      { x: 200, y: -50 }, // Control point 2
      { x: 0, y: 0 }, // End at center
    );
    orbX = path.x;
    orbY = path.y;
    orbScale = interpolate(entryProgress, [0, 1], [0.3, 1]);
  } else if (lookProgress > 0) {
    // Looking at dashboard - subtle movement
    orbX = interpolate(lookProgress, [0, 1], [0, -100], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
    orbY = interpolate(lookProgress, [0, 1], [0, 50], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
    orbScale = 1;
  } else {
    orbX = 0;
    orbY = 0;
    orbScale = 1;
  }

  // Awakening pulse effect
  const awakeningScale = 1 + awakeningProgress * 0.1 * Math.sin(awakeningProgress * Math.PI * 4);
  const awakeningGlow = awakeningProgress * 30;

  const orbSize = 100;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: orbSize,
          height: orbSize,
          transform: `translate(${orbX}px, ${orbY}px) scale(${orbScale * awakeningScale})`,
        }}
      >
        {/* Outer glow */}
        <div
          style={{
            position: "absolute",
            inset: -40 - awakeningGlow,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${COLORS.cyan}50 0%, transparent 70%)`,
            filter: `blur(${20 + awakeningGlow}px)`,
            opacity: 0.6 + glowPulse * 0.3,
          }}
        />

        {/* Particle trail during entry */}
        {entryProgress > 0 && entryProgress < 1 && <ParticleTrail progress={entryProgress} />}

        {/* Main orb */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.cyan} 0%, ${COLORS.purple} 100%)`,
            boxShadow: `
              0 0 ${30 + glowPulse * 20 + awakeningGlow}px ${COLORS.cyan}80,
              inset 0 0 30px rgba(255,255,255,0.3)
            `,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* AI icon */}
          <span style={{ fontSize: 44 }}>🤖</span>
        </div>

        {/* Orbiting ring */}
        <div
          style={{
            position: "absolute",
            inset: -15,
            borderRadius: "50%",
            border: `2px solid ${COLORS.cyan}60`,
            transform: `rotate(${frame * 2}deg)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -6,
              left: "50%",
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: COLORS.cyan,
              transform: "translateX(-50%)",
              boxShadow: `0 0 10px ${COLORS.cyan}`,
            }}
          />
        </div>

        {/* Second orbiting ring (opposite direction) */}
        <div
          style={{
            position: "absolute",
            inset: -25,
            borderRadius: "50%",
            border: `1px solid ${COLORS.purple}40`,
            transform: `rotate(${-frame * 1.5}deg)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -4,
              left: "50%",
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: COLORS.purple,
              transform: "translateX(-50%)",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

type ParticleTrailProps = {
  progress: number;
};

/**
 * Particle trail following the AI orb
 */
function ParticleTrail({ progress }: ParticleTrailProps) {
  const particles = Array.from({ length: 12 }, (_, i) => {
    const delay = i * 0.08;
    const particleProgress = Math.max(0, progress - delay);
    const opacity = Math.max(0, 1 - i * 0.08);
    const scale = 1 - i * 0.05;

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${50 + i * 30}%`,
          top: `${50 - Math.sin(i * 0.5) * 20}%`,
          width: 10 * scale,
          height: 10 * scale,
          borderRadius: "50%",
          backgroundColor: COLORS.cyan,
          opacity: opacity * particleProgress,
          transform: "translate(-50%, -50%)",
          boxShadow: `0 0 ${10 * scale}px ${COLORS.cyan}`,
        }}
      />
    );
  });

  return <>{particles}</>;
}
