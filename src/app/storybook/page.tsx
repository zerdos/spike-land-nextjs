"use client";

import { PixelLogo } from "@/components/brand";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const colorPalette = {
  brand: [
    { name: "Pixel Cyan", var: "--pixel-cyan", hex: "#00E5FF", desc: "Primary accent" },
  ],
  dark: [
    { name: "Deep Space", var: "--background", hex: "#08081C", desc: "Dark background" },
    { name: "Surface Blue", var: "--card", hex: "#151530", desc: "Dark cards/surfaces" },
    { name: "Text Muted", var: "--muted-foreground", hex: "#A0A0C0", desc: "Secondary text" },
    { name: "Border", var: "--border", hex: "#2A2A4A", desc: "Dark borders" },
  ],
  light: [
    { name: "Clean White", var: "--background", hex: "#FFFFFF", desc: "Light background" },
    { name: "Light Surface", var: "--card", hex: "#F4F6F8", desc: "Light cards" },
    { name: "Carbon Text", var: "--foreground", hex: "#12121C", desc: "Primary text" },
    { name: "Grid Grey", var: "--border", hex: "#DCE0E8", desc: "Light borders" },
  ],
};

const logoSizes = ["sm", "md", "lg", "xl"] as const;
const logoVariants = ["icon", "horizontal", "stacked"] as const;
const buttonVariants = ["default", "secondary", "outline", "ghost", "destructive", "link"] as const;
const buttonSizes = ["sm", "default", "lg", "icon"] as const;

