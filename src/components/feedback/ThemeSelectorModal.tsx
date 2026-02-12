"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Monitor, Palette, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";

const THEMES = [
  {
    id: "default",
    name: "Dark Futuristic",
    description: "The original Spike.Land experience",
    icon: Monitor,
    class: "",
  },
  {
    id: "retro",
    name: "Retro Vintage",
    description: "Classic 80s terminal vibes with amber tones",
    icon: Palette,
    class: "theme-retro",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Night",
    description: "High contrast neon green and magenta",
    icon: Zap,
    class: "theme-cyberpunk",
  },
  {
    id: "minimalist",
    name: "Minimalist Paper",
    description: "Clean, high-contrast monochrome design",
    icon: Sparkles,
    class: "theme-minimalist",
  },
];

interface ThemeSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThemeSelectorModal({ open, onOpenChange }: ThemeSelectorModalProps) {
  const [currentTheme, setCurrentTheme] = useState("default");

  useEffect(() => {
    const saved = localStorage.getItem("selected-theme") || "default";
    setCurrentTheme(saved);
  }, []);

  const applyTheme = (themeId: string) => {
    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return;

    // Remove all theme classes
    THEMES.forEach((t) => {
      if (t.class) {
        document.documentElement.classList.remove(t.class);
      }
    });

    // Add new theme class if it exists
    if (theme.class) {
      document.documentElement.classList.add(theme.class);
    }

    localStorage.setItem("selected-theme", themeId);
    setCurrentTheme(themeId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] glass-2 border-primary/20 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight text-gradient-primary">
            Secret Theme Selector
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            You discovered a hidden feature! Choose a vibe for your session.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {THEMES.map((theme) => {
            const Icon = theme.icon;
            const isSelected = currentTheme === theme.id;

            return (
              <button
                key={theme.id}
                onClick={() => applyTheme(theme.id)}
                className={cn(
                  "flex items-start gap-4 rounded-xl border p-4 text-left transition-all hover:bg-secondary/20",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-glow-primary"
                    : "border-border bg-card/50"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                  isSelected ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold leading-none">{theme.name}</span>
                  <span className="text-sm text-muted-foreground">{theme.description}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
