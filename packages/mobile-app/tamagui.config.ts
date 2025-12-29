import { createAnimations } from "@tamagui/animations-css";
import { tokens as defaultTokens } from "@tamagui/config/v3";
import { createInterFont } from "@tamagui/font-inter";
import { shorthands } from "@tamagui/shorthands";
import { createTamagui, createTheme, createTokens } from "tamagui";
import { borderRadius, colors, lightColorsHex, spacing as themeSpacing } from "./constants/theme";

// ============================================================================
// ANIMATIONS
// ============================================================================

/**
 * CSS animations for web compatibility and React Native
 * Includes standard transitions and brand-specific effects
 */
export const animations = createAnimations({
  // Standard transitions
  quick: "100ms ease-in-out",
  medium: "200ms ease-in-out",
  slow: "300ms ease-in-out",

  // Brand animations
  bouncy: "200ms cubic-bezier(0.25, 0.1, 0.25, 1.5)",
  lazy: "300ms ease-out",

  // Fade animation
  fade: "150ms ease-in-out",

  // Slide animations
  slideUp: "200ms ease-out",
  slideDown: "200ms ease-out",
  slideLeft: "200ms ease-out",
  slideRight: "200ms ease-out",

  // Scale animation for press states
  press: "100ms ease-out",
});

// ============================================================================
// FONTS
// ============================================================================

/**
 * Heading font configuration
 * Uses Inter as a fallback for Montserrat (web heading font)
 */
export const headingFont = createInterFont({
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
    7: 30,
    8: 36,
    9: 48,
    10: 60,
    11: 72,
    12: 96,
    true: 20,
  },
  weight: {
    1: "400",
    2: "500",
    3: "600",
    4: "700",
    5: "800",
    true: "700",
  },
  letterSpacing: {
    1: 0,
    2: -0.25,
    3: -0.5,
    4: -0.75,
    5: -1,
    true: -0.5,
  },
});

/**
 * Body font configuration
 * Optimized for readability on mobile
 */
export const bodyFont = createInterFont(
  {
    weight: {
      1: "400",
      2: "500",
      3: "600",
    },
  },
  {
    sizeSize: (size) => Math.round(size * 1.1),
    sizeLineHeight: (size) => Math.round(size * 1.1 + (size > 20 ? 10 : 10)),
  },
);

// ============================================================================
// CUSTOM TOKENS
// ============================================================================

/**
 * Custom tokens extending Tamagui defaults with spike.land design system
 */
export const tokens = createTokens({
  ...defaultTokens,
  color: {
    ...defaultTokens.color,
    // Dark theme colors (default)
    background: colors.background,
    foreground: colors.foreground,
    card: colors.card,
    cardForeground: colors.cardForeground,
    primary: colors.primary,
    primaryForeground: colors.primaryForeground,
    secondary: colors.secondary,
    secondaryForeground: colors.secondaryForeground,
    muted: colors.muted,
    mutedForeground: colors.mutedForeground,
    accent: colors.accent,
    accentForeground: colors.accentForeground,
    destructive: colors.destructive,
    destructiveForeground: colors.destructiveForeground,
    border: colors.border,
    input: colors.input,
    ring: colors.ring,
    success: colors.success,
    warning: colors.warning,

    // Brand colors
    pixelCyan: colors.pixelCyan,
    pixelFuchsia: colors.pixelFuchsia,

    // Glass morphism colors
    glass0: "rgba(255, 255, 255, 0.05)",
    glass1: "rgba(255, 255, 255, 0.08)",
    glass2: "rgba(255, 255, 255, 0.12)",
    glassBorder: "rgba(255, 255, 255, 0.1)",

    // Utility
    transparent: "transparent",
    white: "#FFFFFF",
    black: "#000000",
  },
  radius: {
    ...defaultTokens.radius,
    0: borderRadius.none,
    1: borderRadius.sm,
    2: borderRadius.DEFAULT,
    3: borderRadius.md,
    4: borderRadius.lg, // matches web --radius
    5: borderRadius.xl,
    6: borderRadius["2xl"],
    7: borderRadius["3xl"],
    true: borderRadius.lg,
    full: borderRadius.full,
  },
  space: {
    ...defaultTokens.space,
    0: themeSpacing[0],
    0.5: themeSpacing[0.5],
    1: themeSpacing[1],
    1.5: themeSpacing[1.5],
    2: themeSpacing[2],
    2.5: themeSpacing[2.5],
    3: themeSpacing[3],
    3.5: themeSpacing[3.5],
    4: themeSpacing[4],
    5: themeSpacing[5],
    6: themeSpacing[6],
    7: themeSpacing[7],
    8: themeSpacing[8],
    9: themeSpacing[9],
    10: themeSpacing[10],
    11: themeSpacing[11],
    12: themeSpacing[12],
    14: themeSpacing[14],
    16: themeSpacing[16],
    20: themeSpacing[20],
    true: themeSpacing[4],
  },
  size: {
    ...defaultTokens.size,
    0: themeSpacing[0],
    1: themeSpacing[1],
    2: themeSpacing[2],
    3: themeSpacing[3],
    4: themeSpacing[4],
    5: themeSpacing[5],
    6: themeSpacing[6],
    7: themeSpacing[7],
    8: themeSpacing[8],
    9: themeSpacing[9],
    10: themeSpacing[10],
    11: themeSpacing[11],
    12: themeSpacing[12],
    true: themeSpacing[4],
  },
  zIndex: {
    ...defaultTokens.zIndex,
    0: 0,
    1: 10,
    2: 20,
    3: 30,
    4: 40,
    5: 50,
    true: 0,
  },
});

