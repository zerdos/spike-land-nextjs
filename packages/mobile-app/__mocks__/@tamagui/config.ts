/**
 * Mock for @tamagui/config
 * Provides minimal Tamagui configuration for testing
 */

// Mock tokens
export const tokens = {
  color: {
    background: "#ffffff",
    backgroundHover: "#f5f5f5",
    backgroundPress: "#e5e5e5",
    backgroundFocus: "#f0f0f0",
    backgroundStrong: "#f0f0f0",
    backgroundTransparent: "transparent",
    color: "#000000",
    colorHover: "#333333",
    colorPress: "#666666",
    colorFocus: "#333333",
    colorTransparent: "transparent",
    borderColor: "#e5e5e5",
    borderColorHover: "#d5d5d5",
    borderColorFocus: "#c5c5c5",
    borderColorPress: "#b5b5b5",
    placeholderColor: "#a0a0a0",
    outlineColor: "#0000ff",
    // Theme colors
    blue1: "#f0f4ff",
    blue2: "#e0e9ff",
    blue3: "#c5d6ff",
    blue4: "#a8c1ff",
    blue5: "#8aabff",
    blue6: "#6b94ff",
    blue7: "#4d7dff",
    blue8: "#2e66ff",
    blue9: "#0f4fff",
    blue10: "#0038e0",
    red1: "#fff0f0",
    red9: "#ff0000",
    green1: "#f0fff0",
    green9: "#00ff00",
    yellow1: "#fffff0",
    yellow9: "#ffff00",
  },
  space: {
    true: 16,
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
  },
  size: {
    true: 16,
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
  },
  radius: {
    true: 8,
    0: 0,
    1: 2,
    2: 4,
    3: 6,
    4: 8,
    5: 10,
    6: 12,
    7: 16,
    8: 20,
    9: 24,
    10: 28,
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
};

// Mock themes
export const themes = {
  light: {
    background: "#ffffff",
    backgroundHover: "#f5f5f5",
    backgroundPress: "#e5e5e5",
    backgroundFocus: "#f0f0f0",
    backgroundStrong: "#f0f0f0",
    backgroundTransparent: "transparent",
    color: "#000000",
    colorHover: "#333333",
    colorPress: "#666666",
    colorFocus: "#333333",
    colorTransparent: "transparent",
    borderColor: "#e5e5e5",
    borderColorHover: "#d5d5d5",
    borderColorFocus: "#c5c5c5",
    borderColorPress: "#b5b5b5",
    placeholderColor: "#a0a0a0",
    outlineColor: "#0000ff",
  },
  dark: {
    background: "#000000",
    backgroundHover: "#1a1a1a",
    backgroundPress: "#2a2a2a",
    backgroundFocus: "#1f1f1f",
    backgroundStrong: "#1f1f1f",
    backgroundTransparent: "transparent",
    color: "#ffffff",
    colorHover: "#cccccc",
    colorPress: "#999999",
    colorFocus: "#cccccc",
    colorTransparent: "transparent",
    borderColor: "#333333",
    borderColorHover: "#444444",
    borderColorFocus: "#555555",
    borderColorPress: "#666666",
    placeholderColor: "#666666",
    outlineColor: "#4d7dff",
  },
  light_blue: {
    background: "#f0f4ff",
    color: "#0038e0",
  },
  dark_blue: {
    background: "#0f1a40",
    color: "#a8c1ff",
  },
};

// Mock shorthands
export const shorthands = {
  p: "padding",
  px: "paddingHorizontal",
  py: "paddingVertical",
  pt: "paddingTop",
  pb: "paddingBottom",
  pl: "paddingLeft",
  pr: "paddingRight",
  m: "margin",
  mx: "marginHorizontal",
  my: "marginVertical",
  mt: "marginTop",
  mb: "marginBottom",
  ml: "marginLeft",
  mr: "marginRight",
  bg: "backgroundColor",
  br: "borderRadius",
  bw: "borderWidth",
  bc: "borderColor",
  f: "flex",
  fd: "flexDirection",
  fw: "flexWrap",
  ai: "alignItems",
  ac: "alignContent",
  as: "alignSelf",
  jc: "justifyContent",
  w: "width",
  h: "height",
  minW: "minWidth",
  maxW: "maxWidth",
  minH: "minHeight",
  maxH: "maxHeight",
};

// Mock animations
export const animations = {
  quick: "100ms ease-in-out",
  medium: "200ms ease-in-out",
  slow: "300ms ease-in-out",
  bouncy: "200ms cubic-bezier(0.25, 0.1, 0.25, 1.5)",
  lazy: "300ms ease-out",
};

// Mock fonts
export const fonts = {
  heading: {
    family: "Inter",
    size: {
      1: 12,
      2: 14,
      3: 16,
      4: 18,
      5: 20,
      6: 24,
      7: 28,
      8: 32,
      9: 40,
      10: 48,
    },
    weight: {
      1: "400",
      2: "500",
      3: "600",
      4: "700",
    },
  },
  body: {
    family: "Inter",
    size: {
      1: 12,
      2: 14,
      3: 16,
      4: 18,
      5: 20,
    },
    weight: {
      1: "400",
      2: "500",
      3: "600",
    },
  },
};

// Mock media queries
export const media = {
  xs: { maxWidth: 660 },
  sm: { maxWidth: 800 },
  md: { maxWidth: 1020 },
  lg: { maxWidth: 1280 },
  xl: { maxWidth: 1420 },
  xxl: { maxWidth: 1600 },
  gtXs: { minWidth: 661 },
  gtSm: { minWidth: 801 },
  gtMd: { minWidth: 1021 },
  gtLg: { minWidth: 1281 },
  short: { maxHeight: 820 },
  tall: { minHeight: 820 },
  hoverNone: { hover: "none" },
  pointerCoarse: { pointer: "coarse" },
};

// Mock configuration creator
export function createTamagui<T>(_config: T): T {
  return _config;
}

// Default export
export default {
  tokens,
  themes,
  shorthands,
  animations,
  fonts,
  media,
  createTamagui,
};
