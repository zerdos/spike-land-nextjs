import type { WorkspaceWhiteLabelConfig } from '@/types/white-label';
import type { ThemeCssVariables, RuntimeThemeConfig } from '@/types/white-label';

/**
 * Default color values when no custom colors are configured
 */
const DEFAULT_COLORS = {
  primary: '#3b82f6', // blue-500
  secondary: '#8b5cf6', // violet-500
  accent: '#f59e0b', // amber-500
};

/**
 * Default font family
 */
const DEFAULT_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/**
 * Build CSS custom properties from white-label configuration
 * Generates CSS variables that can be injected into the page head
 *
 * @param config - White-label configuration
 * @returns CSS string with custom properties
 */
export function buildThemeCss(config: WorkspaceWhiteLabelConfig | null | undefined): string {
  if (!config) {
    return buildDefaultThemeCss();
  }

  const variables: ThemeCssVariables = {
    '--wl-primary': config.primaryColor || DEFAULT_COLORS.primary,
    '--wl-secondary': config.secondaryColor || DEFAULT_COLORS.secondary,
    '--wl-accent': config.accentColor || DEFAULT_COLORS.accent,
    '--wl-font-family': config.fontFamily || DEFAULT_FONT_FAMILY,
  };

  // Generate CSS string
  const cssVariables = Object.entries(variables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  return `:root {\n${cssVariables}\n}`;
}

/**
 * Build default theme CSS when no white-label configuration exists
 */
function buildDefaultThemeCss(): string {
  const variables: ThemeCssVariables = {
    '--wl-primary': DEFAULT_COLORS.primary,
    '--wl-secondary': DEFAULT_COLORS.secondary,
    '--wl-accent': DEFAULT_COLORS.accent,
    '--wl-font-family': DEFAULT_FONT_FAMILY,
  };

  const cssVariables = Object.entries(variables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  return `:root {\n${cssVariables}\n}`;
}

/**
 * Build runtime theme configuration for use in React components
 * This provides a typed object for accessing theme values in components
 *
 * @param config - White-label configuration
 * @returns Runtime theme configuration object
 */
export function buildRuntimeThemeConfig(
  config: WorkspaceWhiteLabelConfig | null | undefined
): RuntimeThemeConfig {
  return {
    colors: {
      primary: config?.primaryColor || DEFAULT_COLORS.primary,
      secondary: config?.secondaryColor || DEFAULT_COLORS.secondary,
      accent: config?.accentColor || DEFAULT_COLORS.accent,
    },
    fonts: {
      family: config?.fontFamily || DEFAULT_FONT_FAMILY,
    },
    logos: {
      main: config?.logoUrl || undefined,
      favicon: config?.faviconUrl || undefined,
    },
    branding: {
      showPoweredBySpikeLand: config?.showPoweredBySpikeLand ?? true,
    },
  };
}

/**
 * Generate cache key for theme CSS
 * Used for caching theme CSS in Redis/Vercel KV
 *
 * @param workspaceId - Workspace ID
 * @returns Cache key string
 */
export function getThemeCacheKey(workspaceId: string): string {
  return `theme:${workspaceId}`;
}

/**
 * Parse hex color and validate format
 * @param color - Hex color string
 * @returns True if valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Convert hex color to RGB values
 * @param hex - Hex color string
 * @returns RGB object or null if invalid
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!isValidHexColor(hex)) return null;

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  return {
    r: parseInt(result[1] ?? '0', 16),
    g: parseInt(result[2] ?? '0', 16),
    b: parseInt(result[3] ?? '0', 16),
  };
}

/**
 * Generate CSS for theme with alpha channel support
 * Useful for creating semi-transparent variations of theme colors
 *
 * @param config - White-label configuration
 * @returns Extended CSS with RGB and alpha variants
 */
export function buildThemeCssWithAlpha(
  config: WorkspaceWhiteLabelConfig | null | undefined
): string {
  const baseCss = buildThemeCss(config);

  // Convert colors to RGB for alpha support
  const primaryColor = config?.primaryColor ?? DEFAULT_COLORS.primary;
  const secondaryColor = config?.secondaryColor ?? DEFAULT_COLORS.secondary;
  const accentColor = config?.accentColor ?? DEFAULT_COLORS.accent;

  const primaryRgb = hexToRgb(primaryColor);
  const secondaryRgb = hexToRgb(secondaryColor);
  const accentRgb = hexToRgb(accentColor);

  const alphaVariables = [
    primaryRgb && `  --wl-primary-rgb: ${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b};`,
    secondaryRgb &&
      `  --wl-secondary-rgb: ${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b};`,
    accentRgb && `  --wl-accent-rgb: ${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b};`,
  ]
    .filter(Boolean)
    .join('\n');

  // Combine base CSS with alpha variants
  const lines = baseCss.split('\n');
  lines.splice(lines.length - 1, 0, alphaVariables);

  return lines.join('\n');
}

/**
 * Generate Tailwind-compatible color utilities from white-label config
 * Can be used to extend Tailwind config dynamically
 *
 * @param config - White-label configuration
 * @returns Tailwind color configuration object
 */
export function buildTailwindColors(config: WorkspaceWhiteLabelConfig | null | undefined) {
  return {
    'wl-primary': config?.primaryColor || DEFAULT_COLORS.primary,
    'wl-secondary': config?.secondaryColor || DEFAULT_COLORS.secondary,
    'wl-accent': config?.accentColor || DEFAULT_COLORS.accent,
  };
}
