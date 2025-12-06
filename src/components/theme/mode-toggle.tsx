"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Toggle between light and dark
  const toggleTheme = () => {
    // Use resolvedTheme to handle "system" case properly
    const currentTheme = theme === "system" ? resolvedTheme : theme;
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Toggle theme (loading)">
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  // Determine which icon to show based on resolved theme
  const effectiveTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = effectiveTheme === "dark";

  const getIcon = () => {
    if (isDark) {
      return <Moon className="h-5 w-5 transition-all" aria-hidden="true" />;
    }
    return <Sun className="h-5 w-5 transition-all" aria-hidden="true" />;
  };

  // Create accessible label indicating current state and next action
  const getAriaLabel = () => {
    if (isDark) {
      return "Dark mode active. Click to switch to light mode.";
    }
    return "Light mode active. Click to switch to dark mode.";
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={getAriaLabel()}
      title={getAriaLabel()}
    >
      {getIcon()}
      <span className="sr-only">{getAriaLabel()}</span>
    </Button>
  );
}
