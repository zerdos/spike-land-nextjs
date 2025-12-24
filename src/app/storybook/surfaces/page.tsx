"use client";

import {
  AccessibilityPanel,
  ComponentSample,
  PageHeader,
  UsageGuide,
} from "@/components/storybook";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function SurfacesPage() {
  return (
    <div className="space-y-20 pb-20">
      <PageHeader
        title="Surfaces"
        description="Our elevation system uses glass-morphism tiers to create visual hierarchy and depth. By manipulating blur and transparency, we create a sense of physical space in a digital environment."
        usage="Use glass tiers to establish container hierarchy. Base tiers for low-priority backgrounds, Standard tiers for content containers, and Interactive tiers for high-focus or floating elements."
      />

      <UsageGuide
        dos={[
          "Use Tier 1 (glass-1) as the default container background.",
          "Apply Tier 2 (glass-2) for elements that float or require immediate attention like modals.",
          "Use Tier 0 (glass-0) for nested components within another glass container to maintain clarity.",
          "Ensure text contrast remains high against translucent backgrounds.",
        ]}
        donts={[
          "Avoid stacking more than two glass layers to prevent visual distortion.",
          "Don't use glass-2 for large, static backgrounds as it can be visually heavy.",
          "Avoid using glass effects on top of complex, high-contrast imagery without a dark overlay.",
        ]}
      />

      <section className="space-y-12">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold font-heading">Glass Morphism Tiers</h2>
          <p className="text-muted-foreground">
            Our core elevation system. Each level represents a specific depth in the UI hierarchy,
            achieved through precise backdrop blur and transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <ComponentSample
            title="glass-0"
            description="Minimal blur (4px). Sub-surface or recessed backgrounds."
          >
            <Card className="glass-0 w-full">
              <CardContent className="pt-6 space-y-2 text-center">
                <Badge variant="outline" className="mb-2">Base</Badge>
                <p className="text-sm text-muted-foreground">
                  Subtle transparency for nested items.
                </p>
              </CardContent>
            </Card>
          </ComponentSample>

          <ComponentSample
            title="glass-1"
            description="Medium blur (8px). Primary surface for cards and panels."
          >
            <Card className="glass-1 w-full">
              <CardContent className="pt-6 space-y-2 text-center">
                <Badge variant="outline" className="mb-2 border-primary/30 text-primary">
                  Standard
                </Badge>
                <p className="text-sm text-muted-foreground">
                  The default container for most platform content.
                </p>
              </CardContent>
            </Card>
          </ComponentSample>

          <ComponentSample
            title="glass-2"
            description="High blur (16px). Maximum elevation for overlays."
          >
            <Card className="glass-2 w-full">
              <CardContent className="pt-6 space-y-2 text-center">
                <Badge variant="outline" className="mb-2 border-accent/30 text-accent">
                  Interactive
                </Badge>
                <p className="text-sm text-muted-foreground">
                  High-focus elements like modals and hover states.
                </p>
              </CardContent>
            </Card>
          </ComponentSample>
        </div>
      </section>

      <section className="space-y-12 pt-10 border-t border-white/5">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold font-heading">Shadow-based Surfaces</h2>
          <p className="text-muted-foreground">
            While glass-morphism is our primary language, specialized shadows provide depth for
            non-translucent or high-focus elements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <ComponentSample
            title="Negative (Inset)"
            description="Neumorphic-inspired inset shadows for recessed elements."
          >
            <Card variant="negative" className="w-full">
              <CardContent className="pt-6 text-center h-32 flex flex-col justify-center items-center">
                <Badge variant="outline" className="mb-2 border-slate-400 text-slate-600">
                  Inset Style
                </Badge>
                <p className="text-xs text-slate-500 font-medium">
                  Perfect for input containers or recessed panels.
                </p>
              </CardContent>
            </Card>
          </ComponentSample>

          <ComponentSample
            title="Floating"
            description="Extreme depth with multi-layered drop shadows."
          >
            <Card variant="floating" className="w-full">
              <CardContent className="pt-6 text-center h-32 flex flex-col justify-center items-center">
                <Badge variant="outline" className="mb-2 border-indigo-500/30 text-indigo-400">
                  Layered Depth
                </Badge>
                <p className="text-sm text-muted-foreground">
                  High-elevation surfaces that appear to float above the UI.
                </p>
              </CardContent>
            </Card>
          </ComponentSample>
        </div>
      </section>

      <section className="space-y-12 pt-10 border-t border-white/5">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold font-heading">Vibrant Aura Surfaces</h2>
          <p className="text-muted-foreground">
            High-saturation glass surfaces with integrated glows, perfect for category-specific
            identifiers or high-energy dashboard modules.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <div className="space-y-3">
            <Card variant="blue" className="h-24 flex items-center justify-center">
              <span className="font-bold text-xs text-white">Blue</span>
            </Card>
            <p className="text-[10px] text-center text-muted-foreground">Sky Aura</p>
          </div>
          <div className="space-y-3">
            <Card variant="green" className="h-24 flex items-center justify-center">
              <span className="font-bold text-xs text-white">Green</span>
            </Card>
            <p className="text-[10px] text-center text-muted-foreground">Forest Aura</p>
          </div>
          <div className="space-y-3">
            <Card variant="orange" className="h-24 flex items-center justify-center">
              <span className="font-bold text-xs text-white">Orange</span>
            </Card>
            <p className="text-[10px] text-center text-muted-foreground">Solar Aura</p>
          </div>
          <div className="space-y-3">
            <Card variant="fuchsia" className="h-24 flex items-center justify-center">
              <span className="font-bold text-xs text-white">Fuchsia</span>
            </Card>
            <p className="text-[10px] text-center text-muted-foreground">Neon Aura</p>
          </div>
          <div className="space-y-3">
            <Card variant="pink" className="h-24 flex items-center justify-center">
              <span className="font-bold text-xs text-white">Pink</span>
            </Card>
            <p className="text-[10px] text-center text-muted-foreground">Rose Aura</p>
          </div>
          <div className="space-y-3">
            <Card variant="purple" className="h-24 flex items-center justify-center">
              <span className="font-bold text-xs text-white">Purple</span>
            </Card>
            <p className="text-[10px] text-center text-muted-foreground">Deep Aura</p>
          </div>
        </div>
      </section>

      <section className="space-y-12 pt-10 border-t border-white/5">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold font-heading">High-Fidelity Layers</h2>
          <p className="text-muted-foreground">
            Our most sophisticated surfaces. Deep, dark charcoal glass with extreme background blur
            (20px) and multi-layered shadows for a truly premium feel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <ComponentSample
            title="Minimalist Layers"
            description="Ultra-dark glass with crisp elevation."
          >
            <Card variant="layers" className="w-full">
              <CardContent className="pt-6 text-center h-48 flex flex-col justify-center items-center space-y-4">
                <div className="p-3 bg-white/10 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white/20" />
                </div>
                <div>
                  <p className="font-bold text-white">vqw07's layers.</p>
                  <p className="text-xs text-white/40">layers.to</p>
                </div>
              </CardContent>
            </Card>
          </ComponentSample>

          <ComponentSample
            title="Content Overlay"
            description="Layers used to showcase high-contrast content."
          >
            <Card variant="layers" className="w-full overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                <p className="text-xs font-bold text-white/20">PREVIEW IMAGE</p>
              </div>
              <CardContent className="pt-6 space-y-2">
                <p className="font-bold text-white">Aan Ragil's layers.</p>
                <p className="text-xs text-white/40">layers.to</p>
              </CardContent>
            </Card>
          </ComponentSample>
        </div>
      </section>

      <AccessibilityPanel
        notes={[
          "Glass surfaces use semi-transparent backgrounds with backdrop-filters.",
          "All glass tiers include a subtle border (glass-edge) for visual definition without high contrast lines.",
          "Text color automatically adjusts to remain readable over light or dark backgrounds.",
          "Backdrop-filter 'blur' is disabled on low-power devices to maintain performance.",
        ]}
      />
    </div>
  );
}
