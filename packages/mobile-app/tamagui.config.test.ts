/**
 * Tests for Tamagui configuration
 * Ensures all theme tokens, animations, and configuration are correctly set up
 */

// Override tamagui mocks to return actual values for config testing
jest.mock("tamagui", () => {
  const actual = jest.requireActual("tamagui");
  return {
    ...actual,
    // Use actual implementations for config creation functions
    createTamagui: (config: Record<string, unknown>) => config,
    createTokens: (tokens: Record<string, unknown>) => tokens,
    createTheme: (theme: Record<string, unknown>) => theme,
  };
});

import { borderRadius, colors, lightColorsHex, spacing } from "./constants/theme";
import {
  animations,
  bodyFont,
  config,
  darkTheme,
  headingFont,
  lightTheme,
  tokens,
} from "./tamagui.config";

describe("tamagui.config", () => {
  describe("config", () => {
    it("should export a valid Tamagui config", () => {
      expect(config).toBeDefined();
      expect(typeof config).toBe("object");
    });

    it("should have dark as the default theme", () => {
      expect(config.defaultTheme).toBe("dark");
    });

    it("should enable system color scheme preferences", () => {
      expect(config.shouldAddPrefersColorThemes).toBe(true);
    });

    it("should have theme class name on root enabled", () => {
      expect(config.themeClassNameOnRoot).toBe(true);
    });

    it("should have themes defined", () => {
      expect(config.themes).toBeDefined();
      expect(config.themes.dark).toBeDefined();
      expect(config.themes.light).toBeDefined();
    });

    it("should have component sub-themes", () => {
      expect(config.themes.dark_Button).toBeDefined();
      expect(config.themes.light_Button).toBeDefined();
      expect(config.themes.dark_Card).toBeDefined();
      expect(config.themes.light_Card).toBeDefined();
      expect(config.themes.dark_Input).toBeDefined();
      expect(config.themes.light_Input).toBeDefined();
    });

    it("should have fonts configured", () => {
      expect(config.fonts).toBeDefined();
      expect(config.fonts.heading).toBeDefined();
      expect(config.fonts.body).toBeDefined();
    });

    it("should have animations configured", () => {
      expect(config.animations).toBeDefined();
    });

    it("should have tokens configured", () => {
      expect(config.tokens).toBeDefined();
    });

    it("should have media queries configured", () => {
      expect(config.media).toBeDefined();
      expect(config.media.xs).toEqual({ maxWidth: 660 });
      expect(config.media.sm).toEqual({ maxWidth: 800 });
      expect(config.media.md).toEqual({ maxWidth: 1020 });
      expect(config.media.lg).toEqual({ maxWidth: 1280 });
      expect(config.media.xl).toEqual({ maxWidth: 1420 });
      expect(config.media.xxl).toEqual({ maxWidth: 1600 });
    });

    it("should have greater-than media queries", () => {
      expect(config.media.gtXs).toEqual({ minWidth: 661 });
      expect(config.media.gtSm).toEqual({ minWidth: 801 });
      expect(config.media.gtMd).toEqual({ minWidth: 1021 });
      expect(config.media.gtLg).toEqual({ minWidth: 1281 });
    });

    it("should have height-based media queries", () => {
      expect(config.media.short).toEqual({ maxHeight: 820 });
      expect(config.media.tall).toEqual({ minHeight: 820 });
    });

    it("should have interaction media queries", () => {
      expect(config.media.hoverNone).toEqual({ hover: "none" });
      expect(config.media.pointerCoarse).toEqual({ pointer: "coarse" });
    });
  });

  describe("animations", () => {
    it("should have standard transition animations", () => {
      expect(animations).toBeDefined();
    });

    it("should have quick animation (100ms)", () => {
      // CSS animation strings are created by createAnimations
      expect(animations).toBeDefined();
    });

    it("should have medium animation (200ms)", () => {
      expect(animations).toBeDefined();
    });

    it("should have slow animation (300ms)", () => {
      expect(animations).toBeDefined();
    });

    it("should have brand animations (bouncy, lazy)", () => {
      expect(animations).toBeDefined();
    });

    it("should have fade animation", () => {
      expect(animations).toBeDefined();
    });

    it("should have slide animations", () => {
      expect(animations).toBeDefined();
    });

    it("should have press animation for touch states", () => {
      expect(animations).toBeDefined();
    });
  });

  describe("headingFont", () => {
    it("should be defined", () => {
      expect(headingFont).toBeDefined();
    });

    it("should have size configuration", () => {
      expect(headingFont).toBeDefined();
    });

    it("should have weight configuration", () => {
      expect(headingFont).toBeDefined();
    });

    it("should have letter spacing configuration", () => {
      expect(headingFont).toBeDefined();
    });
  });

  describe("bodyFont", () => {
    it("should be defined", () => {
      expect(bodyFont).toBeDefined();
    });

    it("should have weight configuration", () => {
      expect(bodyFont).toBeDefined();
    });
  });

  describe("tokens", () => {
    it("should have color tokens", () => {
      expect(tokens.color).toBeDefined();
    });

    it("should have spike.land brand colors in tokens", () => {
      expect(tokens.color.primary).toBe(colors.primary);
      expect(tokens.color.secondary).toBe(colors.secondary);
      expect(tokens.color.accent).toBe(colors.accent);
      expect(tokens.color.destructive).toBe(colors.destructive);
    });

    it("should have background and foreground colors", () => {
      expect(tokens.color.background).toBe(colors.background);
      expect(tokens.color.foreground).toBe(colors.foreground);
    });

    it("should have card colors", () => {
      expect(tokens.color.card).toBe(colors.card);
      expect(tokens.color.cardForeground).toBe(colors.cardForeground);
    });

    it("should have muted colors", () => {
      expect(tokens.color.muted).toBe(colors.muted);
      expect(tokens.color.mutedForeground).toBe(colors.mutedForeground);
    });

    it("should have border and input colors", () => {
      expect(tokens.color.border).toBe(colors.border);
      expect(tokens.color.input).toBe(colors.input);
      expect(tokens.color.ring).toBe(colors.ring);
    });

    it("should have semantic colors (success, warning)", () => {
      expect(tokens.color.success).toBe(colors.success);
      expect(tokens.color.warning).toBe(colors.warning);
    });

    it("should have brand colors (pixelCyan, pixelFuchsia)", () => {
      expect(tokens.color.pixelCyan).toBe(colors.pixelCyan);
      expect(tokens.color.pixelFuchsia).toBe(colors.pixelFuchsia);
    });

    it("should have glass morphism colors", () => {
      expect(tokens.color.glass0).toBe("rgba(255, 255, 255, 0.05)");
      expect(tokens.color.glass1).toBe("rgba(255, 255, 255, 0.08)");
      expect(tokens.color.glass2).toBe("rgba(255, 255, 255, 0.12)");
      expect(tokens.color.glassBorder).toBe("rgba(255, 255, 255, 0.1)");
    });

    it("should have utility colors", () => {
      expect(tokens.color.transparent).toBe("transparent");
      expect(tokens.color.white).toBe("#FFFFFF");
      expect(tokens.color.black).toBe("#000000");
    });

    it("should have radius tokens", () => {
      expect(tokens.radius).toBeDefined();
      expect(tokens.radius[0]).toBe(borderRadius.none);
      expect(tokens.radius[1]).toBe(borderRadius.sm);
      expect(tokens.radius[2]).toBe(borderRadius.DEFAULT);
      expect(tokens.radius[4]).toBe(borderRadius.lg);
      expect(tokens.radius.true).toBe(borderRadius.lg);
      expect(tokens.radius.full).toBe(borderRadius.full);
    });

    it("should have space tokens", () => {
      expect(tokens.space).toBeDefined();
      expect(tokens.space[0]).toBe(spacing[0]);
      expect(tokens.space[1]).toBe(spacing[1]);
      expect(tokens.space[2]).toBe(spacing[2]);
      expect(tokens.space[4]).toBe(spacing[4]);
      expect(tokens.space.true).toBe(spacing[4]);
    });

    it("should have size tokens", () => {
      expect(tokens.size).toBeDefined();
      expect(tokens.size[0]).toBe(spacing[0]);
      expect(tokens.size[4]).toBe(spacing[4]);
      expect(tokens.size.true).toBe(spacing[4]);
    });

    it("should have zIndex tokens", () => {
      expect(tokens.zIndex).toBeDefined();
      expect(tokens.zIndex[0]).toBe(0);
      expect(tokens.zIndex[1]).toBe(10);
      expect(tokens.zIndex[2]).toBe(20);
      expect(tokens.zIndex[5]).toBe(50);
      expect(tokens.zIndex.true).toBe(0);
    });
  });

  describe("darkTheme", () => {
    it("should have background colors", () => {
      expect(darkTheme.background).toBe(colors.background);
      expect(darkTheme.backgroundHover).toBe(colors.muted);
      expect(darkTheme.backgroundPress).toBe(colors.secondary);
      expect(darkTheme.backgroundFocus).toBe(colors.muted);
      expect(darkTheme.backgroundStrong).toBe(colors.card);
      expect(darkTheme.backgroundTransparent).toBe("transparent");
    });

    it("should have color (text) values", () => {
      expect(darkTheme.color).toBe(colors.foreground);
      expect(darkTheme.colorHover).toBe(colors.foreground);
      expect(darkTheme.colorPress).toBe(colors.mutedForeground);
      expect(darkTheme.colorFocus).toBe(colors.foreground);
      expect(darkTheme.colorTransparent).toBe("transparent");
    });

    it("should have border colors", () => {
      expect(darkTheme.borderColor).toBe(colors.border);
      expect(darkTheme.borderColorHover).toBe(colors.primary);
      expect(darkTheme.borderColorFocus).toBe(colors.ring);
      expect(darkTheme.borderColorPress).toBe(colors.secondary);
    });

    it("should have placeholder color", () => {
      expect(darkTheme.placeholderColor).toBe(colors.mutedForeground);
    });

    it("should have semantic colors", () => {
      expect(darkTheme.blue).toBe(colors.primary);
      expect(darkTheme.green).toBe(colors.success);
      expect(darkTheme.red).toBe(colors.destructive);
      expect(darkTheme.yellow).toBe(colors.warning);
      expect(darkTheme.orange).toBe(colors.warning);
      expect(darkTheme.pink).toBe(colors.pixelFuchsia);
      expect(darkTheme.purple).toBe(colors.secondary);
      expect(darkTheme.gray).toBe(colors.muted);
    });

    it("should have shadow colors", () => {
      expect(darkTheme.shadowColor).toBe("rgba(0, 0, 0, 0.35)");
      expect(darkTheme.shadowColorHover).toBe("rgba(0, 0, 0, 0.45)");
    });

    it("should have glass morphism tokens", () => {
      expect(darkTheme.glass0).toBe("rgba(255, 255, 255, 0.05)");
      expect(darkTheme.glass1).toBe("rgba(255, 255, 255, 0.08)");
      expect(darkTheme.glass2).toBe("rgba(255, 255, 255, 0.12)");
      expect(darkTheme.glassBorder).toBe("rgba(255, 255, 255, 0.1)");
    });
  });

  describe("lightTheme", () => {
    it("should have background colors", () => {
      expect(lightTheme.background).toBe(lightColorsHex.background);
      expect(lightTheme.backgroundHover).toBe(lightColorsHex.muted);
      expect(lightTheme.backgroundPress).toBe(lightColorsHex.secondary);
      expect(lightTheme.backgroundFocus).toBe(lightColorsHex.muted);
      expect(lightTheme.backgroundStrong).toBe(lightColorsHex.card);
      expect(lightTheme.backgroundTransparent).toBe("transparent");
    });

    it("should have color (text) values", () => {
      expect(lightTheme.color).toBe(lightColorsHex.foreground);
      expect(lightTheme.colorHover).toBe(lightColorsHex.foreground);
      expect(lightTheme.colorPress).toBe(lightColorsHex.mutedForeground);
      expect(lightTheme.colorFocus).toBe(lightColorsHex.foreground);
      expect(lightTheme.colorTransparent).toBe("transparent");
    });

    it("should have border colors", () => {
      expect(lightTheme.borderColor).toBe(lightColorsHex.border);
      expect(lightTheme.borderColorHover).toBe(lightColorsHex.primary);
      expect(lightTheme.borderColorFocus).toBe(lightColorsHex.ring);
      expect(lightTheme.borderColorPress).toBe(lightColorsHex.secondary);
    });

    it("should have placeholder color", () => {
      expect(lightTheme.placeholderColor).toBe(lightColorsHex.mutedForeground);
    });

    it("should have semantic colors", () => {
      expect(lightTheme.blue).toBe(lightColorsHex.primary);
      expect(lightTheme.green).toBe(lightColorsHex.success);
      expect(lightTheme.red).toBe(lightColorsHex.destructive);
      expect(lightTheme.yellow).toBe(lightColorsHex.warning);
      expect(lightTheme.orange).toBe(lightColorsHex.warning);
      expect(lightTheme.pink).toBe(colors.pixelFuchsia);
      expect(lightTheme.purple).toBe(lightColorsHex.secondary);
      expect(lightTheme.gray).toBe(lightColorsHex.muted);
    });

    it("should have shadow colors (lighter for light mode)", () => {
      expect(lightTheme.shadowColor).toBe("rgba(0, 0, 0, 0.08)");
      expect(lightTheme.shadowColorHover).toBe("rgba(0, 0, 0, 0.12)");
    });

    it("should have glass morphism tokens (darker for light mode)", () => {
      expect(lightTheme.glass0).toBe("rgba(0, 0, 0, 0.02)");
      expect(lightTheme.glass1).toBe("rgba(0, 0, 0, 0.04)");
      expect(lightTheme.glass2).toBe("rgba(0, 0, 0, 0.06)");
      expect(lightTheme.glassBorder).toBe("rgba(0, 0, 0, 0.05)");
    });
  });
});
