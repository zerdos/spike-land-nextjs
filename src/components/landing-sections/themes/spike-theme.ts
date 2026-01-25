import type { LandingTheme } from "./types";

export const spikeTheme: LandingTheme = {
  name: "spike",
  colors: {
    background: "#0a0a0f",
    foreground: "#f5f5f5",
    primary: "#6366f1",
    primaryForeground: "#ffffff",
    secondary: "#18181b",
    secondaryForeground: "#f5f5f5",
    accent: "#8b5cf6",
    accentForeground: "#ffffff",
    muted: "#27272a",
    mutedForeground: "#a1a1aa",
    border: "#27272a",
  },
  typography: {
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    headingWeight: "700",
  },
  styles: {
    radius: "12px",
    glass: true,
    flat: false,
  },
};
