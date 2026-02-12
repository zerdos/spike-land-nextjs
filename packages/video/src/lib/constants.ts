/**
 * Video configuration constants
 */
export const VIDEO_CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 19800, // 11 minutes
} as const;

/**
 * Vibe Coding Paradox — Scene Durations (frames @ 30fps)
 */
export const VCP_DURATIONS = {
  hook: 1800,               // 60s
  physicsOfAttention: 2700,  // 90s
  beforeState: 1800,         // 60s
  fiveLayerStack: 2700,      // 90s
  fixLoop: 2250,             // 75s
  agentMemory: 2250,         // 75s
  skillMatching: 1800,       // 60s
  metaBuild: 1350,           // 45s
  results: 1800,             // 60s
  endCard: 1350,             // 45s
} as const;

export const VERITASIUM_DURATIONS = {
  hook: 30 * 5,
  attention: 30 * 8,
  stack: 30 * 10,
  darwin: 30 * 12,
  memory: 30 * 8,
  cascade: 30 * 10,
  cta: 30 * 5,
} as const;
export const VCP_TIMING = {
  totalFrames: 19800,  // 11 minutes
  fps: 30,
  transitionFrames: 20,
} as const;

/**
 * Brand colors from spike.land design system
 */
export const COLORS = {
  // Primary brand colors (Nebula Theme)
  cyan: "#8B5CF6", // Re-mapped to Violet
  fuchsia: "#EC4899", // Re-mapped to Pink
  purple: "#A855F7",
  amber: "#F59E0B",
  gold: "#FBBF24",

  // Dark theme
  darkBg: "#0F172A", // Deep Slate
  darkCard: "#1E293B", // Slate-800
  darkBorder: "#334155", // Slate-700

  // Text colors
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",

  // Status colors
  success: "#22c55e",
  warning: "#eab308",
  error: "#ef4444",

  // Chart colors for A/B testing
  variantA: "#8B5CF6", // Violet (was Cyan)
  variantB: "#EC4899", // Pink (was Fuchsia)
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
  smooth: { damping: 200 },
  snappy: { damping: 20, stiffness: 200 },
  bouncy: { damping: 8 },
  heavy: { damping: 15, stiffness: 80, mass: 2 },
  gentle: { damping: 14, stiffness: 100 },
  slow: { damping: 40, stiffness: 60 },
} as const;

/**
 * Glitch effect configuration
 */
export const GLITCH_CONFIG = {
  rgbOffset: 5,
  scanLineGap: 4,
  noiseIntensity: 0.1,
  duration: 15,
} as const;

/**
 * Veritasium-specific color accents (reused for VCP)
 */
export const VERITASIUM_COLORS = {
  // Agent states
  planning: "#8B5CF6",
  generating: "#3B82F6",
  transpiling: "#06B6D4",
  fixing: "#F59E0B",
  learning: "#10B981",
  published: "#22C55E",
  failed: "#EF4444",

  // Note lifecycle
  candidate: "#EAB308",
  active: "#22C55E",
  deprecated: "#6B7280",

  // Laplace formula
  bayesian: "#A78BFA",

  // Flywheel
  flywheel: "#8B5CF6",
} as const;
