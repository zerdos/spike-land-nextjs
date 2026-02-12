import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // spike.land brand colors
        spike: {
          cyan: "#8B5CF6", // Replaced with Violet
          fuchsia: "#EC4899", // Replaced with Pink
          purple: "#8B5CF6", // Violet
          amber: "#F59E0B",
          gold: "#FBBF24",
        },
        // Dark theme colors
        dark: {
          bg: "#0F172A", // Deep Slate
          card: "#1E293B", // Slate 800
          border: "#1E293B",
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
