/**
 * Video configuration constants
 */
export const VIDEO_CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 450, // 15 seconds
} as const;

/**
 * Scene timing in frames (at 30fps)
 */
export const TIMING = {
  scene1: { start: 0, end: 90 }, // 0-3s: Orbit Dashboard
  scene2: { start: 90, end: 240 }, // 3-8s: My-Apps Agent Chat
  scene3: { start: 240, end: 360 }, // 8-12s: Live Update + Glitch
  scene4: { start: 360, end: 450 }, // 12-15s: End Card
} as const;

/**
 * Scene durations in frames
 */
export const SCENE_DURATIONS = {
  scene1: TIMING.scene1.end - TIMING.scene1.start, // 90 frames (3s)
  scene2: TIMING.scene2.end - TIMING.scene2.start, // 150 frames (5s)
  scene3: TIMING.scene3.end - TIMING.scene3.start, // 120 frames (4s)
  scene4: TIMING.scene4.end - TIMING.scene4.start, // 90 frames (3s)
} as const;

/**
 * Brand colors from spike.land design system
 */
export const COLORS = {
  // Primary brand colors
  cyan: "#00E5FF",
  fuchsia: "#FF00FF",
  purple: "#9945FF",
  amber: "#F59E0B",
  gold: "#FBBF24",

  // Dark theme
  darkBg: "#0a0a0f",
  darkCard: "#1a1a2e",
  darkBorder: "#2a2a3e",

  // Text colors
  textPrimary: "#ffffff",
  textSecondary: "#a0a0a0",
  textMuted: "#6b7280",

  // Status colors
  success: "#22c55e",
  warning: "#eab308",
  error: "#ef4444",

  // Chart colors for A/B testing
  variantA: "#00E5FF", // Cyan
  variantB: "#FF00FF", // Fuchsia
} as const;

/**
 * Typography scale
 */
export const TYPOGRAPHY = {
  fontFamily: {
    sans: "Inter, system-ui, sans-serif",
    mono: "JetBrains Mono, monospace",
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
    "5xl": 48,
    "6xl": 60,
  },
} as const;

/**
 * Spring configurations for different animation feels
 */
export const SPRING_CONFIGS = {
  smooth: { damping: 200 }, // Smooth, no bounce (subtle reveals)
  snappy: { damping: 20, stiffness: 200 }, // Snappy, minimal bounce (UI elements)
  bouncy: { damping: 8 }, // Bouncy entrance (playful animations)
  heavy: { damping: 15, stiffness: 80, mass: 2 }, // Heavy, slow, small bounce
} as const;

/**
 * Glitch effect configuration
 */
export const GLITCH_CONFIG = {
  rgbOffset: 5, // Pixels to offset RGB channels
  scanLineGap: 4, // Gap between scan lines
  noiseIntensity: 0.1, // 0-1 noise overlay intensity
  duration: 15, // Frames for glitch transition
} as const;
