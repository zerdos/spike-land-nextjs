"use client";

import { PixelLogo } from "@/components/brand";
import { ComparisonViewToggle } from "@/components/enhance/ComparisonViewToggle";
import { EnhancementSettings } from "@/components/enhance/EnhancementSettings";
import { ImageComparisonSlider } from "@/components/enhance/ImageComparisonSlider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// WCAG Contrast ratio calculator
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex: string): { r: number; g: number; b: number; } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 0;

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Demo component for Contrast Checker
function ContrastCheckerDemo() {
  const [foreground, setForeground] = useState("#FFFFFF");
  const [background, setBackground] = useState("#08081C");
  const ratio = getContrastRatio(foreground, background);
  const passAA = ratio >= 4.5;
  const passAALarge = ratio >= 3;
  const passAAA = ratio >= 7;
  const passAAALarge = ratio >= 4.5;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="foreground">Foreground Color</Label>
          <div className="flex gap-2">
            <Input
              id="foreground"
              type="text"
              value={foreground}
              onChange={(e) => setForeground(e.target.value)}
              placeholder="#FFFFFF"
              className="font-mono"
            />
            <input
              type="color"
              value={foreground}
              onChange={(e) => setForeground(e.target.value)}
              className="w-12 h-10 rounded-lg cursor-pointer border border-border"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="background">Background Color</Label>
          <div className="flex gap-2">
            <Input
              id="background"
              type="text"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="#08081C"
              className="font-mono"
            />
            <input
              type="color"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="w-12 h-10 rounded-lg cursor-pointer border border-border"
            />
          </div>
        </div>
      </div>

      <div
        className="p-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: background }}
      >
        <span className="text-2xl font-bold" style={{ color: foreground }}>
          Sample Text
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
          <span className="font-medium">Contrast Ratio</span>
          <span className="font-mono text-lg">{ratio.toFixed(2)}:1</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`p-3 rounded-lg border ${
              passAA ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">WCAG AA (Normal)</span>
              <Badge variant={passAA ? "default" : "destructive"}>{passAA ? "Pass" : "Fail"}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requires 4.5:1</p>
          </div>
          <div
            className={`p-3 rounded-lg border ${
              passAALarge ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">WCAG AA (Large)</span>
              <Badge variant={passAALarge ? "default" : "destructive"}>
                {passAALarge ? "Pass" : "Fail"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requires 3:1</p>
          </div>
          <div
            className={`p-3 rounded-lg border ${
              passAAA ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">WCAG AAA (Normal)</span>
              <Badge variant={passAAA ? "default" : "destructive"}>
                {passAAA ? "Pass" : "Fail"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requires 7:1</p>
          </div>
          <div
            className={`p-3 rounded-lg border ${
              passAAALarge ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">WCAG AAA (Large)</span>
              <Badge variant={passAAALarge ? "default" : "destructive"}>
                {passAAALarge ? "Pass" : "Fail"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requires 4.5:1</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Demo component for EnhancementSettings dialog showcase
function EnhancementSettingsDemo() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEnhance = async () => {
    setIsProcessing(true);
    // Simulate enhancement process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    toast.success("Enhancement completed!");
  };

  return (
    <EnhancementSettings
      onEnhance={handleEnhance}
      currentBalance={15}
      isProcessing={isProcessing}
      completedVersions={[]}
      imageUrl="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop"
      imageName="mountain_view.jpg"
      trigger={<Button>Open Enhancement Settings</Button>}
    />
  );
}

const colorPalette = {
  brand: [
    {
      name: "Pixel Cyan",
      var: "--pixel-cyan",
      hex: "#00E5FF",
      desc: "Primary brand accent colors",
      role: "Primary",
      contrastPass: true,
    },
    {
      name: "Pixel Fuchsia",
      var: "--pixel-fuchsia",
      hex: "#FF00FF",
      desc: "Secondary accent",
      role: "Secondary",
      contrastPass: true,
    },
  ],
  dark: [
    {
      name: "Surface Blue",
      var: "--surface-blue",
      hex: "#112244",
      desc: "Card backgrounds",
    },
    {
      name: "Border",
      var: "--border-dark",
      hex: "#221144",
      desc: "Primary borders",
    },
    {
      name: "Border Item",
      var: "--border-item",
      hex: "#222244",
      desc: "Item borders",
    },
    {
      name: "Deep Space",
      var: "--background",
      hex: "#08081C",
      desc: "Dark background",
    },
    {
      name: "Text Muted",
      var: "--muted-foreground",
      hex: "#A0A0C0",
      desc: "Secondary text",
    },
  ],
  light: [
    {
      name: "Clean White",
      var: "--background",
      hex: "#FFFFFF",
      desc: "Light background",
    },
    {
      name: "Light Surface",
      var: "--card",
      hex: "#F4F6F8",
      desc: "Light cards",
    },
    {
      name: "Carbon Text",
      var: "--foreground",
      hex: "#12121C",
      desc: "Primary text",
    },
    {
      name: "Grid Grey",
      var: "--border",
      hex: "#DCE0E8",
      desc: "Light borders",
    },
  ],
};

const logoSizes = ["sm", "md", "lg", "xl"] as const;
const logoVariants = ["icon", "horizontal", "stacked"] as const;
const buttonVariants = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;
const buttonSizes = ["sm", "default", "lg", "icon"] as const;

function ColorSwatch({
  name,
  hex,
  desc,
  role,
  contrastPass,
}: {
  name: string;
  hex: string;
  desc: string;
  role?: string;
  contrastPass?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border hover:bg-muted/50 transition-colors">
      <div
        className="w-16 h-16 rounded-xl border border-border shadow-sm flex-shrink-0"
        style={{ backgroundColor: hex }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-base">{name}</span>
          {role && <Badge variant="secondary" className="text-xs">{role}</Badge>}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-sm text-muted-foreground font-mono">{hex}</span>
          {contrastPass && (
            <Badge variant="outline" className="text-xs border-green-500 text-green-500">
              Contrast Pass (AA)
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">{desc}</div>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold font-heading">{title}</h2>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function StorybookPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08081C] via-[#0c1020] to-[#08081C]">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <div className="mb-6">
            <h1 className="text-5xl md:text-6xl font-bold font-heading mb-3 tracking-tight">
              Design System
            </h1>
            <p className="text-muted-foreground text-xl md:text-2xl">
              Pixel Brand Guidelines & Component Library
            </p>
          </div>
          <Separator />
        </div>

        <Tabs defaultValue="brand" className="space-y-8">
          <TabsList className="flex flex-wrap gap-0 h-auto bg-transparent p-0">
            {[
              { value: "brand", label: "Brand" },
              { value: "colors", label: "Colors" },
              { value: "typography", label: "Typography" },
              { value: "buttons", label: "Buttons" },
              { value: "components", label: "Components" },
              { value: "comparison", label: "Comparison" },
              { value: "feedback", label: "Feedback" },
              { value: "loading", label: "Loading" },
              { value: "modals", label: "Modals" },
              { value: "accessibility", label: "Accessibility" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative px-5 py-3 rounded-t-lg bg-transparent text-muted-foreground hover:text-foreground/80 transition-all duration-200 data-[state=active]:text-white data-[state=active]:bg-[#1a2744] data-[state=active]:border-b-[3px] data-[state=active]:border-primary data-[state=active]:shadow-[inset_0_-3px_0_0_hsl(var(--primary)),0_4px_12px_-2px_rgba(0,229,255,0.3)]"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Brand Tab */}
          <TabsContent value="brand" className="space-y-12">
            <Section
              title="Logo - The AI Spark"
              description="The Pixel logo represents transformation and digital magic. The 3x3 grid symbolizes a pixel array, with the glowing center representing AI enhancement."
            >
              {/* All Sizes */}
              <Card>
                <CardHeader>
                  <CardTitle>Sizes</CardTitle>
                  <CardDescription>
                    Available logo sizes for different contexts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-end gap-8">
                    {logoSizes.map((size) => (
                      <div
                        key={size}
                        className="flex flex-col items-center gap-2"
                      >
                        <PixelLogo size={size} />
                        <Badge variant="outline">{size}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* All Variants */}
              <Card>
                <CardHeader>
                  <CardTitle>Variants</CardTitle>
                  <CardDescription>
                    Different layout options for the logo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-[#112244] border border-[#221144]">
                      <PixelLogo size="lg" variant="icon" />
                      <Badge variant="outline">icon</Badge>
                    </div>
                    <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-gradient-to-r from-[#112244] to-[#221144] border border-[#2a2a4a]">
                      <PixelLogo size="lg" variant="horizontal" />
                      <Badge variant="outline">horizontal</Badge>
                    </div>
                    <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-[#112244] border border-[#FF00FF]/20">
                      <PixelLogo size="lg" variant="stacked" />
                      <Badge variant="outline">stacked</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Complete Matrix */}
              <Card>
                <CardHeader>
                  <CardTitle>Complete Matrix</CardTitle>
                  <CardDescription>
                    All size and variant combinations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="text-left p-2 text-sm font-medium text-muted-foreground">
                            Size / Variant
                          </th>
                          {logoVariants.map((variant) => (
                            <th
                              key={variant}
                              className="text-center p-2 text-sm font-medium text-muted-foreground"
                            >
                              {variant}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {logoSizes.map((size, sizeIndex) => (
                          <tr key={size} className="border-t border-border">
                            <td className="p-2 text-sm font-medium">{size}</td>
                            {logoVariants.map((variant) => (
                              <td
                                key={`${size}-${variant}`}
                                className="p-4 text-center"
                              >
                                <div
                                  className="inline-flex justify-center p-4 rounded-xl"
                                  style={{
                                    background: `linear-gradient(180deg, rgba(0, 229, 255, ${
                                      0.03 + sizeIndex * 0.04
                                    }) 0%, rgba(255, 0, 255, ${0.03 + sizeIndex * 0.04}) 100%)`,
                                  }}
                                >
                                  <PixelLogo size={size} variant={variant} />
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Icon Only */}
              <Card>
                <CardHeader>
                  <CardTitle>Icon Only (showText=false)</CardTitle>
                  <CardDescription>
                    Logo without wordmark for compact spaces
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-6">
                    {logoSizes.map((size) => (
                      <div
                        key={size}
                        className="flex flex-col items-center gap-2"
                      >
                        <PixelLogo size={size} showText={false} />
                        <Badge variant="outline">{size}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Section>
          </TabsContent>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-12">
            <Section
              title="Color Palette"
              description="Brand colors optimized for both light and dark modes"
            >
              {/* Brand Colors */}
              <Card>
                <CardHeader>
                  <CardTitle>Brand Colors</CardTitle>
                  <CardDescription>Primary brand accent colors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {colorPalette.brand.map((color) => <ColorSwatch key={color.name} {...color} />)}
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-[#00E5FF] flex items-center justify-center">
                      <span className="font-bold text-[#08081C]">Pixel Cyan</span>
                    </div>
                    <div className="p-4 rounded-lg bg-[#FF00FF] flex items-center justify-center">
                      <span className="font-bold text-white">Pixel Fuchsia</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dark Mode Colors */}
              <Card>
                <CardHeader>
                  <CardTitle>Dark Mode Palette</CardTitle>
                  <CardDescription>
                    Colors optimized for dark backgrounds
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {colorPalette.dark.map((color) => <ColorSwatch key={color.name} {...color} />)}
                  </div>
                </CardContent>
              </Card>

              {/* Light Mode Colors */}
              <Card>
                <CardHeader>
                  <CardTitle>Light Mode Palette</CardTitle>
                  <CardDescription>
                    Colors optimized for light backgrounds
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {colorPalette.light.map((color) => <ColorSwatch key={color.name} {...color} />)}
                  </div>
                </CardContent>
              </Card>

              {/* Glow Effects */}
              <Card>
                <CardHeader>
                  <CardTitle>Glow Effects</CardTitle>
                  <CardDescription>
                    Cyan glow utilities for emphasis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Button with glow */}
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground">Primary Button</Label>
                      <Button className="shadow-glow-cyan">Primary Button</Button>
                    </div>

                    {/* Input with glow */}
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground">Text Input</Label>
                      <Input
                        placeholder="Text Input"
                        className="input-glow-cyan"
                      />
                    </div>

                    {/* Fuchsia glow button */}
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground">Fuchsia Glow</Label>
                      <Button className="bg-[#FF00FF] hover:bg-[#FF00FF]/90 shadow-glow-fuchsia">
                        Fuchsia Button
                      </Button>
                    </div>

                    {/* Gradient glow */}
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground">Gradient Glow</Label>
                      <div className="h-10 rounded-xl gradient-cyan-fuchsia shadow-glow-gradient flex items-center justify-center">
                        <span className="text-white font-bold text-sm">Gradient</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Section>
          </TabsContent>

          {/* Typography Tab */}
          <TabsContent value="typography" className="space-y-12">
            <Section
              title="Typography"
              description="Font families and text styles"
            >
              {/* Font Families */}
              <Card>
                <CardHeader>
                  <CardTitle>Font Families</CardTitle>
                  <CardDescription>
                    Montserrat for headers, Geist for body
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Montserrat (Headers) - font-heading
                    </Label>
                    <p className="font-heading text-3xl font-bold">
                      The quick brown fox jumps over the lazy dog
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Geist Sans (Body) - font-sans
                    </Label>
                    <p className="font-sans text-lg">
                      The quick brown fox jumps over the lazy dog
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Geist Mono (Code) - font-mono
                    </Label>
                    <p className="font-mono text-lg">
                      const pixel = &quot;AI Enhancement&quot;;
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Heading Scale */}
              <Card>
                <CardHeader>
                  <CardTitle>Heading Scale</CardTitle>
                  <CardDescription>
                    All headings use Montserrat font
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Badge variant="outline" className="mb-1">h1</Badge>
                    <h1 className="text-4xl font-bold">Heading Level 1</h1>
                  </div>
                  <div className="space-y-1">
                    <Badge variant="outline" className="mb-1">h2</Badge>
                    <h2 className="text-3xl font-bold">Heading Level 2</h2>
                  </div>
                  <div className="space-y-1">
                    <Badge variant="outline" className="mb-1">h3</Badge>
                    <h3 className="text-2xl font-semibold">Heading Level 3</h3>
                  </div>
                  <div className="space-y-1">
                    <Badge variant="outline" className="mb-1">h4</Badge>
                    <h4 className="text-xl font-semibold">Heading Level 4</h4>
                  </div>
                  <div className="space-y-1">
                    <Badge variant="outline" className="mb-1">h5</Badge>
                    <h5 className="text-lg font-medium">Heading Level 5</h5>
                  </div>
                  <div className="space-y-1">
                    <Badge variant="outline" className="mb-1">h6</Badge>
                    <h6 className="text-base font-medium">Heading Level 6</h6>
                  </div>
                </CardContent>
              </Card>

              {/* Text Colors */}
              <Card>
                <CardHeader>
                  <CardTitle>Text Colors</CardTitle>
                  <CardDescription>Semantic text color classes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-foreground">
                    text-foreground - Primary text
                  </p>
                  <p className="text-muted-foreground">
                    text-muted-foreground - Secondary text
                  </p>
                  <p className="text-primary">
                    text-primary - Accent/link text
                  </p>
                  <p className="text-destructive">
                    text-destructive - Error text
                  </p>
                </CardContent>
              </Card>
            </Section>
          </TabsContent>

          {/* Buttons Tab */}
          <TabsContent value="buttons" className="space-y-12">
            <Section
              title="Buttons"
              description="Interactive button components with various styles"
            >
              {/* All Variants */}
              <Card>
                <CardHeader>
                  <CardTitle>Variants</CardTitle>
                  <CardDescription>
                    Different button styles for various contexts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    {buttonVariants.map((variant) => (
                      <Button key={variant} variant={variant}>
                        {variant}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* All Sizes */}
              <Card>
                <CardHeader>
                  <CardTitle>Sizes</CardTitle>
                  <CardDescription>Button size options</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4">
                    {buttonSizes.map((size) => (
                      <div
                        key={size}
                        className="flex flex-col items-center gap-2"
                      >
                        <Button size={size}>
                          {size === "icon" ? "+" : size}
                        </Button>
                        <Badge variant="outline">{size}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* States */}
              <Card>
                <CardHeader>
                  <CardTitle>States</CardTitle>
                  <CardDescription>Button interaction states</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Button>Default</Button>
                    <Button disabled>Disabled</Button>
                    <Button loading>Loading</Button>
                    <Button className="opacity-80">Hover (simulated)</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Loading States */}
              <Card>
                <CardHeader>
                  <CardTitle>Loading States</CardTitle>
                  <CardDescription>
                    Buttons with loading indicator for async operations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-wrap gap-4">
                    <Button loading>Default Loading</Button>
                    <Button loading variant="secondary">Secondary Loading</Button>
                    <Button loading variant="outline">Outline Loading</Button>
                    <Button loading variant="destructive">Destructive Loading</Button>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Loading with different sizes
                    </Label>
                    <div className="flex flex-wrap items-center gap-4">
                      <Button loading size="sm">Small</Button>
                      <Button loading size="default">Default</Button>
                      <Button loading size="lg">Large</Button>
                      <Button loading size="icon" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Complete Matrix */}
              <Card>
                <CardHeader>
                  <CardTitle>Complete Matrix</CardTitle>
                  <CardDescription>
                    All variant and size combinations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="text-left p-2 text-sm font-medium text-muted-foreground">
                            Variant / Size
                          </th>
                          {buttonSizes.filter((s) => s !== "icon").map((
                            size,
                          ) => (
                            <th
                              key={size}
                              className="text-center p-2 text-sm font-medium text-muted-foreground"
                            >
                              {size}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {buttonVariants.map((variant) => (
                          <tr key={variant} className="border-t border-border">
                            <td className="p-2 text-sm font-medium">
                              {variant}
                            </td>
                            {buttonSizes.filter((s) =>
                              s !== "icon"
                            ).map((
                              size,
                            ) => (
                              <td
                                key={`${variant}-${size}`}
                                className="p-3 text-center"
                              >
                                <Button variant={variant} size={size}>
                                  Button
                                </Button>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </Section>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-12">
            <Section
              title="Image Comparison"
              description="Before/after comparison components for showcasing image enhancements"
            >
              {/* Image Comparison Slider */}
              <Card>
                <CardHeader>
                  <CardTitle>Image Comparison Slider</CardTitle>
                  <CardDescription>
                    Drag the handle to compare original and enhanced images
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="max-w-2xl">
                    <ImageComparisonSlider
                      originalUrl="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=60"
                      enhancedUrl="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=90&sat=20"
                      originalLabel="Original"
                      enhancedLabel="Enhanced"
                      width={16}
                      height={9}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Different Aspect Ratios
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Badge variant="outline">16:9</Badge>
                        <ImageComparisonSlider
                          originalUrl="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=225&fit=crop&q=60"
                          enhancedUrl="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=225&fit=crop&q=90&sat=20"
                          width={16}
                          height={9}
                        />
                      </div>
                      <div className="space-y-2">
                        <Badge variant="outline">4:3</Badge>
                        <ImageComparisonSlider
                          originalUrl="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop&q=60"
                          enhancedUrl="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop&q=90&sat=20"
                          width={4}
                          height={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Badge variant="outline">1:1</Badge>
                        <ImageComparisonSlider
                          originalUrl="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=400&fit=crop&q=60"
                          enhancedUrl="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=400&fit=crop&q=90&sat=20"
                          width={1}
                          height={1}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comparison View Toggle */}
              <Card>
                <CardHeader>
                  <CardTitle>Comparison View Toggle</CardTitle>
                  <CardDescription>
                    Switch between different comparison modes: slider, side-by-side, or split view
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-w-3xl">
                    <ComparisonViewToggle
                      originalUrl="https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&h=400&fit=crop&q=60"
                      enhancedUrl="https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&h=400&fit=crop&q=90&sat=20"
                      width={16}
                      height={9}
                      defaultMode="slider"
                    />
                  </div>
                </CardContent>
              </Card>
            </Section>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-12">
            <Section
              title="Feedback Components"
              description="Toast notifications and alert components for user feedback"
            >
              {/* Toast Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle>Toast Notifications</CardTitle>
                  <CardDescription>
                    Click the buttons to see different toast variants
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Button
                      variant="outline"
                      onClick={() => toast.success("Enhancement completed successfully!")}
                    >
                      Success Toast
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => toast.error("Failed to process image")}
                    >
                      Error Toast
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => toast.info("Processing started in background")}
                    >
                      Info Toast
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => toast.warning("Low token balance")}
                    >
                      Warning Toast
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        toast("Default toast", {
                          description: "This is a default toast with description",
                        })}
                    >
                      Default Toast
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Semantic Colors */}
              <Card>
                <CardHeader>
                  <CardTitle>Semantic State Colors</CardTitle>
                  <CardDescription>
                    Color utilities for success, warning, and error states
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-success border border-success">
                      <p className="text-success font-medium">Success State</p>
                      <p className="text-sm text-muted-foreground">
                        bg-success, border-success
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-warning border border-warning">
                      <p className="text-warning font-medium">Warning State</p>
                      <p className="text-sm text-muted-foreground">
                        bg-warning, border-warning
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive">
                      <p className="text-destructive font-medium">
                        Error State
                      </p>
                      <p className="text-sm text-muted-foreground">
                        bg-destructive/10
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Section>
          </TabsContent>

          {/* Loading Tab */}
          <TabsContent value="loading" className="space-y-12">
            <Section
              title="Loading States"
              description="Skeleton loaders, progress bars, and spinners"
            >
              {/* Skeleton Loaders */}
              <Card>
                <CardHeader>
                  <CardTitle>Skeleton Loaders</CardTitle>
                  <CardDescription>
                    Placeholder components for loading states
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Default Skeleton
                    </Label>
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Shimmer Variant
                    </Label>
                    <div className="flex items-center space-x-4">
                      <Skeleton
                        variant="shimmer"
                        className="h-12 w-12 rounded-full"
                      />
                      <div className="space-y-2">
                        <Skeleton variant="shimmer" className="h-4 w-[250px]" />
                        <Skeleton variant="shimmer" className="h-4 w-[200px]" />
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Card Skeleton
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i}>
                          <CardContent className="pt-6 space-y-3">
                            <Skeleton
                              variant="shimmer"
                              className="h-32 w-full rounded-lg"
                            />
                            <Skeleton variant="shimmer" className="h-4 w-3/4" />
                            <Skeleton variant="shimmer" className="h-4 w-1/2" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Progress Bars */}
              <Card>
                <CardHeader>
                  <CardTitle>Progress Bars</CardTitle>
                  <CardDescription>
                    Progress indicators with optional glow effect
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Default Progress (33%)</Label>
                      <span className="text-muted-foreground">33%</span>
                    </div>
                    <Progress value={33} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Progress with Glow (66%)</Label>
                      <span className="text-muted-foreground">66%</span>
                    </div>
                    <Progress value={66} glow />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Complete (100%)</Label>
                      <span className="text-muted-foreground">100%</span>
                    </div>
                    <Progress value={100} glow />
                  </div>
                </CardContent>
              </Card>

              {/* Spinners */}
              <Card>
                <CardHeader>
                  <CardTitle>Spinners & Animations</CardTitle>
                  <CardDescription>
                    Loading indicators and pulse animations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-8 items-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Spinner
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-primary animate-pulse-cyan" />
                      <span className="text-xs text-muted-foreground">
                        Pulse Cyan
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs text-muted-foreground">
                        Pulse
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Section>
          </TabsContent>

          {/* Modals Tab */}
          <TabsContent value="modals" className="space-y-12">
            <Section
              title="Modal Components"
              description="Dialog, sheet, and alert dialog components"
            >
              {/* Enhancement Settings Dialog */}
              <Card>
                <CardHeader>
                  <CardTitle>Enhancement Settings Dialog</CardTitle>
                  <CardDescription>
                    Modal dialog with card-based tier selection for image enhancement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EnhancementSettingsDemo />
                </CardContent>
              </Card>

              {/* Sheet */}
              <Card>
                <CardHeader>
                  <CardTitle>Sheet</CardTitle>
                  <CardDescription>
                    Slide-out panel for navigation or settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline">Open Sheet (Right)</Button>
                      </SheetTrigger>
                      <SheetContent>
                        <SheetHeader>
                          <SheetTitle>Settings</SheetTitle>
                          <SheetDescription>
                            Manage your account settings.
                          </SheetDescription>
                        </SheetHeader>
                        <div className="py-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <Label>Dark Mode</Label>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label>Notifications</Label>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                </CardContent>
              </Card>

              {/* Alert Dialog */}
              <Card>
                <CardHeader>
                  <CardTitle>Alert Dialog</CardTitle>
                  <CardDescription>
                    Confirmation dialog for destructive actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Delete Image</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the image and
                          all its enhanced versions.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </Section>
          </TabsContent>

          {/* Components Tab */}
          <TabsContent value="components" className="space-y-12">
            <Section
              title="Components"
              description="UI component library showcase"
            >
              {/* Cards */}
              <Card>
                <CardHeader>
                  <CardTitle>Cards</CardTitle>
                  <CardDescription>
                    Container components with glass-morphism
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Default Card</CardTitle>
                        <CardDescription>
                          Standard card component
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Card content goes here with proper padding.
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-primary">
                      <CardHeader>
                        <CardTitle>Highlighted Card</CardTitle>
                        <CardDescription>With primary border</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Emphasized card for important content.
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle>Dashed Card</CardTitle>
                        <CardDescription>For empty states</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Used for upload areas or placeholders.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Badges */}
              <Card>
                <CardHeader>
                  <CardTitle>Badges</CardTitle>
                  <CardDescription>Small status indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Inputs */}
              <Card>
                <CardHeader>
                  <CardTitle>Form Elements</CardTitle>
                  <CardDescription>
                    Input fields and form controls
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="input-default">Default Input</Label>
                      <Input id="input-default" placeholder="Enter text..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="input-disabled">Disabled Input</Label>
                      <Input
                        id="input-disabled"
                        placeholder="Disabled"
                        disabled
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Checkboxes</Label>
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="check-1" />
                        <Label htmlFor="check-1">Option 1</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="check-2" defaultChecked />
                        <Label htmlFor="check-2">Option 2 (checked)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="check-3" disabled />
                        <Label htmlFor="check-3">Disabled</Label>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Radio Group</Label>
                    <RadioGroup defaultValue="option-1">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="option-1" id="radio-1" />
                        <Label htmlFor="radio-1">Standard Enhancement</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="option-2" id="radio-2" />
                        <Label htmlFor="radio-2">Pro Enhancement</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="option-3" id="radio-3" />
                        <Label htmlFor="radio-3">Max Enhancement</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">
                      Select / Dropdown
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select enhancement tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="max">Max</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Disabled select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Option 1</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center space-x-2">
                    <Switch id="switch-demo" />
                    <Label htmlFor="switch-demo">Toggle switch</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Separators */}
              <Card>
                <CardHeader>
                  <CardTitle>Separators</CardTitle>
                  <CardDescription>
                    Visual dividers for content sections
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Content above separator
                  </p>
                  <Separator />
                  <p className="text-sm text-muted-foreground">
                    Content below separator
                  </p>
                </CardContent>
              </Card>
            </Section>
          </TabsContent>

          {/* Accessibility Tab */}
          <TabsContent value="accessibility" className="space-y-12">
            <Section
              title="Accessibility Tools"
              description="Tools and guidelines for ensuring accessible components"
            >
              {/* Contrast Checker */}
              <Card>
                <CardHeader>
                  <CardTitle>Color Contrast Checker</CardTitle>
                  <CardDescription>
                    Test color combinations against WCAG 2.1 guidelines
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ContrastCheckerDemo />
                </CardContent>
              </Card>

              {/* Keyboard Navigation */}
              <Card>
                <CardHeader>
                  <CardTitle>Keyboard Navigation</CardTitle>
                  <CardDescription>
                    Expected keyboard behavior for interactive components
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <Badge variant="outline" className="font-mono">Tab</Badge>
                      <span className="text-sm">Move focus to next interactive element</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <Badge variant="outline" className="font-mono">Shift + Tab</Badge>
                      <span className="text-sm">Move focus to previous interactive element</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <Badge variant="outline" className="font-mono">Enter / Space</Badge>
                      <span className="text-sm">Activate buttons, links, and form controls</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <Badge variant="outline" className="font-mono">Escape</Badge>
                      <span className="text-sm">Close modals, dialogs, and dropdowns</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <Badge variant="outline" className="font-mono">Arrow Keys</Badge>
                      <span className="text-sm">
                        Navigate within tabs, radio groups, and sliders
                      </span>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Test Area</Label>
                    <p className="text-sm text-muted-foreground">
                      Try navigating through these elements using only your keyboard:
                    </p>
                    <div className="flex flex-wrap gap-3 mt-3">
                      <Button>Button 1</Button>
                      <Button variant="outline">Button 2</Button>
                      <Button variant="secondary">Button 3</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ARIA Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle>ARIA Attributes</CardTitle>
                  <CardDescription>
                    Key ARIA attributes used in our components
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-border space-y-2">
                      <Badge variant="outline" className="font-mono text-xs">aria-label</Badge>
                      <p className="text-sm text-muted-foreground">
                        Provides accessible name for elements without visible text
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border space-y-2">
                      <Badge variant="outline" className="font-mono text-xs">aria-busy</Badge>
                      <p className="text-sm text-muted-foreground">
                        Indicates an element is being modified (e.g., loading button)
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border space-y-2">
                      <Badge variant="outline" className="font-mono text-xs">aria-expanded</Badge>
                      <p className="text-sm text-muted-foreground">
                        Indicates whether an accordion or dropdown is open
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border space-y-2">
                      <Badge variant="outline" className="font-mono text-xs">aria-hidden</Badge>
                      <p className="text-sm text-muted-foreground">
                        Hides decorative content from screen readers
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Animation Tokens */}
              <Card>
                <CardHeader>
                  <CardTitle>Animation Tokens</CardTitle>
                  <CardDescription>
                    CSS custom properties for consistent animation durations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-mono text-xs">
                          --animation-fast
                        </Badge>
                        <span className="font-mono text-sm">150ms</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Quick transitions: tooltips, hovers
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-mono text-xs">
                          --animation-normal
                        </Badge>
                        <span className="font-mono text-sm">200ms</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Standard: buttons, cards
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-mono text-xs">
                          --animation-slow
                        </Badge>
                        <span className="font-mono text-sm">300ms</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Longer: modals, accordions
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm">
                      <span className="font-medium">Note:</span> All animations respect{" "}
                      <code className="font-mono text-xs bg-background px-1.5 py-0.5 rounded">
                        prefers-reduced-motion
                      </code>{" "}
                      to ensure accessibility for users who are sensitive to motion.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Section>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>Pixel Design System v1.0</p>
          <p className="mt-1">Part of the Spike Land Platform</p>
        </div>
      </div>
    </div>
  );
}
