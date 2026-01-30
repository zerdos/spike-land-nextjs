/**
 * Theme Builder Tests
 *
 * Unit tests for CSS theme generation from white-label config.
 */

import type { WorkspaceWhiteLabelConfig } from "@/generated/prisma";
import { describe, expect, it } from "vitest";
import {
  buildRuntimeThemeConfig,
  buildTailwindColors,
  buildThemeCss,
  buildThemeCssWithAlpha,
  getThemeCacheKey,
  hexToRgb,
  isValidHexColor,
} from "./theme-builder";

// Mock config factory
function createMockConfig(
  overrides: Partial<WorkspaceWhiteLabelConfig> = {},
): WorkspaceWhiteLabelConfig {
  return {
    id: "test-id",
    workspaceId: "workspace-123",
    customDomain: null,
    customDomainVerified: false,
    dnsVerificationToken: null,
    dnsVerificationStatus: "PENDING",
    sslCertificateStatus: "PENDING",
    sslCertificateIssuedAt: null,
    sslCertificateExpiresAt: null,
    primaryColor: "#ff0000",
    secondaryColor: "#00ff00",
    accentColor: "#0000ff",
    fontFamily: "Inter",
    logoUrl: "https://example.com/logo.png",
    logoR2Key: null,
    faviconUrl: "https://example.com/favicon.ico",
    faviconR2Key: null,
    emailSenderName: null,
    emailSenderDomain: null,
    emailSenderVerified: false,
    emailHeaderLogoUrl: null,
    emailFooterText: null,
    loginPageTitle: null,
    loginPageDescription: null,
    loginBackgroundUrl: null,
    loginBackgroundR2Key: null,
    showPoweredBySpikeLand: true,
    pdfHeaderLogoUrl: null,
    pdfFooterText: null,
    pdfWatermarkUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("buildThemeCss", () => {
  it("should generate CSS with custom colors from config", () => {
    const config = createMockConfig();
    const css = buildThemeCss(config);

    expect(css).toContain("--wl-primary: #ff0000");
    expect(css).toContain("--wl-secondary: #00ff00");
    expect(css).toContain("--wl-accent: #0000ff");
    expect(css).toContain("--wl-font-family: Inter");
    expect(css).toContain(":root {");
    expect(css).toContain("}");
  });

  it("should use default colors when config values are null", () => {
    const config = createMockConfig({
      primaryColor: null,
      secondaryColor: null,
      accentColor: null,
      fontFamily: null,
    });
    const css = buildThemeCss(config);

    expect(css).toContain("--wl-primary: #3b82f6");
    expect(css).toContain("--wl-secondary: #8b5cf6");
    expect(css).toContain("--wl-accent: #f59e0b");
    expect(css).toContain('--wl-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI"');
  });

  it("should return default CSS when config is null", () => {
    const css = buildThemeCss(null);

    expect(css).toContain("--wl-primary: #3b82f6");
    expect(css).toContain(":root {");
  });

  it("should return default CSS when config is undefined", () => {
    const css = buildThemeCss(undefined);

    expect(css).toContain("--wl-primary: #3b82f6");
  });
});

describe("buildRuntimeThemeConfig", () => {
  it("should build runtime theme config from white-label config", () => {
    const config = createMockConfig();
    const theme = buildRuntimeThemeConfig(config);

    expect(theme.colors.primary).toBe("#ff0000");
    expect(theme.colors.secondary).toBe("#00ff00");
    expect(theme.colors.accent).toBe("#0000ff");
    expect(theme.fonts.family).toBe("Inter");
    expect(theme.logos.main).toBe("https://example.com/logo.png");
    expect(theme.logos.favicon).toBe("https://example.com/favicon.ico");
    expect(theme.branding.showPoweredBySpikeLand).toBe(true);
  });

  it("should use defaults when config is null", () => {
    const theme = buildRuntimeThemeConfig(null);

    expect(theme.colors.primary).toBe("#3b82f6");
    expect(theme.logos.main).toBeUndefined();
    expect(theme.branding.showPoweredBySpikeLand).toBe(true);
  });

  it("should handle showPoweredBySpikeLand being false", () => {
    const config = createMockConfig({ showPoweredBySpikeLand: false });
    const theme = buildRuntimeThemeConfig(config);

    expect(theme.branding.showPoweredBySpikeLand).toBe(false);
  });
});

describe("getThemeCacheKey", () => {
  it("should generate cache key with workspace ID", () => {
    const key = getThemeCacheKey("workspace-123");
    expect(key).toBe("theme:workspace-123");
  });
});

describe("isValidHexColor", () => {
  it("should return true for valid 6-digit hex colors", () => {
    expect(isValidHexColor("#ff0000")).toBe(true);
    expect(isValidHexColor("#FF0000")).toBe(true);
    expect(isValidHexColor("#3b82f6")).toBe(true);
  });

  it("should return true for valid 3-digit hex colors", () => {
    expect(isValidHexColor("#f00")).toBe(true);
    expect(isValidHexColor("#FFF")).toBe(true);
  });

  it("should return false for invalid hex colors", () => {
    expect(isValidHexColor("ff0000")).toBe(false);
    expect(isValidHexColor("#gg0000")).toBe(false);
    expect(isValidHexColor("#ff00")).toBe(false);
    expect(isValidHexColor("red")).toBe(false);
  });
});

describe("hexToRgb", () => {
  it("should convert valid hex color to RGB", () => {
    const result = hexToRgb("#ff0000");
    expect(result).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("should handle lowercase and uppercase hex", () => {
    expect(hexToRgb("#3b82f6")).toEqual({ r: 59, g: 130, b: 246 });
    expect(hexToRgb("#3B82F6")).toEqual({ r: 59, g: 130, b: 246 });
  });

  it("should return null for invalid hex colors", () => {
    expect(hexToRgb("invalid")).toBeNull();
    expect(hexToRgb("#fff")).toBeNull(); // 3-digit hex not supported by hexToRgb
    expect(hexToRgb("#gg0000")).toBeNull();
  });
});

describe("buildThemeCssWithAlpha", () => {
  it("should include RGB variables for alpha support", () => {
    const config = createMockConfig({
      primaryColor: "#3b82f6",
      secondaryColor: "#8b5cf6",
      accentColor: "#f59e0b",
    });
    const css = buildThemeCssWithAlpha(config);

    expect(css).toContain("--wl-primary-rgb: 59, 130, 246");
    expect(css).toContain("--wl-secondary-rgb: 139, 92, 246");
    expect(css).toContain("--wl-accent-rgb: 245, 158, 11");
  });

  it("should use default colors when config is null", () => {
    const css = buildThemeCssWithAlpha(null);

    expect(css).toContain("--wl-primary: #3b82f6");
    expect(css).toContain("--wl-primary-rgb:");
  });
});

describe("buildTailwindColors", () => {
  it("should generate Tailwind color config", () => {
    const config = createMockConfig();
    const colors = buildTailwindColors(config);

    expect(colors["wl-primary"]).toBe("#ff0000");
    expect(colors["wl-secondary"]).toBe("#00ff00");
    expect(colors["wl-accent"]).toBe("#0000ff");
  });

  it("should use defaults when config is null", () => {
    const colors = buildTailwindColors(null);

    expect(colors["wl-primary"]).toBe("#3b82f6");
  });
});
