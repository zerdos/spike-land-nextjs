import { useColorScheme as useRNColorScheme } from "react-native";

/**
 * Custom color scheme hook that defaults to dark mode
 * to match the web app's design philosophy:
 * "Dark Futuristic - The AI Spark"
 */
export function useColorScheme(): "light" | "dark" {
  const colorScheme = useRNColorScheme();
  // Default to dark mode to match web app
  return colorScheme ?? "dark";
}
