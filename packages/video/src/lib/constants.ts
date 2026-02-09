/**
 * Video configuration constants
 */
export const VIDEO_CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 1800, // 60 seconds (expanded for proper storytelling)
} as const;

/**
 * Scene timing in frames (at 30fps)
 * Total: 1800 frames = 60 seconds
 *
 * Story Arc: Hook -> Problem -> Discovery -> Solution -> Transformation -> Deployment -> Proof -> CTA
 */
export const TIMING = {
  scene1: { start: 0, end: 150 }, // 0-5s: IntroHook - Brand reveal + hook question
  scene2: { start: 150, end: 390 }, // 5-13s: TheProblem - Dashboard shows declining metrics
  scene3: { start: 390, end: 570 }, // 13-19s: AIDiscovery - AI agent awakens
  scene4: { start: 570, end: 930 }, // 19-31s: ChatSolution - User chats with AI
  scene5: { start: 930, end: 1230 }, // 31-41s: Transformation - AI transforms dashboard
  scene6: { start: 1230, end: 1470 }, // 41-49s: GoingLive - Syncing to all platforms
  scene7: { start: 1470, end: 1650 }, // 49-55s: ResultsProof - Before/after comparison
  scene8: { start: 1650, end: 1800 }, // 55-60s: EndCard - Brand and CTA
} as const;

export const ATTENTION_CHAPTERS = {
  intro:        { from: 0,     duration: 900,  label: "Intro" },
  uncertainty:  { from: 900,   duration: 2700, label: "The Great Refactor" },
  productivity: { from: 3600,  duration: 3600, label: "Productivity Paradox" },
  aiSlop:       { from: 7200,  duration: 5400, label: "AI Slop Case Study" },
  quality:      { from: 12600, duration: 5400, label: "Quality Triangle" },
  identity:     { from: 18000, duration: 5400, label: "Identity & Vision" },
  outro:        { from: 23400, duration: 1178, label: "Outro" },
} as const;

/**
 * Scene durations in frames
 */
export const SCENE_DURATIONS = {
  scene1: TIMING.scene1.end - TIMING.scene1.start, // 150 frames (5s) - IntroHook
  scene2: TIMING.scene2.end - TIMING.scene2.start, // 240 frames (8s) - TheProblem
  scene3: TIMING.scene3.end - TIMING.scene3.start, // 180 frames (6s) - AIDiscovery
  scene4: TIMING.scene4.end - TIMING.scene4.start, // 360 frames (12s) - ChatSolution
  scene5: TIMING.scene5.end - TIMING.scene5.start, // 300 frames (10s) - Transformation
  scene6: TIMING.scene6.end - TIMING.scene6.start, // 240 frames (8s) - GoingLive
  scene7: TIMING.scene7.end - TIMING.scene7.start, // 180 frames (6s) - ResultsProof
  scene8: TIMING.scene8.end - TIMING.scene8.start, // 150 frames (5s) - EndCard
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
