/**
 * spike.land Mobile Design System Theme Constants
 *
 * This file contains all design tokens matching the web app's design system.
 * Brand Philosophy: Dark Futuristic - "The AI Spark"
 * Primary Color: spike.land Cyan #00E5FF (HSL: 187, 100%, 50%)
 */

// ============================================================================
// COLOR TOKENS
// ============================================================================

/**
 * HSL color values for the light theme
 * Format: [hue, saturation%, lightness%]
 */
export const lightColors = {
  background: { h: 210, s: 20, l: 98 }, // #F8FAFB
  foreground: { h: 240, s: 24, l: 9 }, // #12121C (Carbon Text)
  card: { h: 0, s: 0, l: 100 }, // #FFFFFF
  cardForeground: { h: 240, s: 24, l: 9 },
  popover: { h: 0, s: 0, l: 100 },
  popoverForeground: { h: 240, s: 24, l: 9 },
  primary: { h: 187, s: 100, l: 45 }, // Pixel Cyan (light mode - slightly deeper)
  primaryForeground: { h: 0, s: 0, l: 100 },
  primaryText: { h: 187, s: 100, l: 25 }, // Accessible Dark Teal
  secondary: { h: 240, s: 38, l: 14 }, // Surface Blue
  secondaryForeground: { h: 0, s: 0, l: 100 },
  muted: { h: 210, s: 22, l: 97 },
  mutedForeground: { h: 240, s: 25, l: 50 },
  accent: { h: 187, s: 100, l: 50 }, // Pixel Cyan
  accentForeground: { h: 240, s: 24, l: 9 },
  destructive: { h: 0, s: 84, l: 60 }, // Ruby Red
  destructiveForeground: { h: 0, s: 0, l: 100 },
  border: { h: 220, s: 20, l: 88 }, // Grid Grey
  input: { h: 220, s: 20, l: 88 },
  ring: { h: 187, s: 100, l: 45 },
  success: { h: 145, s: 75, l: 42 },
  warning: { h: 38, s: 92, l: 52 },
  pixelCyan: { h: 187, s: 100, l: 45 },
  pixelFuchsia: { h: 320, s: 90, l: 55 },
  gridInactive: { h: 220, s: 20, l: 88 },
} as const;

/**
 * HSL color values for the dark theme (default/primary)
 * Format: [hue, saturation%, lightness%]
 */
export const darkColors = {
  background: { h: 240, s: 45, l: 4 }, // #08080C (Deep Space)
  foreground: { h: 0, s: 0, l: 100 }, // Pure White
  card: { h: 220, s: 30, l: 14 }, // #181c25 (Surface Blue)
  cardForeground: { h: 0, s: 0, l: 98 },
  popover: { h: 220, s: 30, l: 14 },
  popoverForeground: { h: 0, s: 0, l: 100 },
  primary: { h: 187, s: 100, l: 50 }, // Pixel Cyan #00E5FF
  primaryForeground: { h: 240, s: 45, l: 4 },
  primaryText: { h: 187, s: 100, l: 50 },
  secondary: { h: 220, s: 20, l: 25 },
  secondaryForeground: { h: 0, s: 0, l: 100 },
  muted: { h: 220, s: 30, l: 12 },
  mutedForeground: { h: 220, s: 20, l: 90 }, // Increased for mobile contrast
  accent: { h: 187, s: 100, l: 50 }, // Pixel Cyan
  accentForeground: { h: 240, s: 45, l: 4 },
  destructive: { h: 0, s: 84, l: 60 },
  destructiveForeground: { h: 0, s: 0, l: 100 },
  border: { h: 220, s: 20, l: 25 }, // #3F4451
  input: { h: 220, s: 20, l: 25 },
  ring: { h: 187, s: 100, l: 50 },
  success: { h: 142, s: 70, l: 50 },
  successForeground: { h: 240, s: 45, l: 4 },
  warning: { h: 38, s: 92, l: 55 },
  warningForeground: { h: 240, s: 45, l: 4 },
  pixelCyan: { h: 187, s: 100, l: 50 },
  pixelFuchsia: { h: 320, s: 90, l: 60 },
  gridInactive: { h: 220, s: 30, l: 12 },
  surfaceBlue: { h: 220, s: 30, l: 14 },
  borderDark: { h: 220, s: 20, l: 25 },
  borderItem: { h: 220, s: 18, l: 32 },
} as const;

/**
 * Helper function to convert HSL object to CSS HSL string
 */
export const hslToString = (color: { h: number; s: number; l: number; }): string => {
  return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
};

/**
 * Helper function to convert HSL to hex color
 */
export const hslToHex = (h: number, s: number, l: number): string => {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number): string => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Helper to create hex color from HSL object
 */
export const colorToHex = (color: { h: number; s: number; l: number; }): string => {
  return hslToHex(color.h, color.s, color.l);
};

/**
 * Pre-computed hex colors for dark theme (default)
 */
