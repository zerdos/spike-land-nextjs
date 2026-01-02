import type { LandingTheme } from "./types";

export const stripeTheme: LandingTheme = {
  name: "stripe",
  colors: {
    background: "#ffffff",
    foreground: "#0a2540",
    primary: "#635bff",
    primaryForeground: "#ffffff",
    secondary: "#f6f9fc",
    secondaryForeground: "#0a2540",
    accent: "#00d4ff",
    accentForeground: "#0a2540",
    muted: "#adbdcc",
    mutedForeground: "#425466",
    border: "#e6ebf1",
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    headingWeight: "700",
  },
  styles: {
    radius: "9999px",
    glass: false,
    flat: false,
  },
};