function ColorSwatch({
  name,
  hex,
  desc,
}: {
  name: string;
  hex: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div
        className="w-12 h-12 rounded-lg border border-border shadow-sm flex-shrink-0"
        style={{ backgroundColor: hex }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{name}</div>
        <div className="text-xs text-muted-foreground font-mono">{hex}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
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
    <div className="min-h-screen">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <div className="mb-6">
            <h1 className="text-4xl font-bold font-heading mb-2">Design System</h1>
            <p className="text-muted-foreground text-lg">
              Pixel Brand Guidelines & Component Library
            </p>
          </div>
          <Separator />
        </div>

        <Tabs defaultValue="brand" className="space-y-8">
          <TabsList className="flex flex-wrap gap-1 h-auto lg:inline-flex">
            <TabsTrigger value="brand">Brand</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="typography">Typography</TabsTrigger>
            <TabsTrigger value="buttons">Buttons</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="loading">Loading</TabsTrigger>
            <TabsTrigger value="modals">Modals</TabsTrigger>
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
                  <CardDescription>Available logo sizes for different contexts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-end gap-8">
                    {logoSizes.map((size) => (
                      <div key={size} className="flex flex-col items-center gap-2">
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
                  <CardDescription>Different layout options for the logo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {logoVariants.map((variant) => (
                      <div
                        key={variant}
                        className="flex flex-col items-center gap-4 p-6 rounded-lg border border-border"
                      >
                        <PixelLogo size="lg" variant={variant} />
                        <Badge variant="outline">{variant}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Complete Matrix */}
              <Card>
                <CardHeader>
                  <CardTitle>Complete Matrix</CardTitle>
                  <CardDescription>All size and variant combinations</CardDescription>
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
                        {logoSizes.map((size) => (
                          <tr key={size} className="border-t border-border">
                            <td className="p-2 text-sm font-medium">{size}</td>
                            {logoVariants.map((variant) => (
                              <td key={`${size}-${variant}`} className="p-4 text-center">
                                <div className="inline-flex justify-center">
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
                  <CardDescription>Logo without wordmark for compact spaces</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-6">
                    {logoSizes.map((size) => (
                      <div key={size} className="flex flex-col items-center gap-2">
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
                  <div className="mt-6 p-4 rounded-lg bg-[#00E5FF] flex items-center justify-center">
                    <span className="font-bold text-[#08081C]">
                      Pixel Cyan with Dark Text
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Dark Mode Colors */}
              <Card>
                <CardHeader>
                  <CardTitle>Dark Mode Palette</CardTitle>
                  <CardDescription>Colors optimized for dark backgrounds</CardDescription>
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
                  <CardDescription>Colors optimized for light backgrounds</CardDescription>
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
                  <CardDescription>Cyan glow utilities for emphasis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-6 items-center">
                    <div className="w-24 h-24 rounded-xl bg-primary shadow-glow-cyan flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-xs">glow-cyan</span>
                    </div>
                    <div className="w-24 h-24 rounded-xl bg-primary shadow-glow-cyan-sm flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-xs">
                        glow-cyan-sm
                      </span>
                    </div>
                    <div className="w-24 h-24 rounded-xl bg-primary shadow-glow-primary flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-xs">
                        glow-primary
                      </span>
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
                  <CardDescription>Montserrat for headers, Geist for body</CardDescription>
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
                  <CardDescription>All headings use Montserrat font</CardDescription>
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
                  <p className="text-foreground">text-foreground - Primary text</p>
                  <p className="text-muted-foreground">text-muted-foreground - Secondary text</p>
                  <p className="text-primary">text-primary - Accent/link text</p>
                  <p className="text-destructive">text-destructive - Error text</p>
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
                  <CardDescription>Different button styles for various contexts</CardDescription>
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
                      <div key={size} className="flex flex-col items-center gap-2">
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
                    <Button className="opacity-80">Hover (simulated)</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Complete Matrix */}
              <Card>
                <CardHeader>
                  <CardTitle>Complete Matrix</CardTitle>
                  <CardDescription>All variant and size combinations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="text-left p-2 text-sm font-medium text-muted-foreground">
                            Variant / Size
                          </th>
                          {buttonSizes.filter(s => s !== "icon").map((size) => (
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
                            <td className="p-2 text-sm font-medium">{variant}</td>
                            {buttonSizes.filter(s =>
                              s !== "icon"
                            ).map((size) => (
                              <td key={`${variant}-${size}`} className="p-3 text-center">
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
                      <p className="text-sm text-muted-foreground">bg-success, border-success</p>
                    </div>
                    <div className="p-4 rounded-lg bg-warning border border-warning">
                      <p className="text-warning font-medium">Warning State</p>
                      <p className="text-sm text-muted-foreground">bg-warning, border-warning</p>
                    </div>
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive">
                      <p className="text-destructive font-medium">Error State</p>
                      <p className="text-sm text-muted-foreground">bg-destructive/10</p>
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
                  <CardDescription>Placeholder components for loading states</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Default Skeleton</Label>
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
                    <Label className="text-xs text-muted-foreground">Shimmer Variant</Label>
                    <div className="flex items-center space-x-4">
                      <Skeleton variant="shimmer" className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton variant="shimmer" className="h-4 w-[250px]" />
                        <Skeleton variant="shimmer" className="h-4 w-[200px]" />
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Card Skeleton</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i}>
                          <CardContent className="pt-6 space-y-3">
                            <Skeleton variant="shimmer" className="h-32 w-full rounded-lg" />
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
                  <CardDescription>Progress indicators with optional glow effect</CardDescription>
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
                  <CardDescription>Loading indicators and pulse animations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-8 items-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">Spinner</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-primary animate-pulse-cyan" />
                      <span className="text-xs text-muted-foreground">Pulse Cyan</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs text-muted-foreground">Pulse</span>
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
              {/* Dialog */}
              <Card>
                <CardHeader>
                  <CardTitle>Dialog</CardTitle>
                  <CardDescription>Modal dialog for forms and confirmations</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>Open Dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Enhancement Settings</DialogTitle>
                        <DialogDescription>
                          Configure your image enhancement preferences.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="dialog-name">Image Name</Label>
                          <Input id="dialog-name" placeholder="Enter image name" />
                        </div>
                        <div className="space-y-2">
                          <Label>Enhancement Level</Label>
                          <Select defaultValue="pro">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="max">Max</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button>Save Changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              {/* Sheet */}
              <Card>
                <CardHeader>
                  <CardTitle>Sheet</CardTitle>
                  <CardDescription>Slide-out panel for navigation or settings</CardDescription>
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
                          <SheetDescription>Manage your account settings.</SheetDescription>
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
                  <CardDescription>Confirmation dialog for destructive actions</CardDescription>
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
                  <CardDescription>Container components with glass-morphism</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Default Card</CardTitle>
                        <CardDescription>Standard card component</CardDescription>
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
                  <CardDescription>Input fields and form controls</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="input-default">Default Input</Label>
                      <Input id="input-default" placeholder="Enter text..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="input-disabled">Disabled Input</Label>
                      <Input id="input-disabled" placeholder="Disabled" disabled />
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
                    <Label className="text-sm font-medium">Select / Dropdown</Label>
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
                  <CardDescription>Visual dividers for content sections</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Content above separator</p>
                  <Separator />
                  <p className="text-sm text-muted-foreground">Content below separator</p>
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
