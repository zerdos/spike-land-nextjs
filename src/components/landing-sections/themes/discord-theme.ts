import type { LandingTheme } from "./types";

export const discordTheme: LandingTheme = {
  name: "discord",
  colors: {
    background: "#313338",
    foreground: "#dbdee1",
    primary: "#5865f2", // Blurple
    primaryForeground: "#ffffff",
    secondary: "#2b2d31", // Darker gray
    secondaryForeground: "#dbdee1",
    accent: "#eb459e", // Pink
    accentForeground: "#ffffff",
    muted: "#949ba4",
    mutedForeground: "#949ba4",
    border: "#1e1f22",
  },
  typography: {
    fontFamily: "gg sans, Helvetica Neue, Helvetica, Arial, sans-serif",
    headingWeight: "800", // Bold/Black
  },
  styles: {
    radius: "8px",
    glass: false,
    flat: true,
  },
};
