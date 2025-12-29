"use client";

import {
  AccessibilityPanel,
  ComponentSample,
  PageHeader,
  UsageGuide,
} from "@/components/storybook";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Copy, Layers, Search, Share2, Sparkles, Wifi } from "lucide-react";
import { useState } from "react";

export default function SurfacesPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (className: string) => {
    navigator.clipboard.writeText(className);
    setCopied(className);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-32 pb-32">
      <PageHeader
        title="Surfaces & Elevation"
        description="Our physical model within the digital space. We use a combination of glass-morphism tiers, deep shadows, and vibrant 'aura' glows to establish hierarchy, depth, and attention."
        usage="Use Glass Tiers for structure, Shadows for floating interaction details, and Aura Surfaces for brand moments."
      />

      <UsageGuide
        dos={[
          "Use Tier 1 (glass-1) as the default container for cards and panels.",
          "Apply Tier 2 (glass-2) sparingly for floating elements like modals or active states.",
          "Use 'Negative' shadow (inset) for grounded, recessed areas like inputs or wells.",
          "Ensure text has sufficient contrast, especially on vibrant Aura surfaces.",
        ]}
        donts={[
          "Avoid stacking glass layers more than 2 levels deep (visual noise).",
          "Don't use glass-2 for large background areas; it's performance-heavy and visually distracting.",
          "Never mix 'Aura' surfaces with competing high-saturation backgrounds.",
        ]}
      />

      {/* Glass Morphism Tiers - with visual background to prove blur */}
      <section className="space-y-8 relative">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-3xl font-bold font-heading">Glass Morphism Tiers</h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Our core depth system. The background below these cards helps verify the strength of the
            blur technique at each tier.
          </p>
        </div>

        {/* Abstract background to demonstrate blur */}
        <div className="relative py-12 px-6 rounded-3xl border border-white/5 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.05]" />
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-blue-500/30 rounded-full blur-[80px] -translate-y-1/2" />
          <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-purple-500/30 rounded-full blur-[80px] -translate-y-1/2" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            <div className="group space-y-4">
              <div
                className="glass-0 h-48 rounded-2xl border border-white/5 flex flex-col items-center justify-center p-6 text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                onClick={() => handleCopy("glass-0")}
              >
                <span className="text-4xl font-bold opacity-20 mb-2">0</span>
                <Badge variant="outline" className="mb-2 bg-black/20">Base / Recessed</Badge>
                <p className="text-xs text-muted-foreground mb-4">Minimal blur (4px)</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copied === "glass-0" ? "Copied!" : (
                    <>
                      <Copy className="w-3 h-3" /> Copy Class
                    </>
                  )}
                </Button>
              </div>
              <div className="px-2">
                <h3 className="font-bold text-foreground">Tier 0 (glass-0)</h3>
                <p className="text-sm text-muted-foreground">
                  Used for backgrounds, recessed panels, or secondary containers.
                </p>
              </div>
            </div>

            <div className="group space-y-4">
              <div
                className="glass-1 h-48 rounded-2xl flex flex-col items-center justify-center p-6 text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer border border-white/10"
                onClick={() => handleCopy("glass-1")}
              >
                <span className="text-4xl font-bold text-primary/40 mb-2">1</span>
                <Badge className="mb-2 bg-primary/20 text-primary border-primary/20 hover:bg-primary/30">
                  Standard
                </Badge>
                <p className="text-xs text-muted-foreground mb-4">Medium blur (8px)</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copied === "glass-1" ? "Copied!" : (
                    <>
                      <Copy className="w-3 h-3" /> Copy Class
                    </>
                  )}
                </Button>
              </div>
              <div className="px-2">
                <h3 className="font-bold text-foreground">Tier 1 (glass-1)</h3>
                <p className="text-sm text-muted-foreground">
                  The default surface for cards, panels, and main content.
                </p>
              </div>
            </div>

            <div className="group space-y-4">
              <div
                className="glass-2 h-48 rounded-2xl flex flex-col items-center justify-center p-6 text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer border border-white/20"
                onClick={() => handleCopy("glass-2")}
              >
                <span className="text-4xl font-bold text-accent/40 mb-2">2</span>
                <Badge className="mb-2 bg-white/20 text-white border-white/20 hover:bg-white/30">
                  Interactive
                </Badge>
                <p className="text-xs text-muted-foreground mb-4">High blur (16px)</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copied === "glass-2" ? "Copied!" : (
                    <>
                      <Copy className="w-3 h-3" /> Copy Class
                    </>
                  )}
                </Button>
              </div>
              <div className="px-2">
                <h3 className="font-bold text-foreground">Tier 2 (glass-2)</h3>
                <p className="text-sm text-muted-foreground">
                  For floating elements, modals, sticky headers, and hover states.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8 pt-12 border-t border-dashed border-white/5">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold font-heading">Shadow-based Surfaces</h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Specialized shadows provide depth where transparency isn't enough.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <ComponentSample
            title="Negative (Inset)"
            description="Creates a recessed feeling, perfect for inputs or wells."
          >
            <div className="w-full max-w-sm space-y-4">
              <div className="relative">
                <div className="shadow-negative bg-black/20 rounded-xl p-4 flex items-center gap-3 border border-white/5 group transition-colors focus-within:border-primary/50">
                  <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <span className="text-muted-foreground flex-1">Search documentation...</span>
                  <div className="text-xs bg-white/5 px-2 py-1 rounded text-muted-foreground">
                    ⌘K
                  </div>
                </div>
              </div>
              <div className="shadow-negative bg-black/20 rounded-xl p-4 border border-white/5">
                <p className="text-sm text-muted-foreground text-center">Recessed Panel Content</p>
              </div>
            </div>
          </ComponentSample>

          <ComponentSample
            title="Floating (Elevation)"
            description="High-elevation shadows for elements that sit 'above' the UI."
          >
            <div className="w-full h-full flex items-center justify-center py-6">
              <div className="shadow-floating bg-[#1a1a24] rounded-2xl p-4 flex items-center gap-4 border border-white/10 max-w-xs transform hover:-translate-y-1 transition-transform duration-300">
                <div className="p-3 bg-green-500/20 text-green-400 rounded-xl">
                  <Wifi className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Connection Restored</h4>
                  <p className="text-xs text-muted-foreground">Your changes are saved.</p>
                </div>
              </div>
            </div>
          </ComponentSample>
        </div>
      </section>

      <section className="space-y-8 pt-12 border-t border-dashed border-white/5">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold font-heading">Vibrant Aura Surfaces</h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Categories and brands are distinguished by their "Aura"—a combination of gradient glass
            and colored bloom.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {[
            { color: "blue", name: "Sky Aura" },
            { color: "green", name: "Forest Aura" },
            { color: "orange", name: "Solar Aura" },
            { color: "fuchsia", name: "Neon Aura" },
            { color: "pink", name: "Rose Aura" },
            { color: "purple", name: "Deep Aura" },
          ].map((aura) => (
            <div key={aura.color} className="space-y-3 group cursor-pointer">
              <Card
                className={`h-32 flex items-center justify-center border-0 glass-aura-${aura.color} transition-transform duration-300 group-hover:scale-105 group-hover:shadow-lg`}
              >
                <span className="font-bold text-lg text-white drop-shadow-md capitalize">
                  {aura.color}
                </span>
              </Card>
              <p className="text-sm font-semibold text-center text-muted-foreground group-hover:text-foreground transition-colors">
                {aura.name}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8 pt-12 border-t border-dashed border-white/5">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold font-heading">High-Fidelity Layers</h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Combining glass tiers and shadows for complex, realistic UI patterns.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <ComponentSample
            title="Settings Panel Example"
            description="A complex surface using glass-2, lists, and controls."
          >
            <Card variant="layers" className="w-full max-w-md mx-auto shadow-2xl">
              <CardHeader className="pb-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Notifications</CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-white">Push Notifications</label>
                    <p className="text-xs text-muted-foreground">Receive daily summaries</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-white">Sound Effects</label>
                    <p className="text-xs text-muted-foreground">Play sounds on action</p>
                  </div>
                  <Switch />
                </div>
                <Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10">
                  Manage Preferences
                </Button>
              </CardContent>
            </Card>
          </ComponentSample>

          <ComponentSample
            title="Visual Content Overlay"
            description="Using glass layers to caption and action rich media."
          >
            <div className="relative w-full max-w-md mx-auto aspect-video rounded-3xl overflow-hidden group shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-70 mix-blend-overlay hover:scale-105 transition-transform duration-700" />

              {/* Overlay Card */}
              <div className="absolute bottom-4 left-4 right-4 glass-2 rounded-xl p-4 flex items-center justify-between border border-white/20 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-white/20">
                    <AvatarImage src="/avatars/01.png" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400">
                      AR
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-white line-clamp-1">Abstract Waves</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/60">
                      Digital Art
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-glow-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </ComponentSample>
        </div>
      </section>

      <AccessibilityPanel
        notes={[
          "Glass surfaces use semi-transparent backgrounds with backdrop-filters; ensure fallback colors are set for browsers that don't support backdrop-filter.",
          "All glass tiers include a subtle border (glass-edge) for visual definition without high contrast lines, aiding users with low visual acuity.",
          "Text color must automatically adjust to remain readable over light or dark backgrounds.",
          "Backdrop-filter 'blur' is disabled on low-power devices to maintain performance.",
        ]}
      />
    </div>
  );
}

function Plus({ className }: { className?: string; }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function X({ className }: { className?: string; }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
