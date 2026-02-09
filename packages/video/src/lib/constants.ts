/**
 * Video configuration constants
 */
export const VIDEO_CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 24578, // 819.26s
} as const;

/**
 * New Scene Structure (10 Scenes)
 */
export const SCENE_CHAPTERS = {
  hook:      { from: 6,     duration: 1352, label: "The Hook" },
  defined:   { from: 1358,  duration: 2064, label: "Context Engineering Defined" },
  planMode:  { from: 3422,  duration: 2472, label: "Plan Mode Deep Dive" },
  memento:   { from: 5894,  duration: 2223, label: "The Memento / Zero Memory" },
  physics:   { from: 8117,  duration: 2816, label: "Physics of Attention" },
  economics: { from: 10933, duration: 2378, label: "Economics of Tokens" },
  caching:   { from: 13311, duration: 3852, label: "Caching & Context Rot" },
  metacog:   { from: 17163, duration: 1610, label: "Metacognition & Human Role" },
  tactics:   { from: 18773, duration: 3531, label: "Practical Tactics" },
  metaOutro: { from: 22304, duration: 2274, label: "Meta Revelation & Outro" },
} as const;

export const TIMING = {
  scene1: { start: 0, end: 150 },
  scene2: { start: 150, end: 390 },
  scene3: { start: 390, end: 570 },
  scene4: { start: 570, end: 930 },
  scene5: { start: 930, end: 1230 },
  scene6: { start: 1230, end: 1470 },
  scene7: { start: 1470, end: 1650 },
  scene8: { start: 1650, end: 1800 },
} as const;

/**
 * Scene durations in frames
 */
export const SCENE_DURATIONS = {
  // New scenes (using array index map for compat if needed, or just accessing array)
  // For now, these are not directly used by name in the new array structure, 
  // but if we need named access we should probably keep the object or add a helper.
  // The plan said SCENE_CHAPTERS should be an array.
  
  // Backwards compatibility for PromoVideo
  scene1: TIMING.scene1.end - TIMING.scene1.start,
  scene2: TIMING.scene2.end - TIMING.scene2.start,
  scene3: TIMING.scene3.end - TIMING.scene3.start,
  scene4: TIMING.scene4.end - TIMING.scene4.start,
  scene5: TIMING.scene5.end - TIMING.scene5.start,
  scene6: TIMING.scene6.end - TIMING.scene6.start,
  scene7: TIMING.scene7.end - TIMING.scene7.start,
  scene8: TIMING.scene8.end - TIMING.scene8.start,
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
