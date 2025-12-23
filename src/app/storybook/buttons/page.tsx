"use client";

import {
  AccessibilityPanel,
  ComponentSample,
  PageHeader,
  UsageGuide,
} from "@/components/storybook";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";

export default function ButtonsPage() {
  return (
    <div className="space-y-16 pb-20">
      <PageHeader
        title="Buttons"
        description="Buttons allow users to take actions, and make choices, with a single tap. They are one of the most used components in the spike.land design system."
        usage="Use buttons for primary actions like submitting forms, navigating between key areas, or triggering major functions."
      />

      <UsageGuide
        dos={[
          "Use the Primary variant for the most important action on a page.",
          "Keep labels short and action-oriented (e.g., 'Save', 'Enhance').",
          "Include icons only when they add clear functional value.",
          "Use Ghost buttons for secondary or tertiary low-priority actions.",
        ]}
        donts={[
          "Don't use more than one Primary button per view.",
          "Avoid using buttons for navigation items that look like text links.",
          "Don't change the border radius; buttons use a consistent XL (12px) rounding.",
          "Avoid placing Destructive buttons in positions where they can be clicked accidentally.",
        ]}
      />

      <ComponentSample
        title="Primary Button"
        description="The workhorse of our interface. Uses a vibrant cyan gradient and a subtle glow."
      >
        <div className="flex flex-wrap gap-6 items-center">
          <Button variant="default">Primary Action</Button>
          <Button variant="default" size="lg">Large Action</Button>
          <Button variant="default" className="shadow-glow-cyan">With Enhanced Glow</Button>
        </div>
      </ComponentSample>

      <section className="space-y-8">
        <h2 className="text-2xl font-bold font-heading">Style Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="glass-1">
            <CardContent className="pt-6 space-y-4">
              <Badge variant="outline">Default / Primary</Badge>
              <p className="text-sm text-muted-foreground">
                High emphasis, usually used once per screen.
              </p>
              <Button className="w-full">Get Started</Button>
            </CardContent>
          </Card>

          <Card className="glass-1">
            <CardContent className="pt-6 space-y-4">
              <Badge variant="outline">Secondary</Badge>
              <p className="text-sm text-muted-foreground">
                Medium emphasis for less critical actions.
              </p>
              <Button variant="secondary" className="w-full">Learn More</Button>
            </CardContent>
          </Card>

          <Card className="glass-1">
            <CardContent className="pt-6 space-y-4">
              <Badge variant="outline">Outline</Badge>
              <p className="text-sm text-muted-foreground">Low emphasis, subtle and clear.</p>
              <Button variant="outline" className="w-full">Settings</Button>
            </CardContent>
          </Card>

          <Card className="glass-1 border-destructive/20 bg-destructive/5">
            <CardContent className="pt-6 space-y-4">
              <Badge variant="destructive">Destructive</Badge>
              <p className="text-sm text-muted-foreground">
                Used for irreversible actions like deletion.
              </p>
              <Button variant="destructive" className="w-full">Delete Project</Button>
            </CardContent>
          </Card>

          <Card className="glass-1 border-success/20 bg-success/5">
            <CardContent className="pt-6 space-y-4">
              <Badge variant="success">Success</Badge>
              <p className="text-sm text-muted-foreground">
                Used for positive confirmation or saving.
              </p>
              <Button variant="success" className="w-full">Publish Changes</Button>
            </CardContent>
          </Card>

          <Card className="glass-1 border-warning/20 bg-warning/5">
            <CardContent className="pt-6 space-y-4">
              <Badge variant="warning">Warning</Badge>
              <p className="text-sm text-muted-foreground">
                Used for cautionary actions or low balance.
              </p>
              <Button variant="warning" className="w-full">Top Up Tokens</Button>
            </CardContent>
          </Card>

          <Card className="glass-1 border-white/5 bg-white/2">
            <CardContent className="pt-6 space-y-4">
              <Badge variant="outline">Ghost & Icon</Badge>
              <p className="text-sm text-muted-foreground">
                Toolbar or utility actions without visual clutter.
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <ComponentSample
        title="Interaction States"
        description="Buttons respond to user input with scale and color shifts. (Hover simulated for showcase)"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-3">
            <Button>Default</Button>
            <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              Normal
            </span>
          </div>
          <div className="space-y-3">
            <Button className="scale-[1.02] ring-2 ring-primary ring-offset-2 ring-offset-background">
              Hover
            </Button>
            <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              Hovered
            </span>
          </div>
          <div className="space-y-3">
            <Button className="scale-[0.96]">Pressed</Button>
            <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              Active
            </span>
          </div>
          <div className="space-y-3">
            <Button loading>Loading</Button>
            <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              Busy
            </span>
          </div>
        </div>
      </ComponentSample>

      <section className="space-y-8">
        <h2 className="text-2xl font-bold font-heading">Disabled State</h2>
        <p className="text-muted-foreground -mt-4">
          When a button is disabled, we remove color and apply a grayscale filter to indicate
          inactivity without hiding the element.
        </p>
        <div className="p-10 rounded-3xl border border-white/5 bg-black/20 flex flex-wrap gap-4 items-center justify-center">
          <Button disabled>Primary Disabled</Button>
          <Button variant="secondary" disabled>Secondary Disabled</Button>
          <Button variant="outline" disabled>Outline Disabled</Button>
          <Button variant="ghost" disabled size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <AccessibilityPanel
        notes={[
          "All buttons follow the 44px minimum touch target guideline.",
          "Visual focus ring is always visible when navigating via keyboard (primary cyan).",
          "Buttons include aria-busy when in loading state to alert screen readers.",
          "Contrast ratio for primary button text exceeds WCAG AA standards.",
          "Icons are decorative and hidden from screen readers unless label is empty.",
          "Focus management is handled automatically via Radix UI primitives.",
        ]}
      />
    </div>
  );
}
