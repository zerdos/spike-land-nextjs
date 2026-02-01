export const COLORS = {
  // Claude Code (amber/orange brand)
  claude: {
    primary: "#D97706", // amber-600
    secondary: "#F59E0B", // amber-500
    background: "rgba(217, 119, 6, 0.1)",
    border: "rgba(217, 119, 6, 0.2)",
  },
  // OpenClaw (emerald brand)
  openClaw: {
    primary: "#10B981", // emerald-500
    secondary: "#34D399", // emerald-400
    background: "rgba(16, 185, 129, 0.1)",
    border: "rgba(16, 185, 129, 0.2)",
  },
  // Severity levels
  severity: {
    critical: "hsl(var(--destructive))",
    high: "hsl(var(--warning))",
    medium: "hsl(var(--aurora-teal))",
    low: "hsl(var(--muted-foreground))",
  },
  // Neutral/UI
  neutral: {
    glass: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassHover: "rgba(255, 255, 255, 0.1)",
  },
};

export const ANIMATION_TIMING = {
  fast: 150, // UI feedback
  normal: 300, // Transitions
  slow: 500, // Scroll reveals
  counter: 2000, // Number counting
  typewriter: 50, // Per character
};

export const LAYOUT = {
  maxWidth: "max-w-7xl",
  sectionSpacing: "py-24",
  containerPadding: "px-6",
};
