/**
 * Colors matching the web app's design system
 * Brand color: Pixel Cyan #00E5FF
 */

const pixelCyan = "#00E5FF";
const tintColorLight = pixelCyan;
const tintColorDark = pixelCyan;

export default {
  light: {
    text: "#12121C", // Carbon Text
    background: "#F8FAFB",
    tint: tintColorLight,
    tabIconDefault: "#9CA3AF",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#FFFFFF",
    background: "#08080C", // Deep Space
    tint: tintColorDark,
    tabIconDefault: "#6B7280",
    tabIconSelected: tintColorDark,
  },
};
