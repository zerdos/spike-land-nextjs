import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // spike.land brand colors - Updated to Nebula Intelligence Theme
        spike: {
          cyan: "#8B5CF6", // Aliased to Violet for backward compatibility
          fuchsia: "#EC4899", // Pink
          purple: "#8B5CF6", // Violet
          amber: "#F59E0B",
          gold: "#FBBF24",
          violet: "#8B5CF6",
          pink: "#EC4899",
        },
        // Dark theme colors
        dark: {
          bg: "#0F172A", // Slate-900
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
