import type { LandingTheme } from "./types";

export const figmaTheme: LandingTheme = {
  name: "figma",
  colors: {
    background: "#ffffff",
    foreground: "#000000",
    primary: "#0acf83",
    primaryForeground: "#ffffff",
    secondary: "#e5e5e5",
    secondaryForeground: "#000000",
    accent: "#f24e1e", // Red accent
    accentForeground: "#ffffff",
    muted: "#b3b3b3",
    mutedForeground: "#000000",
    border: "#e6e6e6",
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    headingWeight: "700",
  },
  styles: {
    radius: "6px",
    glass: false,
    flat: true,
  },
};
