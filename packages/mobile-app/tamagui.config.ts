import { createAnimations } from "@tamagui/animations-css";
import { themes, tokens } from "@tamagui/config/v3";
import { createInterFont } from "@tamagui/font-inter";
import { shorthands } from "@tamagui/shorthands";
import { createTamagui } from "tamagui";

// CSS animations for web compatibility
const animations = createAnimations({
  quick: "100ms ease-in-out",
  medium: "200ms ease-in-out",
  slow: "300ms ease-in-out",
  bouncy: "200ms cubic-bezier(0.25, 0.1, 0.25, 1.5)",
  lazy: "300ms ease-out",
});

const headingFont = createInterFont({
  size: {
    6: 15,
    7: 17,
    8: 20,
    9: 24,
    10: 30,
    11: 40,
    12: 55,
    13: 70,
    14: 85,
    true: 20,
  },
  weight: {
    6: "600",
    7: "700",
  },
  letterSpacing: {
    5: 0,
    6: -0.5,
    7: -1,
    8: -1.5,
    true: -0.5,
  },
});

const bodyFont = createInterFont(
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

export const config = createTamagui({
  defaultTheme: "light",
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  shorthands,
  animations,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  themes,
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

export default config;

export type Conf = typeof config;

declare module "tamagui" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends Conf {}
}
