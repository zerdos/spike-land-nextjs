import type { LandingTheme } from "./types";

export const notionTheme: LandingTheme = {
  name: "notion",
  colors: {
    background: "#f7f6f3", // Creamy background
    foreground: "#37352f",
    primary: "#333333",
    primaryForeground: "#ffffff",
    secondary: "#e1dac9",
    secondaryForeground: "#37352f",
    accent: "#eb5757", // Light red
    accentForeground: "#ffffff",
    muted: "#9e9e9e",
    mutedForeground: "#787774",
    border: "#d9d6ce",
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    headingWeight: "700",
  },
  styles: {
    radius: "4px",
    glass: false,
    flat: true,
  },
};
