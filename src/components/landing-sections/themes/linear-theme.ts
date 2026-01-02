import type { LandingTheme } from "./types";

export const linearTheme: LandingTheme = {
  name: "linear",
  colors: {
    background: "#000000",
    foreground: "#eeeeee",
    primary: "#5E6AD2",
    primaryForeground: "#ffffff",
    secondary: "#1c1c1c",
    secondaryForeground: "#eeeeee",
    accent: "#b2b2b2",
    accentForeground: "#000000",
    muted: "#333333",
    mutedForeground: "#888888",
    border: "#2c2c2c",
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    headingWeight: "600",
  },
  styles: {
    radius: "6px",
    glass: true,
    flat: true,
  },
};
