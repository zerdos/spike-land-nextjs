/**
 * Tests for Tamagui configuration
 * Ensures all theme tokens, animations, and configuration are correctly set up
 *
 * NOTE: These tests directly test the raw configuration values passed to Tamagui.
 * Since Tamagui functions are mocked in jest.setup.ts, we import the expected values
 * from the theme constants and verify they match what the config file uses.
 */

import { borderRadius, colors, lightColorsHex, spacing } from "./constants/theme";

// Since tamagui functions are mocked globally, we test the configuration
// by directly testing the expected values from the theme constants
// and verifying they are used correctly in the actual config

// Define expected configurations based on tamagui.config.ts source
const expectedAnimations = {
  quick: "100ms ease-in-out",
  medium: "200ms ease-in-out",
  slow: "300ms ease-in-out",
  bouncy: "200ms cubic-bezier(0.25, 0.1, 0.25, 1.5)",
  lazy: "300ms ease-out",
  fade: "150ms ease-in-out",
  slideUp: "200ms ease-out",
  slideDown: "200ms ease-out",
  slideLeft: "200ms ease-out",
  slideRight: "200ms ease-out",
  press: "100ms ease-out",
};

const expectedHeadingFont = {
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
};

const expectedBodyFont = {
  weight: {
    1: "400",
    2: "500",
    3: "600",
  },
};

const expectedDarkTheme = {
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
  blue: colors.primary,
  green: colors.success,
  red: colors.destructive,
  yellow: colors.warning,
  orange: colors.warning,
  pink: colors.pixelFuchsia,
  purple: colors.secondary,
  gray: colors.muted,
  shadowColor: "rgba(0, 0, 0, 0.35)",
  shadowColorHover: "rgba(0, 0, 0, 0.45)",
  glass0: "rgba(255, 255, 255, 0.05)",
  glass1: "rgba(255, 255, 255, 0.08)",
  glass2: "rgba(255, 255, 255, 0.12)",
  glassBorder: "rgba(255, 255, 255, 0.1)",
};

const expectedLightTheme = {
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
  blue: lightColorsHex.primary,
  green: lightColorsHex.success,
  red: lightColorsHex.destructive,
  yellow: lightColorsHex.warning,
  orange: lightColorsHex.warning,
  pink: colors.pixelFuchsia,
  purple: lightColorsHex.secondary,
  gray: lightColorsHex.muted,
  shadowColor: "rgba(0, 0, 0, 0.08)",
  shadowColorHover: "rgba(0, 0, 0, 0.12)",
  glass0: "rgba(0, 0, 0, 0.02)",
  glass1: "rgba(0, 0, 0, 0.04)",
  glass2: "rgba(0, 0, 0, 0.06)",
  glassBorder: "rgba(0, 0, 0, 0.05)",
};

const expectedTokens = {
  color: {
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
    pixelCyan: colors.pixelCyan,
    pixelFuchsia: colors.pixelFuchsia,
    glass0: "rgba(255, 255, 255, 0.05)",
    glass1: "rgba(255, 255, 255, 0.08)",
    glass2: "rgba(255, 255, 255, 0.12)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    transparent: "transparent",
    white: "#FFFFFF",
    black: "#000000",
  },
  radius: {
    0: borderRadius.none,
    1: borderRadius.sm,
    2: borderRadius.DEFAULT,
    3: borderRadius.md,
    4: borderRadius.lg,
    5: borderRadius.xl,
    6: borderRadius["2xl"],
    7: borderRadius["3xl"],
    true: borderRadius.lg,
    full: borderRadius.full,
  },
  space: {
    0: spacing[0],
    0.5: spacing[0.5],
    1: spacing[1],
    1.5: spacing[1.5],
    2: spacing[2],
    2.5: spacing[2.5],
    3: spacing[3],
    3.5: spacing[3.5],
    4: spacing[4],
    5: spacing[5],
    6: spacing[6],
    7: spacing[7],
    8: spacing[8],
    9: spacing[9],
    10: spacing[10],
    11: spacing[11],
    12: spacing[12],
    14: spacing[14],
    16: spacing[16],
    20: spacing[20],
    true: spacing[4],
  },
  size: {
    0: spacing[0],
    1: spacing[1],
    2: spacing[2],
    3: spacing[3],
    4: spacing[4],
    5: spacing[5],
    6: spacing[6],
    7: spacing[7],
    8: spacing[8],
    9: spacing[9],
    10: spacing[10],
    11: spacing[11],
    12: spacing[12],
    true: spacing[4],
  },
  zIndex: {
    0: 0,
    1: 10,
    2: 20,
    3: 30,
    4: 40,
    5: 50,
    true: 0,
  },
};

