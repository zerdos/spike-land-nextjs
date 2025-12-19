import { colorPalette, ColorSwatch, Section } from "@/components/storybook";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ColorsPage() {
  return (
    <div className="space-y-12">
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
            <CardDescription>Cyan glow utilities for emphasis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Button with glow */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">
                  Primary Button
                </Label>
                <Button className="shadow-glow-cyan">Primary Button</Button>
              </div>

              {/* Input with glow */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">
                  Text Input
                </Label>
                <Input placeholder="Text Input" className="input-glow-cyan" />
              </div>

              {/* Fuchsia glow button */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">
                  Fuchsia Glow
                </Label>
                <Button className="bg-[#FF00FF] hover:bg-[#FF00FF]/90 shadow-glow-fuchsia">
                  Fuchsia Button
                </Button>
              </div>

              {/* Gradient glow */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">
                  Gradient Glow
                </Label>
                <div className="h-10 rounded-xl gradient-cyan-fuchsia shadow-glow-gradient flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Gradient</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
