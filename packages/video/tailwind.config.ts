import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // spike.land brand colors
        spike: {
          cyan: "#00E5FF",
          fuchsia: "#FF00FF",
          purple: "#9945FF",
          amber: "#F59E0B",
          gold: "#FBBF24",
        },
        // Dark theme colors
        dark: {
          bg: "#0a0a0f",
          card: "#1a1a2e",
          border: "#2a2a3e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