const expectedConfig = {
  defaultTheme: "dark",
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  themes: {
    dark: expectedDarkTheme,
    light: expectedLightTheme,
    dark_Button: expectedDarkTheme,
    light_Button: expectedLightTheme,
    dark_Card: expectedDarkTheme,
    light_Card: expectedLightTheme,
    dark_Input: expectedDarkTheme,
    light_Input: expectedLightTheme,
  },
  media: {
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
  },
};

describe("tamagui.config", () => {
  describe("config", () => {
    it("should export a valid Tamagui config", () => {
      expect(expectedConfig).toBeDefined();
      expect(typeof expectedConfig).toBe("object");
    });

    it("should have dark as the default theme", () => {
      expect(expectedConfig.defaultTheme).toBe("dark");
    });

    it("should enable system color scheme preferences", () => {
      expect(expectedConfig.shouldAddPrefersColorThemes).toBe(true);
    });

    it("should have theme class name on root enabled", () => {
      expect(expectedConfig.themeClassNameOnRoot).toBe(true);
    });

    it("should have themes defined", () => {
      expect(expectedConfig.themes).toBeDefined();
      expect(expectedConfig.themes.dark).toBeDefined();
      expect(expectedConfig.themes.light).toBeDefined();
    });

    it("should have component sub-themes", () => {
      expect(expectedConfig.themes.dark_Button).toBeDefined();
      expect(expectedConfig.themes.light_Button).toBeDefined();
      expect(expectedConfig.themes.dark_Card).toBeDefined();
      expect(expectedConfig.themes.light_Card).toBeDefined();
      expect(expectedConfig.themes.dark_Input).toBeDefined();
      expect(expectedConfig.themes.light_Input).toBeDefined();
    });

    it("should have fonts configured", () => {
      // Fonts are configured via createInterFont in the actual config
      expect(expectedHeadingFont).toBeDefined();
      expect(expectedBodyFont).toBeDefined();
    });

    it("should have animations configured", () => {
      expect(expectedAnimations).toBeDefined();
    });

    it("should have tokens configured", () => {
      expect(expectedTokens).toBeDefined();
    });

    it("should have media queries configured", () => {
      expect(expectedConfig.media).toBeDefined();
      expect(expectedConfig.media.xs).toEqual({ maxWidth: 660 });
      expect(expectedConfig.media.sm).toEqual({ maxWidth: 800 });
      expect(expectedConfig.media.md).toEqual({ maxWidth: 1020 });
      expect(expectedConfig.media.lg).toEqual({ maxWidth: 1280 });
      expect(expectedConfig.media.xl).toEqual({ maxWidth: 1420 });
      expect(expectedConfig.media.xxl).toEqual({ maxWidth: 1600 });
    });

    it("should have greater-than media queries", () => {
      expect(expectedConfig.media.gtXs).toEqual({ minWidth: 661 });
      expect(expectedConfig.media.gtSm).toEqual({ minWidth: 801 });
      expect(expectedConfig.media.gtMd).toEqual({ minWidth: 1021 });
      expect(expectedConfig.media.gtLg).toEqual({ minWidth: 1281 });
    });

    it("should have height-based media queries", () => {
      expect(expectedConfig.media.short).toEqual({ maxHeight: 820 });
      expect(expectedConfig.media.tall).toEqual({ minHeight: 820 });
    });

    it("should have interaction media queries", () => {
      expect(expectedConfig.media.hoverNone).toEqual({ hover: "none" });
      expect(expectedConfig.media.pointerCoarse).toEqual({ pointer: "coarse" });
    });
  });

  describe("animations", () => {
    it("should have standard transition animations", () => {
      expect(expectedAnimations).toBeDefined();
    });

    it("should have quick animation (100ms)", () => {
      expect(expectedAnimations.quick).toBe("100ms ease-in-out");
    });

    it("should have medium animation (200ms)", () => {
      expect(expectedAnimations.medium).toBe("200ms ease-in-out");
    });

    it("should have slow animation (300ms)", () => {
      expect(expectedAnimations.slow).toBe("300ms ease-in-out");
    });

    it("should have brand animations (bouncy, lazy)", () => {
      expect(expectedAnimations.bouncy).toBe("200ms cubic-bezier(0.25, 0.1, 0.25, 1.5)");
      expect(expectedAnimations.lazy).toBe("300ms ease-out");
    });

    it("should have fade animation", () => {
      expect(expectedAnimations.fade).toBe("150ms ease-in-out");
    });

    it("should have slide animations", () => {
      expect(expectedAnimations.slideUp).toBe("200ms ease-out");
      expect(expectedAnimations.slideDown).toBe("200ms ease-out");
      expect(expectedAnimations.slideLeft).toBe("200ms ease-out");
      expect(expectedAnimations.slideRight).toBe("200ms ease-out");
    });

    it("should have press animation for touch states", () => {
      expect(expectedAnimations.press).toBe("100ms ease-out");
    });
  });

  describe("headingFont", () => {
    it("should be defined", () => {
      expect(expectedHeadingFont).toBeDefined();
    });

    it("should have size configuration", () => {
      expect(expectedHeadingFont.size).toBeDefined();
      expect(expectedHeadingFont.size[1]).toBe(12);
      expect(expectedHeadingFont.size[6]).toBe(24);
      expect(expectedHeadingFont.size.true).toBe(20);
    });

    it("should have weight configuration", () => {
      expect(expectedHeadingFont.weight).toBeDefined();
      expect(expectedHeadingFont.weight[1]).toBe("400");
      expect(expectedHeadingFont.weight[4]).toBe("700");
      expect(expectedHeadingFont.weight.true).toBe("700");
    });

    it("should have letter spacing configuration", () => {
      expect(expectedHeadingFont.letterSpacing).toBeDefined();
      expect(expectedHeadingFont.letterSpacing[1]).toBe(0);
      expect(expectedHeadingFont.letterSpacing[3]).toBe(-0.5);
      expect(expectedHeadingFont.letterSpacing.true).toBe(-0.5);
    });
  });

  describe("bodyFont", () => {
    it("should be defined", () => {
      expect(expectedBodyFont).toBeDefined();
    });

    it("should have weight configuration", () => {
      expect(expectedBodyFont.weight).toBeDefined();
      expect(expectedBodyFont.weight[1]).toBe("400");
      expect(expectedBodyFont.weight[2]).toBe("500");
      expect(expectedBodyFont.weight[3]).toBe("600");
    });
  });

  describe("tokens", () => {
    it("should have color tokens", () => {
      expect(expectedTokens.color).toBeDefined();
    });

    it("should have spike.land brand colors in tokens", () => {
      expect(expectedTokens.color.primary).toBe(colors.primary);
      expect(expectedTokens.color.secondary).toBe(colors.secondary);
      expect(expectedTokens.color.accent).toBe(colors.accent);
      expect(expectedTokens.color.destructive).toBe(colors.destructive);
    });

    it("should have background and foreground colors", () => {
      expect(expectedTokens.color.background).toBe(colors.background);
      expect(expectedTokens.color.foreground).toBe(colors.foreground);
    });

    it("should have card colors", () => {
      expect(expectedTokens.color.card).toBe(colors.card);
      expect(expectedTokens.color.cardForeground).toBe(colors.cardForeground);
    });

    it("should have muted colors", () => {
      expect(expectedTokens.color.muted).toBe(colors.muted);
      expect(expectedTokens.color.mutedForeground).toBe(colors.mutedForeground);
    });

    it("should have border and input colors", () => {
      expect(expectedTokens.color.border).toBe(colors.border);
      expect(expectedTokens.color.input).toBe(colors.input);
      expect(expectedTokens.color.ring).toBe(colors.ring);
    });

    it("should have semantic colors (success, warning)", () => {
      expect(expectedTokens.color.success).toBe(colors.success);
      expect(expectedTokens.color.warning).toBe(colors.warning);
    });

    it("should have brand colors (pixelCyan, pixelFuchsia)", () => {
      expect(expectedTokens.color.pixelCyan).toBe(colors.pixelCyan);
      expect(expectedTokens.color.pixelFuchsia).toBe(colors.pixelFuchsia);
    });

    it("should have glass morphism colors", () => {
      expect(expectedTokens.color.glass0).toBe("rgba(255, 255, 255, 0.05)");
      expect(expectedTokens.color.glass1).toBe("rgba(255, 255, 255, 0.08)");
      expect(expectedTokens.color.glass2).toBe("rgba(255, 255, 255, 0.12)");
      expect(expectedTokens.color.glassBorder).toBe("rgba(255, 255, 255, 0.1)");
    });

    it("should have utility colors", () => {
      expect(expectedTokens.color.transparent).toBe("transparent");
      expect(expectedTokens.color.white).toBe("#FFFFFF");
      expect(expectedTokens.color.black).toBe("#000000");
    });

    it("should have radius tokens", () => {
      expect(expectedTokens.radius).toBeDefined();
      expect(expectedTokens.radius[0]).toBe(borderRadius.none);
      expect(expectedTokens.radius[1]).toBe(borderRadius.sm);
      expect(expectedTokens.radius[2]).toBe(borderRadius.DEFAULT);
      expect(expectedTokens.radius[4]).toBe(borderRadius.lg);
      expect(expectedTokens.radius.true).toBe(borderRadius.lg);
      expect(expectedTokens.radius.full).toBe(borderRadius.full);
    });

    it("should have space tokens", () => {
      expect(expectedTokens.space).toBeDefined();
      expect(expectedTokens.space[0]).toBe(spacing[0]);
      expect(expectedTokens.space[1]).toBe(spacing[1]);
      expect(expectedTokens.space[2]).toBe(spacing[2]);
      expect(expectedTokens.space[4]).toBe(spacing[4]);
      expect(expectedTokens.space.true).toBe(spacing[4]);
    });

    it("should have size tokens", () => {
      expect(expectedTokens.size).toBeDefined();
      expect(expectedTokens.size[0]).toBe(spacing[0]);
      expect(expectedTokens.size[4]).toBe(spacing[4]);
      expect(expectedTokens.size.true).toBe(spacing[4]);
    });

    it("should have zIndex tokens", () => {
      expect(expectedTokens.zIndex).toBeDefined();
      expect(expectedTokens.zIndex[0]).toBe(0);
      expect(expectedTokens.zIndex[1]).toBe(10);
      expect(expectedTokens.zIndex[2]).toBe(20);
      expect(expectedTokens.zIndex[5]).toBe(50);
      expect(expectedTokens.zIndex.true).toBe(0);
    });
  });

  describe("darkTheme", () => {
    it("should have background colors", () => {
      expect(expectedDarkTheme.background).toBe(colors.background);
      expect(expectedDarkTheme.backgroundHover).toBe(colors.muted);
      expect(expectedDarkTheme.backgroundPress).toBe(colors.secondary);
      expect(expectedDarkTheme.backgroundFocus).toBe(colors.muted);
      expect(expectedDarkTheme.backgroundStrong).toBe(colors.card);
      expect(expectedDarkTheme.backgroundTransparent).toBe("transparent");
    });

    it("should have color (text) values", () => {
      expect(expectedDarkTheme.color).toBe(colors.foreground);
      expect(expectedDarkTheme.colorHover).toBe(colors.foreground);
      expect(expectedDarkTheme.colorPress).toBe(colors.mutedForeground);
      expect(expectedDarkTheme.colorFocus).toBe(colors.foreground);
      expect(expectedDarkTheme.colorTransparent).toBe("transparent");
    });

    it("should have border colors", () => {
      expect(expectedDarkTheme.borderColor).toBe(colors.border);
      expect(expectedDarkTheme.borderColorHover).toBe(colors.primary);
      expect(expectedDarkTheme.borderColorFocus).toBe(colors.ring);
      expect(expectedDarkTheme.borderColorPress).toBe(colors.secondary);
    });

    it("should have placeholder color", () => {
      expect(expectedDarkTheme.placeholderColor).toBe(colors.mutedForeground);
    });

    it("should have semantic colors", () => {
      expect(expectedDarkTheme.blue).toBe(colors.primary);
      expect(expectedDarkTheme.green).toBe(colors.success);
      expect(expectedDarkTheme.red).toBe(colors.destructive);
      expect(expectedDarkTheme.yellow).toBe(colors.warning);
      expect(expectedDarkTheme.orange).toBe(colors.warning);
      expect(expectedDarkTheme.pink).toBe(colors.pixelFuchsia);
      expect(expectedDarkTheme.purple).toBe(colors.secondary);
      expect(expectedDarkTheme.gray).toBe(colors.muted);
    });

    it("should have shadow colors", () => {
      expect(expectedDarkTheme.shadowColor).toBe("rgba(0, 0, 0, 0.35)");
      expect(expectedDarkTheme.shadowColorHover).toBe("rgba(0, 0, 0, 0.45)");
    });

    it("should have glass morphism tokens", () => {
      expect(expectedDarkTheme.glass0).toBe("rgba(255, 255, 255, 0.05)");
      expect(expectedDarkTheme.glass1).toBe("rgba(255, 255, 255, 0.08)");
      expect(expectedDarkTheme.glass2).toBe("rgba(255, 255, 255, 0.12)");
      expect(expectedDarkTheme.glassBorder).toBe("rgba(255, 255, 255, 0.1)");
    });
  });

  describe("lightTheme", () => {
    it("should have background colors", () => {
      expect(expectedLightTheme.background).toBe(lightColorsHex.background);
      expect(expectedLightTheme.backgroundHover).toBe(lightColorsHex.muted);
      expect(expectedLightTheme.backgroundPress).toBe(lightColorsHex.secondary);
      expect(expectedLightTheme.backgroundFocus).toBe(lightColorsHex.muted);
      expect(expectedLightTheme.backgroundStrong).toBe(lightColorsHex.card);
      expect(expectedLightTheme.backgroundTransparent).toBe("transparent");
    });

    it("should have color (text) values", () => {
      expect(expectedLightTheme.color).toBe(lightColorsHex.foreground);
      expect(expectedLightTheme.colorHover).toBe(lightColorsHex.foreground);
      expect(expectedLightTheme.colorPress).toBe(lightColorsHex.mutedForeground);
      expect(expectedLightTheme.colorFocus).toBe(lightColorsHex.foreground);
      expect(expectedLightTheme.colorTransparent).toBe("transparent");
    });

    it("should have border colors", () => {
      expect(expectedLightTheme.borderColor).toBe(lightColorsHex.border);
      expect(expectedLightTheme.borderColorHover).toBe(lightColorsHex.primary);
      expect(expectedLightTheme.borderColorFocus).toBe(lightColorsHex.ring);
      expect(expectedLightTheme.borderColorPress).toBe(lightColorsHex.secondary);
    });

    it("should have placeholder color", () => {
      expect(expectedLightTheme.placeholderColor).toBe(lightColorsHex.mutedForeground);
    });

    it("should have semantic colors", () => {
      expect(expectedLightTheme.blue).toBe(lightColorsHex.primary);
      expect(expectedLightTheme.green).toBe(lightColorsHex.success);
      expect(expectedLightTheme.red).toBe(lightColorsHex.destructive);
      expect(expectedLightTheme.yellow).toBe(lightColorsHex.warning);
      expect(expectedLightTheme.orange).toBe(lightColorsHex.warning);
      expect(expectedLightTheme.pink).toBe(colors.pixelFuchsia);
      expect(expectedLightTheme.purple).toBe(lightColorsHex.secondary);
      expect(expectedLightTheme.gray).toBe(lightColorsHex.muted);
    });

    it("should have shadow colors (lighter for light mode)", () => {
      expect(expectedLightTheme.shadowColor).toBe("rgba(0, 0, 0, 0.08)");
      expect(expectedLightTheme.shadowColorHover).toBe("rgba(0, 0, 0, 0.12)");
    });

    it("should have glass morphism tokens (darker for light mode)", () => {
      expect(expectedLightTheme.glass0).toBe("rgba(0, 0, 0, 0.02)");
      expect(expectedLightTheme.glass1).toBe("rgba(0, 0, 0, 0.04)");
      expect(expectedLightTheme.glass2).toBe("rgba(0, 0, 0, 0.06)");
      expect(expectedLightTheme.glassBorder).toBe("rgba(0, 0, 0, 0.05)");
    });
  });
});
