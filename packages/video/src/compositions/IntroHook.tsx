import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AuroraBorealis } from "../components/branding/GradientMesh";
import { SpikeLandLogo } from "../components/branding/SpikeLandLogo";
import { typewriter } from "../lib/animations";
import { COLORS, SPRING_CONFIGS } from "../lib/constants";

/**
 * Scene 1: IntroHook (0-150 frames / 0-5 seconds)
 *
 * Brand reveal with hook question to grab attention.
 *
 * Timeline:
 * - 0-30f: Black -> AuroraBorealis background fade in
 * - 30-60f: SpikeLandLogo bounces in center
 * - 60-90f: Tagline types: "AI That Builds. Results That Matter."
 * - 90-120f: Hook text fades: "What if your social media managed itself?"
 * - 120-150f: Pause for comprehension
 */
export function IntroHook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background fade in
  const bgOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo entry
  const logoProgress = spring({
    frame: frame - 30,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  const logoScale = interpolate(logoProgress, [0, 1], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const logoOpacity = interpolate(logoProgress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Tagline typewriter
  const tagline = "AI That Builds. Results That Matter.";
  const taglineStart = 60;
  const visibleTagline = typewriter(frame, fps, tagline, 25, taglineStart);

  // Hook text
  const hookProgress = spring({
    frame: frame - 90,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  const hookOpacity = interpolate(hookProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const hookY = interpolate(hookProgress, [0, 1], [20, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill>
      {/* Animated aurora background */}
      <AbsoluteFill style={{ opacity: bgOpacity }}>
        <AuroraBorealis />
      </AbsoluteFill>

      {/* Centered logo */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
        }}
      >
        {/* Logo with animation */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
          }}
        >
          <SpikeLandLogo size={160} animate={false} />
        </div>

        {/* Tagline with typewriter */}
        <div
          style={{
            fontSize: 28,
            color: COLORS.textSecondary,
            fontFamily: "Inter, sans-serif",
            fontWeight: 500,
            letterSpacing: "0.02em",
            height: 36,
            opacity: frame >= taglineStart ? 1 : 0,
          }}
        >
          {visibleTagline}
          {visibleTagline.length < tagline.length && frame >= taglineStart && (
            <span
              style={{
                opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
                color: COLORS.cyan,
              }}
            >
              |
            </span>
          )}
        </div>
      </AbsoluteFill>

      {/* Hook question at bottom */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: 160,
        }}
      >
        <div
          style={{
            opacity: hookOpacity,
            transform: `translateY(${hookY}px)`,
            textAlign: "center",
          }}
        >
          {/* Gradient background pill */}
          <div
            style={{
              padding: "20px 48px",
              background: `linear-gradient(135deg, ${COLORS.darkCard}ee, ${COLORS.darkBg}ee)`,
              borderRadius: 16,
              border: `1px solid ${COLORS.cyan}40`,
              boxShadow: `0 0 40px ${COLORS.cyan}20`,
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                color: COLORS.textPrimary,
              }}
            >
              What if your social media{" "}
              <span
                style={{
                  background: `linear-gradient(135deg, ${COLORS.cyan}, ${COLORS.purple})`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                managed itself
              </span>
              ?
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* Subtle vignette */}
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(ellipse at center, transparent 40%, ${COLORS.darkBg}80 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
}
