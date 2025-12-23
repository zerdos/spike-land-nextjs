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
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

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

      {/* Surface System */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold font-heading">Surface System</h2>
        <p className="text-muted-foreground -mt-4">
          Our elevation system uses glass-morphism tiers to create visual hierarchy and depth.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="glass-0">
            <CardContent className="pt-6 space-y-2 text-center">
              <Badge variant="outline" className="mb-2">Tier 0: Base</Badge>
              <p className="text-xs text-muted-foreground">
                Minimal blur. Used for nested items or subtle backgrounds.
              </p>
            </CardContent>
          </Card>
          <Card className="glass-1">
            <CardContent className="pt-6 space-y-2 text-center">
              <Badge variant="outline" className="mb-2 border-primary/30 text-primary">
                Tier 1: Standard
              </Badge>
              <p className="text-xs text-muted-foreground">
                Medium blur. The default surface for most cards and panels.
              </p>
            </CardContent>
          </Card>
          <Card className="glass-2">
            <CardContent className="pt-6 space-y-2 text-center">
              <Badge variant="outline" className="mb-2 border-accent/30 text-accent">
                Tier 2: Interactive
              </Badge>
              <p className="text-xs text-muted-foreground">
                High blur. Used for overlays, modals, and hovering elements.
              </p>
            </CardContent>
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
