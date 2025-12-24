"use client";

import {
  AccessibilityPanel,
  ComponentSample,
  PageHeader,
  UsageGuide,
} from "@/components/storybook";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Instagram,
  Layers,
  MessageSquare,
  Music4,
  Twitter,
} from "lucide-react";

export default function ComponentsPage() {
  return (
    <div className="space-y-20 pb-20">
      <PageHeader
        title="UI Components"
        description="A collection of atomic and molecular elements that form the building blocks of the spike.land interface. Every component is crafted with optical physics and accessibility in mind."
        usage="Use these components to build consistent, high-fidelity interfaces. Prefer these pre-built elements over custom CSS whenever possible to ensure system-wide consistency."
      />

      <UsageGuide
        dos={[
          "Use the XL border-radius (12px) for most containers to maintain brand identity.",
          "Apply the appropriate glass-tier (0, 1, or 2) based on content depth.",
          "Ensure all interactive elements have visible focus states.",
          "Use semantic colors (success, warning, destructive) sparingly for meaningful alerts.",
        ]}
        donts={[
          "Avoid nesting glass containers of the same tier to prevent visual muddiness.",
          "Don't use Primary Cyan for text unless it's a critical label with high contrast requirements.",
          "Avoid small touch targets (< 44px) for interactive elements on mobile.",
          "Don't drop opacity below 50% for disabled states; use grayscale and desaturation instead.",
        ]}
      />

      {/* Card Variants */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold font-heading">Card Variants</h2>
        <p className="text-muted-foreground -mt-4">
          Beyond glass-morphism, we use specialized card styles for specific contexts.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card variant="default">
            <CardContent className="pt-6 text-center">
              <Badge className="mb-2">Default</Badge>
              <p className="text-xs text-muted-foreground">Standard glass-1 with hover effects.</p>
            </CardContent>
          </Card>
          <Card variant="solid">
            <CardContent className="pt-6 text-center">
              <Badge variant="secondary" className="mb-2">Solid</Badge>
              <p className="text-xs text-muted-foreground">High-contrast opaque background.</p>
            </CardContent>
          </Card>
          <Card variant="dashed">
            <CardContent className="pt-6 text-center">
              <Badge variant="outline" className="mb-2">Dashed</Badge>
              <p className="text-xs text-muted-foreground">Placeholders or secondary actions.</p>
            </CardContent>
          </Card>
          <Card variant="highlighted">
            <CardContent className="pt-6 text-center">
              <Badge variant="outline" className="mb-2 border-primary/30 text-primary">
                Highlighted
              </Badge>
              <p className="text-xs text-muted-foreground">
                Attention-grabbing with persistent glow.
              </p>
            </CardContent>
          </Card>
          <Card variant="negative">
            <CardContent className="pt-6 text-center">
              <Badge variant="outline" className="mb-2 border-slate-400 text-slate-600">
                Negative
              </Badge>
              <p className="text-xs text-slate-500 font-medium font-mono uppercase tracking-tighter">
                Inset Shadows
              </p>
            </CardContent>
          </Card>
          <Card variant="floating" className="transition-all">
            <CardContent className="pt-6 text-center">
              <Badge variant="outline" className="mb-2 border-indigo-500/30 text-indigo-400">
                Floating
              </Badge>
              <p className="text-xs text-muted-foreground">
                Extreme depth with multi-layered shadows.
              </p>
            </CardContent>
          </Card>
          <Card variant="magic" className="transition-all">
            <CardContent className="pt-6 py-10 text-center space-y-3">
              <Badge variant="outline" className="border-primary/40 text-primary shadow-glow-cyan">
                Magic
              </Badge>
              <div className="space-y-1">
                <p className="text-2xl font-black font-heading">#14</p>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40">
                  by Spike Land
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground max-w-[140px] mx-auto leading-relaxed">
                Ultra-elevated "Stripe-style" depth optimized for dark mode.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-8 pt-10 border-t border-white/5">
        <h2 className="text-3xl font-bold font-heading">Vibrant Cards</h2>
        <p className="text-muted-foreground -mt-4">
          Integrated colors for high-energy layouts and semantic grouping.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card variant="blue" className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                <Twitter className="w-5 h-5 text-white" />
              </div>
              <Badge variant="outline" className="text-white border-white/30">Connect</Badge>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Twitter</p>
              <p className="text-xs text-white/60">@spike.land</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              Follow
            </Button>
          </Card>

          <Card variant="green" className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                <Music4 className="w-5 h-5 text-white" />
              </div>
              <Badge variant="outline" className="text-white border-white/30">Live Now</Badge>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Listening to...</p>
              <p className="text-xs text-white/60">Midnight City - M83</p>
            </div>
            <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white w-2/3" />
            </div>
          </Card>

          <Card variant="pink" className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                <Instagram className="w-5 h-5 text-white" />
              </div>
              <Badge variant="outline" className="text-white border-white/30">News</Badge>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Dribbble.com</p>
              <p className="text-xs text-white/60">Pixel-Perfect Design</p>
            </div>
            <div className="flex -space-x-1">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-pink-500/50 bg-white/10"
                />
              ))}
            </div>
          </Card>

          <Card variant="layers" className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/40 hover:text-white"
              >
                <Info className="w-4 h-4" />
              </Button>
            </div>
            <div>
              <p className="text-sm font-bold text-white">vqw07's layers.</p>
              <p className="text-xs text-white/40">layers.to</p>
            </div>
            <div className="aspect-video bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg flex items-center justify-center border border-white/5">
              <p className="text-[10px] font-black text-white/10 uppercase tracking-widest">
                Portfolio
              </p>
            </div>
          </Card>

          <Card variant="fuchsia" className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                <Instagram className="w-5 h-5 text-white" />
              </div>
              <Badge variant="outline" className="text-white border-white/30">Gallery</Badge>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Instagram</p>
              <p className="text-xs text-white/60">@spike_ai</p>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[1, 2, 3].map(i => <div key={i} className="aspect-square bg-white/20 rounded" />)}
            </div>
          </Card>

          <Card variant="orange" className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Substack.com</p>
              <p className="text-xs text-white/60">The AI Spark Newsletter</p>
            </div>
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full border border-white/20 bg-white/10" />
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Inputs & Controls */}
      <section className="space-y-8 pt-10 border-t border-white/5">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold font-heading">Inputs & Controls</h2>
          <p className="text-muted-foreground">
            Forms are the heart of our data collection systems.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-10">
            <ComponentSample
              title="Text Input"
              description="Integrated glass-input with focus glow."
            >
              <div className="w-full max-w-sm space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="demo-input">Email Address</Label>
                  <Input id="demo-input" placeholder="e.g. user@spike.land" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-input-err" className="text-destructive">Error State</Label>
                  <Input id="demo-input-err" variant="error" defaultValue="invalid-email" />
                  <p className="text-[10px] text-destructive font-medium uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Please enter a valid email.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-input-success" className="text-success">Success State</Label>
                  <Input id="demo-input-success" variant="success" defaultValue="crypton_spike" />
                </div>
              </div>
            </ComponentSample>

            <ComponentSample
              title="Textarea"
              description="Multi-line glass input with auto-expanding capability."
            >
              <div className="w-full max-w-sm space-y-2">
                <Label>Prompt Instructions</Label>
                <Textarea placeholder="Describe your enhancement goals..." />
              </div>
            </ComponentSample>
          </div>

          <div className="space-y-10">
            <ComponentSample title="Selections" description="Checkbox, Radio, and Switch controls.">
              <div className="w-full max-w-sm space-y-8">
                <div className="flex flex-wrap gap-8">
                  <div className="flex items-center space-x-3">
                    <Checkbox id="c1" defaultChecked />
                    <Label htmlFor="c1">Active</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Switch id="s1" defaultChecked />
                    <Label htmlFor="s1">Enable GPU</Label>
                  </div>
                </div>

                <Separator className="opacity-10" />

                <RadioGroup defaultValue="option-1">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="option-1" id="r1" />
                    <Label htmlFor="r1">Standard Enhancement</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="option-2" id="r2" />
                    <Label htmlFor="r2">Pro (2 Tokens)</Label>
                  </div>
                </RadioGroup>

                <div className="space-y-2 pt-2">
                  <Label>Platform Tier</Label>
                  <Select defaultValue="hobby">
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Select a tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hobby">Hobby (Free)</SelectItem>
                      <SelectItem value="pro">Professional ($19/mo)</SelectItem>
                      <SelectItem value="team">Team ($99/mo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ComponentSample>

            <ComponentSample
              title="Range Selection"
              description="Smooth sliders for precise control."
            >
              <div className="w-full max-w-sm space-y-6">
                <div className="flex justify-between items-end">
                  <Label className="uppercase text-[10px] tracking-widest font-black opacity-60">
                    Quality Factor
                  </Label>
                  <span className="text-xl font-black font-heading text-primary">85%</span>
                </div>
                <Slider defaultValue={[85]} max={100} step={1} />
              </div>
            </ComponentSample>
          </div>
        </div>
      </section>

      {/* Progress & Status */}
      <section className="space-y-8 pt-10 border-t border-white/5">
        <h2 className="text-3xl font-bold font-heading">Progress & Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <ComponentSample
            title="Basic Progress"
            description="Standard loading state with brand primary color."
          >
            <div className="w-full space-y-4">
              <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest opacity-60">
                <span>Task Progress</span>
                <span>65%</span>
              </div>
              <Progress value={65} glow />
            </div>
          </ComponentSample>

          <ComponentSample
            title="Semantic States"
            description="Progress bars reflecting system health or task outcome."
          >
            <div className="w-full space-y-6">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase font-bold text-success tracking-widest">
                  <span>Optimization Complete</span>
                  <span>100%</span>
                </div>
                <Progress value={100} variant="success" />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase font-bold text-warning tracking-widest">
                  <span>Buffering Stream</span>
                  <span>42%</span>
                </div>
                <Progress value={42} variant="warning" />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase font-bold text-destructive tracking-widest">
                  <span>Storage Critical</span>
                  <span>98%</span>
                </div>
                <Progress value={98} variant="destructive" />
              </div>
            </div>
          </ComponentSample>
        </div>
      </section>

      {/* Semantic Messaging */}
      <section className="space-y-8 pt-10 border-t border-white/5">
        <h2 className="text-3xl font-bold font-heading">Semantic Messaging</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>System Update</AlertTitle>
              <AlertDescription>
                A new version of the engine is available for download.
              </AlertDescription>
            </Alert>

            <Alert variant="success">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Deployment Success</AlertTitle>
              <AlertDescription>
                Your creative workflow has been synchronized to the cloud.
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-4">
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Low Credit Warning</AlertTitle>
              <AlertDescription>
                You have less than 50 tokens remaining in your account.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Critical Failure</AlertTitle>
              <AlertDescription>
                The AI model failed to initialize. Please check your connection.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </section>

      {/* Navigation & Layout */}
      <section className="space-y-8 pt-10 border-t border-white/5">
        <h2 className="text-3xl font-bold font-heading">Navigation & Layout</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <ComponentSample
            title="Tabs"
            description="Clean tabbed navigation with animated transitions."
          >
            <Tabs defaultValue="v1" className="w-full max-w-md">
              <TabsList className="grid w-full grid-cols-2 glass-0 p-1">
                <TabsTrigger value="v1">Overview</TabsTrigger>
                <TabsTrigger value="v2">Advanced</TabsTrigger>
              </TabsList>
              <TabsContent
                value="v1"
                className="p-6 bg-white/5 rounded-2xl mt-4 border border-white/5"
              >
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Basic platform features and quick settings.
                </p>
              </TabsContent>
              <TabsContent
                value="v2"
                className="p-6 bg-white/5 rounded-2xl mt-4 border border-white/5"
              >
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Fine-grained control over AI parameters.
                </p>
              </TabsContent>
            </Tabs>
          </ComponentSample>

          <ComponentSample
            title="Accordion"
            description="Collapsible sections for dense information."
          >
            <Accordion type="single" collapsible className="w-full max-w-md">
              <AccordionItem value="item-1" className="border-white/5">
                <AccordionTrigger className="hover:text-primary">
                  System Requirements
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  SPIKE LAND works on all modern browsers with WebGL support enabled.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2" className="border-white/5">
                <AccordionTrigger className="hover:text-primary">API Availability</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  Public API access is currently in closed beta for Enterprise partners.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ComponentSample>
        </div>
      </section>

      {/* Indicators */}
      <section className="space-y-8 pt-10 border-t border-white/5">
        <h2 className="text-3xl font-bold font-heading">Indicators & Tooltips</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <ComponentSample title="Badges" description="Small status or tag indicators.">
            <div className="flex flex-wrap gap-3">
              <Badge>Active</Badge>
              <Badge variant="secondary">In Progress</Badge>
              <Badge variant="success">Completed</Badge>
              <Badge variant="warning">Low Tokens</Badge>
              <Badge variant="outline">Verified</Badge>
              <Badge variant="destructive" className="animate-pulse">Critical Error</Badge>
            </div>
          </ComponentSample>

          <ComponentSample title="Tooltips" description="Contextual info on hover.">
            <TooltipProvider>
              <div className="flex gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full">?</Button>
                  </TooltipTrigger>
                  <TooltipContent className="glass-2 border-primary/20">
                    <p>Helpful information here</p>
                  </TooltipContent>
                </Tooltip>
                <div className="flex items-center gap-2 p-2 px-4 rounded-full bg-white/5 border border-white/10">
                  <span className="text-xs text-muted-foreground">Privacy Mode</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-primary cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Your data is encrypted</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipProvider>
          </ComponentSample>
        </div>
      </section>

      <AccessibilityPanel
        notes={[
          "Form labels are properly associated using htmlFor and id.",
          "Inputs use aria-invalid for error states.",
          "Tooltips are accessible via keyboard tab focus.",
          "Accordion headers use appropriate heading levels and ARIA tags.",
          "Color contrast for all status badges exceeds 4.5:1 ratio.",
          "Focus management for tabs follows the standard WAI-ARIA pattern.",
        ]}
      />
    </div>
  );
}
