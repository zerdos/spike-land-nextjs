import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // spike.land brand colors
        spike: {
          cyan: "#8B5CF6", // Replaced with Violet
          fuchsia: "#EC4899", // Replaced with Pink-500
          purple: "#8B5CF6",
          amber: "#F59E0B",
          gold: "#FBBF24",
        },
        // Dark theme colors
        dark: {
          bg: "#0F172A",
          card: "#1E293B",
          border: "#334155",
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
