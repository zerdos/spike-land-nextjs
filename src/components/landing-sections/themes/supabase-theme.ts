import type { LandingTheme } from "./types";

export const supabaseTheme: LandingTheme = {
  name: "supabase",
  colors: {
    background: "#1c1c1c",
    foreground: "#ededed",
    primary: "#3ecf8e",
    primaryForeground: "#000000",
    secondary: "#232323",
    secondaryForeground: "#ededed",
    accent: "#6366f1",
    accentForeground: "#ffffff",
    muted: "#2e2e2e",
    mutedForeground: "#858585",
    border: "#3e3e3e",
  },
  typography: {
    fontFamily: "Roboto Mono, monospace",
    headingWeight: "400",
  },
  styles: {
    radius: "4px",
    glass: false,
    flat: true,
  },
};
