'use client';

import { useEffect, useState } from 'react';
import { buildThemeCss, buildRuntimeThemeConfig } from '@/lib/white-label/theme-builder';
import type { WorkspaceWhiteLabelConfig, RuntimeThemeConfig } from '@/types/white-label';

interface ThemeProviderProps {
  /** Initial white-label configuration (from server) */
  initialConfig?: WorkspaceWhiteLabelConfig | null;
  /** Children to wrap with theme */
  children: React.ReactNode;
  /** Workspace slug for fetching config (if not provided initially) */
  workspaceSlug?: string;
}

/**
 * ThemeProvider Component
 *
 * Injects custom CSS variables into the page based on workspace white-label configuration.
 * This enables dynamic theming without rebuilding the application.
 *
 * Usage:
 * ```tsx
 * <ThemeProvider initialConfig={config}>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({
  initialConfig,
  children,
  workspaceSlug,
}: ThemeProviderProps) {
  const [config, setConfig] = useState<WorkspaceWhiteLabelConfig | null>(
    initialConfig ?? null
  );
  const [themeConfig, setThemeConfig] = useState<RuntimeThemeConfig | null>(null);

  // Fetch white-label config if not provided and workspaceSlug is available
  useEffect(() => {
    if (!initialConfig && workspaceSlug) {
      fetch(`/api/orbit/${workspaceSlug}/white-label`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setConfig(data.data);
          }
        })
        .catch((error) => {
          console.error('Error fetching white-label config:', error);
        });
    }
  }, [initialConfig, workspaceSlug]);

  // Build theme config when config changes
  useEffect(() => {
    if (config) {
      const runtimeConfig = buildRuntimeThemeConfig(config);
      setThemeConfig(runtimeConfig);
    }
  }, [config]);

  // Inject theme CSS into the page
  useEffect(() => {
    if (!config) return;

    const themeCss = buildThemeCss(config);
    const styleId = 'white-label-theme';

    // Remove existing style tag if present
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Inject new style tag
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = themeCss;
    document.head.appendChild(styleElement);

    // Cleanup on unmount
    return () => {
      const style = document.getElementById(styleId);
      if (style) {
        style.remove();
      }
    };
  }, [config]);

  // Update favicon if configured
  useEffect(() => {
    if (!themeConfig?.logos.favicon) return;

    const faviconLink = document.querySelector<HTMLLinkElement>(
      'link[rel="icon"]'
    );

    if (faviconLink) {
      faviconLink.href = themeConfig.logos.favicon;
    } else {
      // Create new favicon link if it doesn't exist
      const newFaviconLink = document.createElement('link');
      newFaviconLink.rel = 'icon';
      newFaviconLink.href = themeConfig.logos.favicon;
      document.head.appendChild(newFaviconLink);
    }
  }, [themeConfig?.logos.favicon]);

  return <>{children}</>;
}

/**
 * Hook to access runtime theme configuration
 *
 * Usage:
 * ```tsx
 * const theme = useTheme();
 * <div style={{ color: theme?.colors.primary }}>
 *   ...
 * </div>
 * ```
 */
export function useTheme(): RuntimeThemeConfig | null {
  const [themeConfig, setThemeConfig] = useState<RuntimeThemeConfig | null>(null);

  useEffect(() => {
    // Read CSS custom properties from document
    const rootStyles = getComputedStyle(document.documentElement);
    const primary = rootStyles.getPropertyValue('--wl-primary').trim();
    const secondary = rootStyles.getPropertyValue('--wl-secondary').trim();
    const accent = rootStyles.getPropertyValue('--wl-accent').trim();
    const fontFamily = rootStyles.getPropertyValue('--wl-font-family').trim();

    if (primary || secondary || accent || fontFamily) {
      setThemeConfig({
        colors: {
          primary: primary || undefined,
          secondary: secondary || undefined,
          accent: accent || undefined,
        },
        fonts: {
          family: fontFamily || undefined,
        },
        logos: {
          main: undefined,
          favicon: undefined,
        },
        branding: {
          showPoweredBySpikeLand: true,
        },
      });
    }
  }, []);

  return themeConfig;
}
