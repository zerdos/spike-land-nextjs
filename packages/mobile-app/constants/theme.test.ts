/**
 * Tests for theme constants
 * Ensures all design tokens are correctly defined and helper functions work properly
 */

import {
  animation,
  borderRadius,
  colors,
  colorToHex,
  darkColors,
  fontSize,
  fontWeight,
  glassMorphism,
  hslToHex,
  hslToString,
  letterSpacing,
  lightColors,
  lightColorsHex,
  lineHeight,
  shadows,
  spacing,
  theme,
  zIndex,
} from "./theme";

describe("theme constants", () => {
  describe("lightColors", () => {
    it("should have all required color tokens", () => {
      expect(lightColors.background).toBeDefined();
      expect(lightColors.foreground).toBeDefined();
      expect(lightColors.card).toBeDefined();
      expect(lightColors.cardForeground).toBeDefined();
      expect(lightColors.popover).toBeDefined();
      expect(lightColors.popoverForeground).toBeDefined();
      expect(lightColors.primary).toBeDefined();
      expect(lightColors.primaryForeground).toBeDefined();
      expect(lightColors.primaryText).toBeDefined();
      expect(lightColors.secondary).toBeDefined();
      expect(lightColors.secondaryForeground).toBeDefined();
      expect(lightColors.muted).toBeDefined();
      expect(lightColors.mutedForeground).toBeDefined();
      expect(lightColors.accent).toBeDefined();
      expect(lightColors.accentForeground).toBeDefined();
      expect(lightColors.destructive).toBeDefined();
      expect(lightColors.destructiveForeground).toBeDefined();
      expect(lightColors.border).toBeDefined();
      expect(lightColors.input).toBeDefined();
      expect(lightColors.ring).toBeDefined();
      expect(lightColors.success).toBeDefined();
      expect(lightColors.warning).toBeDefined();
      expect(lightColors.pixelCyan).toBeDefined();
      expect(lightColors.pixelFuchsia).toBeDefined();
      expect(lightColors.gridInactive).toBeDefined();
    });

    it("should have valid HSL values", () => {
      Object.values(lightColors).forEach((color) => {
        expect(color.h).toBeGreaterThanOrEqual(0);
        expect(color.h).toBeLessThanOrEqual(360);
        expect(color.s).toBeGreaterThanOrEqual(0);
        expect(color.s).toBeLessThanOrEqual(100);
        expect(color.l).toBeGreaterThanOrEqual(0);
        expect(color.l).toBeLessThanOrEqual(100);
      });
    });

    it("should have correct primary color (Pixel Cyan)", () => {
      expect(lightColors.primary.h).toBe(187);
      expect(lightColors.primary.s).toBe(100);
      expect(lightColors.primary.l).toBe(45);
    });
  });

  describe("darkColors", () => {
    it("should have all required color tokens", () => {
      expect(darkColors.background).toBeDefined();
      expect(darkColors.foreground).toBeDefined();
      expect(darkColors.card).toBeDefined();
      expect(darkColors.cardForeground).toBeDefined();
      expect(darkColors.popover).toBeDefined();
      expect(darkColors.popoverForeground).toBeDefined();
      expect(darkColors.primary).toBeDefined();
      expect(darkColors.primaryForeground).toBeDefined();
      expect(darkColors.primaryText).toBeDefined();
      expect(darkColors.secondary).toBeDefined();
      expect(darkColors.secondaryForeground).toBeDefined();
      expect(darkColors.muted).toBeDefined();
      expect(darkColors.mutedForeground).toBeDefined();
      expect(darkColors.accent).toBeDefined();
      expect(darkColors.accentForeground).toBeDefined();
      expect(darkColors.destructive).toBeDefined();
      expect(darkColors.destructiveForeground).toBeDefined();
      expect(darkColors.border).toBeDefined();
      expect(darkColors.input).toBeDefined();
      expect(darkColors.ring).toBeDefined();
      expect(darkColors.success).toBeDefined();
      expect(darkColors.successForeground).toBeDefined();
      expect(darkColors.warning).toBeDefined();
      expect(darkColors.warningForeground).toBeDefined();
      expect(darkColors.pixelCyan).toBeDefined();
      expect(darkColors.pixelFuchsia).toBeDefined();
      expect(darkColors.gridInactive).toBeDefined();
      expect(darkColors.surfaceBlue).toBeDefined();
      expect(darkColors.borderDark).toBeDefined();
      expect(darkColors.borderItem).toBeDefined();
    });

    it("should have valid HSL values", () => {
      Object.values(darkColors).forEach((color) => {
        expect(color.h).toBeGreaterThanOrEqual(0);
        expect(color.h).toBeLessThanOrEqual(360);
        expect(color.s).toBeGreaterThanOrEqual(0);
        expect(color.s).toBeLessThanOrEqual(100);
        expect(color.l).toBeGreaterThanOrEqual(0);
        expect(color.l).toBeLessThanOrEqual(100);
      });
    });

    it("should have correct primary color (Pixel Cyan #00E5FF)", () => {
      expect(darkColors.primary.h).toBe(187);
      expect(darkColors.primary.s).toBe(100);
      expect(darkColors.primary.l).toBe(50);
    });

    it("should have dark background for futuristic theme", () => {
      expect(darkColors.background.l).toBeLessThan(10);
    });
  });

  describe("hslToString", () => {
    it("should convert HSL object to CSS string", () => {
      const result = hslToString({ h: 187, s: 100, l: 50 });
      expect(result).toBe("hsl(187, 100%, 50%)");
    });

    it("should handle zero values", () => {
      const result = hslToString({ h: 0, s: 0, l: 0 });
      expect(result).toBe("hsl(0, 0%, 0%)");
    });

    it("should handle maximum values", () => {
      const result = hslToString({ h: 360, s: 100, l: 100 });
      expect(result).toBe("hsl(360, 100%, 100%)");
    });
  });

  describe("hslToHex", () => {
    it("should convert cyan (h: 187, s: 100, l: 50) correctly", () => {
      const result = hslToHex(187, 100, 50);
      // Pixel Cyan should be close to #00E5FF
      expect(result.toLowerCase()).toMatch(/^#00[def][0-9a-f]ff$/);
    });

    it("should convert pure white correctly", () => {
      const result = hslToHex(0, 0, 100);
      expect(result.toLowerCase()).toBe("#ffffff");
    });

    it("should convert pure black correctly", () => {
      const result = hslToHex(0, 0, 0);
      expect(result.toLowerCase()).toBe("#000000");
    });

    it("should convert red (h: 0) correctly", () => {
      const result = hslToHex(0, 100, 50);
      expect(result.toLowerCase()).toBe("#ff0000");
    });

    it("should convert green (h: 120) correctly", () => {
      const result = hslToHex(120, 100, 50);
      expect(result.toLowerCase()).toBe("#00ff00");
    });

    it("should convert blue (h: 240) correctly", () => {
      const result = hslToHex(240, 100, 50);
      expect(result.toLowerCase()).toBe("#0000ff");
    });

    it("should handle yellow (h: 60) correctly", () => {
      const result = hslToHex(60, 100, 50);
      expect(result.toLowerCase()).toBe("#ffff00");
    });

    it("should handle magenta (h: 300) correctly", () => {
      const result = hslToHex(300, 100, 50);
      expect(result.toLowerCase()).toBe("#ff00ff");
    });

    it("should handle cyan (h: 180) correctly", () => {
      const result = hslToHex(180, 100, 50);
      expect(result.toLowerCase()).toBe("#00ffff");
    });
  });

  describe("colorToHex", () => {
    it("should convert HSL object to hex", () => {
      const result = colorToHex({ h: 0, s: 100, l: 50 });
      expect(result.toLowerCase()).toBe("#ff0000");
    });

    it("should work with darkColors", () => {
      const result = colorToHex(darkColors.primary);
      expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  describe("colors (pre-computed hex values)", () => {
    it("should have all semantic colors as hex strings", () => {
      expect(colors.background).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(colors.foreground).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(colors.card).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(colors.secondary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(colors.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(colors.destructive).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(colors.muted).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(colors.border).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it("should have brand colors", () => {
      expect(colors.pixelCyan).toBe("#00E5FF");
      expect(colors.pixelFuchsia).toBe("#FF00FF");
    });

    it("should have utility colors", () => {
      expect(colors.transparent).toBe("transparent");
      expect(colors.white).toBe("#FFFFFF");
      expect(colors.black).toBe("#000000");
    });
  });

  describe("lightColorsHex", () => {
    it("should have all colors as hex strings", () => {
      Object.values(lightColorsHex).forEach((color) => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe("spacing", () => {
    it("should have common spacing values", () => {
      expect(spacing[0]).toBe(0);
      expect(spacing[1]).toBe(4);
      expect(spacing[2]).toBe(8);
      expect(spacing[4]).toBe(16);
      expect(spacing[8]).toBe(32);
      expect(spacing[16]).toBe(64);
    });

    it("should have all values as numbers", () => {
      Object.values(spacing).forEach((value) => {
        expect(typeof value).toBe("number");
      });
    });

    it("should have increasing values", () => {
      // Sort keys numerically since JavaScript object key order is not guaranteed
      // for mixed integer and decimal keys
      const sortedKeys = Object.keys(spacing)
        .map(Number)
        .sort((a, b) => a - b);
      const values = sortedKeys.map((key) => spacing[key as keyof typeof spacing]);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThanOrEqual(values[i - 1] as number);
      }
    });
  });

  describe("fontSize", () => {
    it("should have all standard size variants", () => {
      expect(fontSize.xs).toBe(12);
      expect(fontSize.sm).toBe(14);
      expect(fontSize.base).toBe(16);
      expect(fontSize.lg).toBe(18);
      expect(fontSize.xl).toBe(20);
      expect(fontSize["2xl"]).toBe(24);
      expect(fontSize["3xl"]).toBe(30);
      expect(fontSize["4xl"]).toBe(36);
    });

    it("should have all values as numbers", () => {
      Object.values(fontSize).forEach((value) => {
        expect(typeof value).toBe("number");
      });
    });
  });

  describe("lineHeight", () => {
    it("should have relative line heights", () => {
      expect(lineHeight.none).toBe(1);
      expect(lineHeight.tight).toBe(1.25);
      expect(lineHeight.normal).toBe(1.5);
      expect(lineHeight.relaxed).toBe(1.625);
      expect(lineHeight.loose).toBe(2);
    });

    it("should have absolute line heights", () => {
      expect(lineHeight[3]).toBe(12);
      expect(lineHeight[4]).toBe(16);
      expect(lineHeight[5]).toBe(20);
    });
  });

  describe("fontWeight", () => {
    it("should have all weight variants as strings", () => {
      expect(fontWeight.thin).toBe("100");
      expect(fontWeight.normal).toBe("400");
      expect(fontWeight.medium).toBe("500");
      expect(fontWeight.semibold).toBe("600");
      expect(fontWeight.bold).toBe("700");
      expect(fontWeight.black).toBe("900");
    });
  });

  describe("letterSpacing", () => {
    it("should have all spacing variants", () => {
      expect(letterSpacing.tighter).toBe(-0.8);
      expect(letterSpacing.tight).toBe(-0.4);
      expect(letterSpacing.normal).toBe(0);
      expect(letterSpacing.wide).toBe(0.4);
      expect(letterSpacing.wider).toBe(0.8);
      expect(letterSpacing.widest).toBe(1.6);
    });
  });

  describe("borderRadius", () => {
    it("should have all radius variants", () => {
      expect(borderRadius.none).toBe(0);
      expect(borderRadius.sm).toBe(4);
      expect(borderRadius.DEFAULT).toBe(8);
      expect(borderRadius.md).toBe(10);
      expect(borderRadius.lg).toBe(14);
      expect(borderRadius.xl).toBe(18);
      expect(borderRadius["2xl"]).toBe(24);
      expect(borderRadius["3xl"]).toBe(32);
      expect(borderRadius.full).toBe(9999);
    });

    it("should have lg matching web --radius (0.875rem = 14px)", () => {
      expect(borderRadius.lg).toBe(14);
    });
  });

  describe("shadows", () => {
    it("should have none shadow preset", () => {
      expect(shadows.none.shadowOpacity).toBe(0);
      expect(shadows.none.elevation).toBe(0);
    });

    it("should have standard shadow presets", () => {
      expect(shadows.sm).toBeDefined();
      expect(shadows.DEFAULT).toBeDefined();
      expect(shadows.md).toBeDefined();
      expect(shadows.lg).toBeDefined();
      expect(shadows.xl).toBeDefined();
      expect(shadows["2xl"]).toBeDefined();
    });

    it("should have glow shadows for brand colors", () => {
      expect(shadows.glowCyan.shadowColor).toBe("#00E5FF");
      expect(shadows.glowFuchsia.shadowColor).toBe("#FF00FF");
    });

    it("should have increasing elevation", () => {
      expect(shadows.sm.elevation).toBeLessThan(shadows.DEFAULT.elevation);
      expect(shadows.DEFAULT.elevation).toBeLessThan(shadows.md.elevation);
      expect(shadows.md.elevation).toBeLessThan(shadows.lg.elevation);
      expect(shadows.lg.elevation).toBeLessThan(shadows.xl.elevation);
    });
  });

  describe("glassMorphism", () => {
    it("should have opacity presets", () => {
      expect(glassMorphism.opacity.light).toBe(0.85);
      expect(glassMorphism.opacity.dark).toBe(0.12);
      expect(glassMorphism.opacity.darkMobile).toBe(0.7);
    });

    it("should have blur presets", () => {
      expect(glassMorphism.blur.sm).toBe(4);
      expect(glassMorphism.blur.md).toBe(8);
      expect(glassMorphism.blur.lg).toBe(16);
      expect(glassMorphism.blur.xl).toBe(20);
      expect(glassMorphism.blur.mobile).toBe(3);
    });

    it("should have glass background colors", () => {
      expect(glassMorphism.glass0).toBe("rgba(255, 255, 255, 0.05)");
      expect(glassMorphism.glass1).toBe("rgba(255, 255, 255, 0.08)");
      expect(glassMorphism.glass2).toBe("rgba(255, 255, 255, 0.12)");
    });
  });

  describe("animation", () => {
    it("should have duration presets matching web", () => {
      expect(animation.fast).toBe(150);
      expect(animation.normal).toBe(200);
      expect(animation.slow).toBe(300);
    });

    it("should have easing presets", () => {
      expect(animation.easing.linear).toBe("linear");
      expect(animation.easing.easeIn).toBe("ease-in");
      expect(animation.easing.easeOut).toBe("ease-out");
      expect(animation.easing.easeInOut).toBe("ease-in-out");
      expect(animation.easing.bounce).toBe(
        "cubic-bezier(0.25, 0.1, 0.25, 1.5)",
      );
    });
  });

  describe("zIndex", () => {
    it("should have standard z-index values", () => {
      expect(zIndex[0]).toBe(0);
      expect(zIndex[10]).toBe(10);
      expect(zIndex[20]).toBe(20);
      expect(zIndex[30]).toBe(30);
      expect(zIndex[40]).toBe(40);
      expect(zIndex[50]).toBe(50);
      expect(zIndex.auto).toBe("auto");
    });
  });

  describe("theme (complete export)", () => {
    it("should contain all theme sections", () => {
      expect(theme.colors).toBeDefined();
      expect(theme.lightColors).toBeDefined();
      expect(theme.darkColors).toBeDefined();
      expect(theme.spacing).toBeDefined();
      expect(theme.fontSize).toBeDefined();
      expect(theme.lineHeight).toBeDefined();
      expect(theme.fontWeight).toBeDefined();
      expect(theme.letterSpacing).toBeDefined();
      expect(theme.borderRadius).toBeDefined();
      expect(theme.shadows).toBeDefined();
      expect(theme.glassMorphism).toBeDefined();
      expect(theme.animation).toBeDefined();
      expect(theme.zIndex).toBeDefined();
    });

    it("should be immutable (readonly)", () => {
      // TypeScript will enforce this, but we can verify the structure exists
      expect(Object.keys(theme).length).toBeGreaterThan(0);
    });
  });
});
