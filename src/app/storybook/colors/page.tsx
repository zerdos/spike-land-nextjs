"use client";

import {
  AccessibilityPanel,
  colorPalette,
  ColorSwatch,
  ComponentSample,
  PageHeader,
} from "@/components/storybook";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function ColorsPage() {
  return (
    <div className="space-y-20 pb-20">
      <PageHeader
        title="Color System"
        description="Our color system is built on a foundation of deep space blues and vibrant neon accents. Every color is meticulously tuned for high-contrast accessibility and optical richness."
        usage="Use CSS variables throughout the application to ensure theme consistency. Accent colors should be used sparingly to guide user focus."
      />

      {/* Brand Identity */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold font-heading">Brand Identity</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="grid grid-cols-1 gap-4">
            {colorPalette.brand.map((color) => <ColorSwatch key={color.name} {...color} />)}
          </div>
          <Card className="glass-1 overflow-hidden group">
            <div className="h-full min-h-[200px] flex items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 animate-pulse" />
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary shadow-glow-cyan animate-bounce" />
                  <div className="w-16 h-16 rounded-full bg-accent shadow-glow-fuchsia animate-bounce delay-150" />
                </div>
                <p className="text-xl font-black font-heading tracking-widest text-foreground/80 group-hover:text-primary transition-colors">
                  SPIKE LAND CORE
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Theme Foundations */}
      <section className="space-y-8 pt-10 border-t border-white/5">
        <h2 className="text-3xl font-bold font-heading">Theme Foundations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <Label className="uppercase text-[10px] tracking-widest font-black opacity-40">
              Dark Mode (Deep Space)
            </Label>
            <div className="grid grid-cols-1 gap-4">
              {colorPalette.dark.map((color) => <ColorSwatch key={color.name} {...color} />)}
            </div>
          </div>
          <div className="space-y-6">
            <Label className="uppercase text-[10px] tracking-widest font-black opacity-40">
              Light Mode (Carbon)
            </Label>
            <div className="grid grid-cols-1 gap-4">
              {colorPalette.light.map((color) => <ColorSwatch key={color.name} {...color} />)}
            </div>
          </div>
        </div>
      </section>

      {/* Optical Effects */}
      <section className="space-y-8 pt-10 border-t border-white/5">
        <h2 className="text-3xl font-bold font-heading">Optical Effects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <ComponentSample
            title="Glow Utilities"
            description="Vibrant shadows and rings for emphasis."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-[10px] uppercase tracking-wider opacity-60">Cyan Glow</Label>
                <Button className="w-full shadow-glow-cyan">Action Ready</Button>
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] uppercase tracking-wider opacity-60">
                  Fuchsia Glow
                </Label>
                <Button className="w-full bg-accent hover:bg-accent/90 shadow-glow-fuchsia">
                  Priority Focus
                </Button>
              </div>
              <div className="space-y-3 sm:col-span-2">
                <Label className="text-[10px] uppercase tracking-wider opacity-60">
                  Gradient Surface
                </Label>
                <div className="h-12 rounded-xl gradient-cyan-fuchsia shadow-glow-gradient flex items-center justify-center group cursor-pointer transition-all hover:scale-[1.02]">
                  <span className="text-white font-black font-heading tracking-widest text-sm uppercase">
                    Ultimate
                  </span>
                </div>
              </div>
            </div>
          </ComponentSample>

          <ComponentSample
            title="Glass Elevation"
            description="Translucent layers with depth-based blur."
          >
            <div className="space-y-6 p-4 rounded-3xl bg-black/40 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16" />
              <div className="relative z-10 space-y-4">
                <div className="p-4 rounded-xl glass-0 border-white/10">
                  <p className="text-xs font-mono text-primary">tier-0 / blur-xs</p>
                </div>
                <div className="p-4 rounded-xl glass-1 border-white/10 shadow-lg">
                  <p className="text-xs font-mono text-primary">tier-1 / blur-md</p>
                </div>
                <div className="p-4 rounded-xl glass-2 border-white/10 shadow-2xl">
                  <p className="text-xs font-mono text-primary">tier-2 / blur-xl</p>
                </div>
              </div>
            </div>
          </ComponentSample>
        </div>
      </section>

      <AccessibilityPanel
        notes={[
          "Primary color (#00E5FF) is paired with dark backgrounds for 4.5:1 contrast.",
          "Secondary color (#FF00FF) is used primarily for non-text accents.",
          "Light/Dark mode palettes are tested for WCAG AA compliance.",
          "Glow effects do not use motion that could trigger sensitivity.",
          "Elevation tiers maintain distinct contrast ratios even on busy backgrounds.",
        ]}
      />
    </div>
  );
}