export const colors = {
  // Core semantic colors
  background: colorToHex(darkColors.background),
  foreground: colorToHex(darkColors.foreground),
  card: colorToHex(darkColors.card),
  cardForeground: colorToHex(darkColors.cardForeground),
  popover: colorToHex(darkColors.popover),
  popoverForeground: colorToHex(darkColors.popoverForeground),
  primary: colorToHex(darkColors.primary),
  primaryForeground: colorToHex(darkColors.primaryForeground),
  secondary: colorToHex(darkColors.secondary),
  secondaryForeground: colorToHex(darkColors.secondaryForeground),
  muted: colorToHex(darkColors.muted),
  mutedForeground: colorToHex(darkColors.mutedForeground),
  accent: colorToHex(darkColors.accent),
  accentForeground: colorToHex(darkColors.accentForeground),
  destructive: colorToHex(darkColors.destructive),
  destructiveForeground: colorToHex(darkColors.destructiveForeground),
  border: colorToHex(darkColors.border),
  input: colorToHex(darkColors.input),
  ring: colorToHex(darkColors.ring),
  success: colorToHex(darkColors.success),
  warning: colorToHex(darkColors.warning),

  // Brand colors
  pixelCyan: "#00E5FF",
  pixelFuchsia: "#FF00FF",

  // Transparent variants for glass morphism
  transparent: "transparent",
  white: "#FFFFFF",
  black: "#000000",
} as const;

/**
 * Pre-computed hex colors for light theme
 */
export const lightColorsHex = {
  background: colorToHex(lightColors.background),
  foreground: colorToHex(lightColors.foreground),
  card: colorToHex(lightColors.card),
  cardForeground: colorToHex(lightColors.cardForeground),
  primary: colorToHex(lightColors.primary),
  primaryForeground: colorToHex(lightColors.primaryForeground),
  secondary: colorToHex(lightColors.secondary),
  secondaryForeground: colorToHex(lightColors.secondaryForeground),
  muted: colorToHex(lightColors.muted),
  mutedForeground: colorToHex(lightColors.mutedForeground),
  accent: colorToHex(lightColors.accent),
  accentForeground: colorToHex(lightColors.accentForeground),
  destructive: colorToHex(lightColors.destructive),
  destructiveForeground: colorToHex(lightColors.destructiveForeground),
  border: colorToHex(lightColors.border),
  input: colorToHex(lightColors.input),
  ring: colorToHex(lightColors.ring),
  success: colorToHex(lightColors.success),
  warning: colorToHex(lightColors.warning),
} as const;

// ============================================================================
// SPACING SCALE
// ============================================================================

/**
 * Spacing scale matching Tailwind's default scale
 * Values in pixels
 */
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
} as const;

// ============================================================================
// TYPOGRAPHY SCALE
// ============================================================================

/**
 * Font size scale with corresponding line heights
 * Based on Tailwind's typography scale
 */
export const fontSize = {
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
  "7xl": 72,
  "8xl": 96,
  "9xl": 128,
} as const;

/**
 * Line height scale
 * Can be used with fontSize for consistent typography
 */
export const lineHeight = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
  // Absolute line heights (in pixels)
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
} as const;

/**
 * Font weight scale
 */
export const fontWeight = {
  thin: "100",
  extralight: "200",
  light: "300",
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
  black: "900",
} as const;

/**
 * Letter spacing scale (in pixels)
 */
export const letterSpacing = {
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
  widest: 1.6,
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

/**
 * Border radius scale matching web design
 * Based on --radius: 0.875rem (14px) from globals.css
 */
export const borderRadius = {
  none: 0,
  sm: 4, // 0.25rem
  DEFAULT: 8, // 0.5rem
  md: 10, // ~0.625rem
  lg: 14, // 0.875rem (matches web --radius)
  xl: 18, // ~1.125rem
  "2xl": 24, // 1.5rem
  "3xl": 32, // 2rem
  full: 9999,
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

/**
 * Shadow presets for elevation
 */
export const shadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  DEFAULT: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  xl: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  "2xl": {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  // Glow shadows for brand accent
  glowCyan: {
    shadowColor: colors.pixelCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  glowFuchsia: {
    shadowColor: colors.pixelFuchsia,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

// ============================================================================
// GLASS MORPHISM
// ============================================================================

/**
 * Glass morphism presets for React Native
 * Note: React Native doesn't support backdrop-filter directly,
 * so these are approximated with opacity and blur effects
 */
export const glassMorphism = {
  opacity: {
    light: 0.85,
    dark: 0.12,
    darkMobile: 0.7,
  },
  blur: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 20,
    mobile: 3,
  },
  // Background colors with opacity for glass effect
  glass0: "rgba(255, 255, 255, 0.05)",
  glass1: "rgba(255, 255, 255, 0.08)",
  glass2: "rgba(255, 255, 255, 0.12)",
  glassCard: "rgba(255, 255, 255, 0.12)",
  glassBorder: "rgba(255, 255, 255, 0.1)",
} as const;

// ============================================================================
// ANIMATION DURATIONS
// ============================================================================

/**
 * Animation duration tokens matching web design
 */
export const animation = {
  fast: 150,
  normal: 200,
  slow: 300,
  // Easing presets
  easing: {
    linear: "linear",
    easeIn: "ease-in",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
    bounce: "cubic-bezier(0.25, 0.1, 0.25, 1.5)",
  },
} as const;

// ============================================================================
// Z-INDEX SCALE
// ============================================================================

/**
 * Z-index scale for layering
 */
export const zIndex = {
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  auto: "auto",
} as const;

// ============================================================================
// THEME EXPORT
// ============================================================================

/**
 * Complete theme object for easy import
 */
export const theme = {
  colors,
  lightColors: lightColorsHex,
  darkColors,
  spacing,
  fontSize,
  lineHeight,
  fontWeight,
  letterSpacing,
  borderRadius,
  shadows,
  glassMorphism,
  animation,
  zIndex,
} as const;

export type Theme = typeof theme;
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type FontSize = typeof fontSize;
export type BorderRadius = typeof borderRadius;
