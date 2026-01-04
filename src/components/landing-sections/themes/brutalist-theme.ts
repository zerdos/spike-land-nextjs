import type { LandingTheme } from "./types";

export const brutalistTheme: LandingTheme = {
  name: "brutalist",
  colors: {
    background: "#ffffff",
    foreground: "#000000",
    primary: "#ff0000",
    primaryForeground: "#ffffff",
    secondary: "#ffff00",
    secondaryForeground: "#000000",
    accent: "#0000ff",
    accentForeground: "#ffffff",
    muted: "#e0e0e0",
    mutedForeground: "#000000",
    border: "#000000",
  },
  typography: {
    fontFamily: "Courier New, monospace",
    headingWeight: "900",
  },
  styles: {
    radius: "0px",
    glass: false,
    flat: true,
  },
};
