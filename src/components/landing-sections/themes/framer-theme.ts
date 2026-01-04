import type { LandingTheme } from "./types";

export const framerTheme: LandingTheme = {
  name: "framer",
  colors: {
    background: "#050511", // Very dark blue/black
    foreground: "#ffffff",
    primary: "#0055ff", // Bright blue
    primaryForeground: "#ffffff",
    secondary: "#1a1a2e",
    secondaryForeground: "#ffffff",
    accent: "#bb5ef9", // Purple
    accentForeground: "#ffffff",
    muted: "#666666",
    mutedForeground: "#888888",
    border: "#333333",
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    headingWeight: "700",
  },
  styles: {
    radius: "12px",
    glass: true,
    flat: false,
  },
};
