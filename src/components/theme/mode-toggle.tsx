"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Cycle through: light → dark → system
  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Toggle theme (loading)">
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  // Determine which icon to show based on current theme
  const getIcon = () => {
    if (theme === "system") {
      return <Monitor className="h-5 w-5 transition-all" aria-hidden="true" />;
    } else if (theme === "dark") {
      return <Moon className="h-5 w-5 transition-all" aria-hidden="true" />;
    } else {
      return <Sun className="h-5 w-5 transition-all" aria-hidden="true" />;
    }
  };

  // Create accessible label indicating current state and next action
  const getAriaLabel = () => {
    if (theme === "light") {
      return "Light mode active. Click to switch to dark mode.";
    } else if (theme === "dark") {
      return "Dark mode active. Click to use system preference.";
    } else {
      const nextTheme = systemTheme === "dark" ? "dark" : "light";
      return `System mode active (${nextTheme}). Click to switch to light mode.`;
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      aria-label={getAriaLabel()}
      title={getAriaLabel()}
    >
      {getIcon()}
      <span className="sr-only">{getAriaLabel()}</span>
    </Button>
  );
}