// ============================================================================
// THEMES
// ============================================================================

/**
 * Dark theme - default/primary theme for spike.land
 * Based on "Dark Futuristic - The AI Spark" design philosophy
 */
export const darkTheme = createTheme({
  background: colors.background,
  backgroundHover: colors.muted,
  backgroundPress: colors.secondary,
  backgroundFocus: colors.muted,
  backgroundStrong: colors.card,
  backgroundTransparent: "transparent",

  color: colors.foreground,
  colorHover: colors.foreground,
  colorPress: colors.mutedForeground,
  colorFocus: colors.foreground,
  colorTransparent: "transparent",

  borderColor: colors.border,
  borderColorHover: colors.primary,
  borderColorFocus: colors.ring,
  borderColorPress: colors.secondary,

  placeholderColor: colors.mutedForeground,

  // Semantic colors
  blue: colors.primary,
  green: colors.success,
  red: colors.destructive,
  yellow: colors.warning,
  orange: colors.warning,
  pink: colors.pixelFuchsia,
  purple: colors.secondary,
  gray: colors.muted,

  // Component-specific tokens
  shadowColor: "rgba(0, 0, 0, 0.35)",
  shadowColorHover: "rgba(0, 0, 0, 0.45)",

  // Glass morphism tokens
  glass0: "rgba(255, 255, 255, 0.05)",
  glass1: "rgba(255, 255, 255, 0.08)",
  glass2: "rgba(255, 255, 255, 0.12)",
  glassBorder: "rgba(255, 255, 255, 0.1)",
});

/**
 * Light theme - alternative theme
 */
export const lightTheme = createTheme({
  background: lightColorsHex.background,
  backgroundHover: lightColorsHex.muted,
  backgroundPress: lightColorsHex.secondary,
  backgroundFocus: lightColorsHex.muted,
  backgroundStrong: lightColorsHex.card,
  backgroundTransparent: "transparent",

  color: lightColorsHex.foreground,
  colorHover: lightColorsHex.foreground,
  colorPress: lightColorsHex.mutedForeground,
  colorFocus: lightColorsHex.foreground,
  colorTransparent: "transparent",

  borderColor: lightColorsHex.border,
  borderColorHover: lightColorsHex.primary,
  borderColorFocus: lightColorsHex.ring,
  borderColorPress: lightColorsHex.secondary,

  placeholderColor: lightColorsHex.mutedForeground,

  // Semantic colors
  blue: lightColorsHex.primary,
  green: lightColorsHex.success,
  red: lightColorsHex.destructive,
  yellow: lightColorsHex.warning,
  orange: lightColorsHex.warning,
  pink: colors.pixelFuchsia,
  purple: lightColorsHex.secondary,
  gray: lightColorsHex.muted,

  // Component-specific tokens
  shadowColor: "rgba(0, 0, 0, 0.08)",
  shadowColorHover: "rgba(0, 0, 0, 0.12)",

  // Glass morphism tokens (lighter for light mode)
  glass0: "rgba(0, 0, 0, 0.02)",
  glass1: "rgba(0, 0, 0, 0.04)",
  glass2: "rgba(0, 0, 0, 0.06)",
  glassBorder: "rgba(0, 0, 0, 0.05)",
});

// ============================================================================
// TAMAGUI CONFIG
// ============================================================================

/**
 * Main Tamagui configuration for spike.land mobile app
 */
export const config = createTamagui({
  defaultTheme: "dark",
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  shorthands,
  animations,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  themes: {
    dark: darkTheme,
    light: lightTheme,
    // Sub-themes for components
    dark_Button: darkTheme,
    light_Button: lightTheme,
    dark_Card: darkTheme,
    light_Card: lightTheme,
    dark_Input: darkTheme,
    light_Input: lightTheme,
  },
  tokens,
  media: {
    xs: { maxWidth: 660 },
    sm: { maxWidth: 800 },
    md: { maxWidth: 1020 },
    lg: { maxWidth: 1280 },
    xl: { maxWidth: 1420 },
    xxl: { maxWidth: 1600 },
    gtXs: { minWidth: 660 + 1 },
    gtSm: { minWidth: 800 + 1 },
    gtMd: { minWidth: 1020 + 1 },
    gtLg: { minWidth: 1280 + 1 },
    short: { maxHeight: 820 },
    tall: { minHeight: 820 },
    hoverNone: { hover: "none" },
    pointerCoarse: { pointer: "coarse" },
  },
});

export type Conf = typeof config;

declare module "tamagui" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends Conf {}
}
