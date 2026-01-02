import type { LandingTheme } from "./types";

export const appleTheme: LandingTheme = {
  name: "apple",
  colors: {
    background: "#ffffff",
    foreground: "#1d1d1f",
    primary: "#0071e3",
    primaryForeground: "#ffffff",
    secondary: "#f5f5f7",
    secondaryForeground: "#1d1d1f",
    accent: "#2997ff",
    accentForeground: "#ffffff",
    muted: "#86868b",
    mutedForeground: "#86868b",
    border: "#d2d2d7",
  },
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    headingWeight: "600",
  },
  styles: {
    radius: "18px",
    glass: true,
    flat: true,
  },
};
