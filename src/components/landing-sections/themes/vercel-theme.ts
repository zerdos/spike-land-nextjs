import type { LandingTheme } from "./types";

export const vercelTheme: LandingTheme = {
  name: "vercel",
  colors: {
    background: "#000000",
    foreground: "#ffffff",
    primary: "#ffffff",
    primaryForeground: "#000000",
    secondary: "#111111",
    secondaryForeground: "#ffffff",
    accent: "#0070f3",
    accentForeground: "#ffffff",
    muted: "#333333",
    mutedForeground: "#888888",
    border: "#333333",
  },
  typography: {
    fontFamily: "Geist, Inter, sans-serif",
    headingWeight: "800",
  },
  styles: {
    radius: "8px",
    glass: false,
    flat: true,
  },
};
