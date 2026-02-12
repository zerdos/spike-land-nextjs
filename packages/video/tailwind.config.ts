import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // spike.land brand colors (Nebula Theme)
        spike: {
          cyan: "#8B5CF6", // Re-mapped to Violet
          fuchsia: "#EC4899", // Re-mapped to Pink
          purple: "#A855F7",
          amber: "#F59E0B",
          gold: "#FBBF24",
        },
        // Dark theme colors
        dark: {
          bg: "#0F172A", // Deep Slate
          card: "#1E293B", // Slate-800
          border: "#334155", // Slate-700
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
