import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, SPRING_CONFIGS, VERITASIUM_COLORS } from "../../lib/constants";

const EC = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const MONO = "JetBrains Mono, Courier New, monospace";
const SANS = "Inter, system-ui, sans-serif";

const ERROR_MESSAGES = [
  "TypeError: Cannot read properties of undefined",
  'Module not found: @emotion/styled',
  "SyntaxError: Unexpected token '<'",
  "ReferenceError: process is not defined",
  "Error: Failed to resolve import \"react-dom/client\"",
  "Build failed with 3 errors",
];

// Deterministic pseudo-random from frame (no Math.random in Remotion)
const pseudoRandom = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Scene01_Hook — "The Hook" (0:00–0:22, 660 frames @ 30fps)
 *
 * Visual narrative:
 *   0–200f   URL being typed into a browser, app skeleton appearing
 *   200–400f Red error flashes / glitch overlays — failures
 *   400–550f More failures, tension building, error count accumulating
 *   550–660f Success — clean app, golden glow, eureka moment
 */
export const Scene01_Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ─── Phase flags ───────────────────────────────────────────────
  const isTyping = frame < 200;
  const isFirstErrors = frame >= 200 && frame < 400;
  const isMountingErrors = frame >= 400 && frame < 550;
  const isSuccess = frame >= 550;

  // ─── Typing animation for URL bar ─────────────────────────────
  const fullUrl = "spike.land/create/weather-dashboard";
  const typedChars = Math.min(
    fullUrl.length,
    Math.floor(interpolate(frame, [30, 170], [0, fullUrl.length], EC))
  );
  const typedUrl = fullUrl.slice(0, typedChars);
  const cursorVisible = Math.sin(frame * 0.4) > 0 && frame < 180;

  // ─── Browser chrome opacity ────────────────────────────────────
  const browserOpacity = interpolate(frame, [0, 25], [0, 1], EC);

  // ─── App skeleton loading (inside browser) ────────────────────
  const skeletonProgress = interpolate(frame, [140, 200], [0, 1], EC);

  // ─── Glitch intensity ramps up across error phases ────────────
  const glitchIntensity = isFirstErrors
    ? interpolate(frame, [200, 400], [0.3, 0.7], EC)
    : isMountingErrors
      ? interpolate(frame, [400, 540], [0.7, 1], EC)
      : 0;

  // ─── Error count accumulates ──────────────────────────────────
  const errorCount = isFirstErrors
    ? Math.floor(interpolate(frame, [220, 390], [1, 8], EC))
    : isMountingErrors
      ? Math.floor(interpolate(frame, [400, 540], [8, 47], EC))
      : isSuccess
        ? 47
        : 0;

  // ─── Success animations ───────────────────────────────────────
  const successSpring = spring({
    frame: frame - 560,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });
  const successOpacity = interpolate(frame, [550, 580], [0, 1], EC);
  const goldenGlowOpacity = interpolate(frame, [570, 620], [0, 0.6], EC);
  const checkScale = interpolate(successSpring, [0, 1], [0, 1], EC);

  // ─── Red overlay for error phases ─────────────────────────────
  const redOverlayOpacity =
    (isFirstErrors || isMountingErrors)
      ? glitchIntensity * 0.15 * (0.5 + 0.5 * Math.sin(frame * 0.8))
      : 0;

  // ─── Glitch transform ────────────────────────────────────────
  const glitchX =
    (isFirstErrors || isMountingErrors)
      ? pseudoRandom(frame) * glitchIntensity * 12 - glitchIntensity * 6
      : 0;
  const glitchY =
    (isFirstErrors || isMountingErrors)
      ? pseudoRandom(frame + 50) * glitchIntensity * 6 - glitchIntensity * 3
      : 0;

  // ─── Current visible error message (cycles through list) ─────
  const currentErrorIdx =
    (isFirstErrors || isMountingErrors)
      ? Math.floor(frame / 30) % ERROR_MESSAGES.length
      : 0;

  // ─── Error flash visibility (blinks) ─────────────────────────
  const errorFlashOn =
    (isFirstErrors || isMountingErrors) && pseudoRandom(frame * 3) > 0.3;

  // ─── Scanline effect ─────────────────────────────────────────
  const scanlineOffset = (frame * 3) % 8;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: SANS,
      }}
    >
      {/* ── Subtle radial background ──────────────────────────── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${COLORS.darkCard} 0%, ${COLORS.darkBg} 70%)`,
        }}
      />

      {/* ── Browser Frame ─────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 160,
          right: 160,
          bottom: 80,
          opacity: browserOpacity,
          transform: `translate(${glitchX}px, ${glitchY}px)`,
          display: "flex",
          flexDirection: "column",
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${COLORS.darkBorder}`,
          boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
        }}
      >
        {/* ── Title bar ───────────────────────────────────────── */}
        <div
          style={{
            height: 48,
            background: "#1e1e2e",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 10,
            flexShrink: 0,
          }}
        >
          {/* Traffic-light dots */}
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#febc2e" }} />
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#28c840" }} />

          {/* URL bar */}
          <div
            style={{
              flex: 1,
              marginLeft: 16,
              height: 30,
              borderRadius: 8,
              background: "#0d0d1a",
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              fontSize: 14,
              fontFamily: MONO,
              color: COLORS.textSecondary,
              overflow: "hidden",
            }}
          >
            <span style={{ color: COLORS.textMuted, marginRight: 4 }}>https://</span>
            <span style={{ color: COLORS.cyan }}>{typedUrl}</span>
            {cursorVisible && (
              <span style={{ color: COLORS.cyan, fontWeight: 700 }}>|</span>
            )}
          </div>
        </div>

        {/* ── Browser content area ────────────────────────────── */}
        <div
          style={{
            flex: 1,
            background: "#0d0d1a",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* ── Phase 1: App skeleton loading ────────────────── */}
          {(isTyping || isFirstErrors) && !isSuccess && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                padding: 32,
                opacity: isFirstErrors
                  ? interpolate(frame, [200, 250], [1, 0.4], EC)
                  : skeletonProgress,
              }}
            >
              {/* App header skeleton */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 28,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: `linear-gradient(135deg, ${VERITASIUM_COLORS.generating}40, ${VERITASIUM_COLORS.transpiling}40)`,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      height: 16,
                      width: "40%",
                      background: COLORS.darkBorder,
                      borderRadius: 4,
                      marginBottom: 8,
                    }}
                  />
                  <div
                    style={{
                      height: 10,
                      width: "25%",
                      background: `${COLORS.darkBorder}80`,
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>

              {/* Dashboard grid skeleton */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 100,
                      borderRadius: 12,
                      background: `${COLORS.darkCard}`,
                      border: `1px solid ${COLORS.darkBorder}`,
                      opacity: interpolate(
                        skeletonProgress,
                        [i * 0.2, i * 0.2 + 0.4],
                        [0, 1],
                        EC
                      ),
                    }}
                  />
                ))}
              </div>

              {/* Chart area skeleton */}
              <div
                style={{
                  height: 200,
                  borderRadius: 12,
                  background: COLORS.darkCard,
                  border: `1px solid ${COLORS.darkBorder}`,
                  opacity: interpolate(skeletonProgress, [0.5, 1], [0, 1], EC),
                }}
              />
            </div>
          )}

          {/* ── Phase 2 & 3: Error messages flashing ─────────── */}
          {(isFirstErrors || isMountingErrors) && !isSuccess && (
            <>
              {/* Error toast */}
              {errorFlashOn && (
                <div
                  style={{
                    position: "absolute",
                    top: 24,
                    right: 24,
                    padding: "14px 24px",
                    background: `${VERITASIUM_COLORS.failed}20`,
                    border: `1px solid ${VERITASIUM_COLORS.failed}60`,
                    borderRadius: 10,
                    fontFamily: MONO,
                    fontSize: 14,
                    color: VERITASIUM_COLORS.failed,
                    maxWidth: 500,
                    boxShadow: `0 0 20px ${VERITASIUM_COLORS.failed}30`,
                  }}
                >
                  {ERROR_MESSAGES[currentErrorIdx]}
                </div>
              )}

              {/* Error count badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: 24,
                  right: 24,
                  padding: "10px 20px",
                  background: `${VERITASIUM_COLORS.failed}15`,
                  border: `1px solid ${VERITASIUM_COLORS.failed}50`,
                  borderRadius: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: MONO,
                  fontSize: 18,
                  fontWeight: 700,
                  color: VERITASIUM_COLORS.failed,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 400 }}>ERRORS</span>
                <span>{errorCount}</span>
              </div>

              {/* Scattered secondary error lines (terminal style) */}
              {isMountingErrors && (
                <div
                  style={{
                    position: "absolute",
                    left: 32,
                    top: 40,
                    right: 120,
                    bottom: 80,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontFamily: MONO,
                    fontSize: 13,
                    color: VERITASIUM_COLORS.failed,
                    opacity: 0.7,
                    overflow: "hidden",
                  }}
                >
                  {Array.from({ length: Math.min(12, errorCount) }).map((_, i) => {
                    const msgIdx = i % ERROR_MESSAGES.length;
                    const lineOpacity = pseudoRandom(i * 17 + frame * 0.1) > 0.4 ? 1 : 0.2;
                    return (
                      <div key={i} style={{ opacity: lineOpacity, whiteSpace: "nowrap" }}>
                        <span style={{ color: COLORS.textMuted, marginRight: 8 }}>
                          [{String(i + 1).padStart(2, "0")}]
                        </span>
                        {ERROR_MESSAGES[msgIdx]}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Scanline overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent ${scanlineOffset}px,
                    rgba(255,0,0,0.03) ${scanlineOffset}px,
                    rgba(255,0,0,0.03) ${scanlineOffset + 2}px
                  )`,
                  pointerEvents: "none",
                }}
              />
            </>
          )}

          {/* ── Phase 4: Success — clean app ─────────────────── */}
          {isSuccess && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                padding: 32,
                opacity: successOpacity,
              }}
            >
              {/* Clean app header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: `linear-gradient(135deg, ${COLORS.cyan}, ${VERITASIUM_COLORS.generating})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  W
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: COLORS.textPrimary,
                      fontFamily: SANS,
                    }}
                  >
                    Weather Dashboard
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: SANS }}>
                    Live data &middot; 5 widgets &middot; Auto-refresh
                  </div>
                </div>
              </div>

              {/* Dashboard cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
                {(
                  [
                    { label: "Temperature", value: "22\u00b0C", color: VERITASIUM_COLORS.fixing },
                    { label: "Humidity", value: "58%", color: VERITASIUM_COLORS.transpiling },
                    { label: "Wind", value: "12 km/h", color: VERITASIUM_COLORS.learning },
                  ] as const
                ).map((card, i) => {
                  const cardSpring = spring({
                    frame: frame - 570 - i * 8,
                    fps,
                    config: SPRING_CONFIGS.snappy,
                  });
                  const cardScale = interpolate(cardSpring, [0, 1], [0.85, 1], EC);
                  const cardOpacity = interpolate(cardSpring, [0, 0.5], [0, 1], EC);
                  return (
                    <div
                      key={card.label}
                      style={{
                        height: 90,
                        borderRadius: 12,
                        background: COLORS.darkCard,
                        border: `1px solid ${card.color}40`,
                        padding: "16px 20px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        transform: `scale(${cardScale})`,
                        opacity: cardOpacity,
                      }}
                    >
                      <div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: SANS, marginBottom: 6 }}>
                        {card.label}
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: card.color, fontFamily: MONO }}>
                        {card.value}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chart area mock */}
              <div
                style={{
                  height: 180,
                  borderRadius: 12,
                  background: COLORS.darkCard,
                  border: `1px solid ${COLORS.darkBorder}`,
                  position: "relative",
                  overflow: "hidden",
                  padding: "16px 20px",
                }}
              >
                <div style={{ fontSize: 13, color: COLORS.textMuted, fontFamily: SANS, marginBottom: 12 }}>
                  7-Day Forecast
                </div>
                {/* Simple SVG chart line */}
                <svg
                  viewBox="0 0 600 100"
                  style={{ width: "100%", height: 100 }}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.cyan} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={COLORS.cyan} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  {/* Area fill */}
                  <path
                    d="M0,60 C100,40 150,30 200,35 C250,40 300,55 350,45 C400,35 450,25 500,30 C550,35 600,50 600,50 L600,100 L0,100 Z"
                    fill="url(#chartGrad)"
                  />
                  {/* Line */}
                  <path
                    d="M0,60 C100,40 150,30 200,35 C250,40 300,55 350,45 C400,35 450,25 500,30 C550,35 600,50 600,50"
                    fill="none"
                    stroke={COLORS.cyan}
                    strokeWidth={2.5}
                  />
                </svg>
              </div>
            </div>
          )}

          {/* ── Red tint overlay (error phases) ──────────────── */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: VERITASIUM_COLORS.failed,
              opacity: redOverlayOpacity,
              pointerEvents: "none",
              mixBlendMode: "multiply",
            }}
          />
        </div>
      </div>

      {/* ── Golden glow behind browser on success ─────────────── */}
      {isSuccess && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 900,
            height: 600,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: `radial-gradient(ellipse, ${COLORS.gold}${Math.round(goldenGlowOpacity * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}

      {/* ── Success checkmark overlay ─────────────────────────── */}
      {isSuccess && (
        <div
          style={{
            position: "absolute",
            top: 80,
            right: 180,
            transform: `scale(${checkScale})`,
            opacity: successOpacity,
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: VERITASIUM_COLORS.published,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 30px ${VERITASIUM_COLORS.published}60`,
            }}
          >
            {/* Checkmark using CSS borders */}
            <div
              style={{
                width: 22,
                height: 14,
                borderLeft: "4px solid white",
                borderBottom: "4px solid white",
                transform: "rotate(-45deg) translateY(-2px)",
              }}
            />
          </div>
        </div>
      )}

      {/* ── Bottom narrator text ──────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 20,
        }}
      >
        <div
          style={{
            padding: "12px 32px",
            background: `${COLORS.darkBg}dd`,
            borderRadius: 12,
            border: `1px solid ${COLORS.darkBorder}`,
            fontSize: 20,
            fontWeight: 500,
            fontFamily: SANS,
            color: COLORS.textSecondary,
            textAlign: "center",
          }}
        >
          {isTyping && (
            <span>
              You type a URL&hellip; and an{" "}
              <span style={{ color: COLORS.cyan, fontWeight: 700 }}>app appears</span>.
            </span>
          )}
          {isFirstErrors && (
            <span>
              Except&hellip; it{" "}
              <span style={{ color: VERITASIUM_COLORS.failed, fontWeight: 700 }}>doesn&apos;t</span>.
            </span>
          )}
          {isMountingErrors && (
            <span>
              <span style={{ color: VERITASIUM_COLORS.failed, fontWeight: 700 }}>{errorCount} errors</span>
              {" "}and counting.
            </span>
          )}
          {isSuccess && (
            <span>
              Until one day&hellip;{" "}
              <span style={{ color: VERITASIUM_COLORS.published, fontWeight: 700 }}>it just works</span>.
            </span>
          )}
        </div>
      </div>

      {/* ── Vignette ─────────────────────────────────────────── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 50%, ${COLORS.darkBg}90 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
