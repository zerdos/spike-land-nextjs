"use client";

import { AccessibilityPanel, ComponentSample, PageHeader } from "@/components/storybook";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function TypographyPage() {
  return (
    <div className="space-y-20 pb-20">
      <PageHeader
        title="Typography"
        description="Our typography system is designed for maximum legibility across all creative workflows. We use Montserrat for high-impact headings and Geist Sans for precise body content."
        usage="Use the .font-heading class for titles and .font-sans for general UI text. Ensure sufficient contrast by following our semantic text color guidelines."
      />

      {/* Font Stack */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold font-heading">The Font Stack</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="glass-1">
            <CardContent className="pt-8 space-y-6">
              <div className="flex justify-between items-center">
                <Label className="uppercase text-[10px] tracking-widest font-black opacity-60">
                  Heading Typeface
                </Label>
                <Badge variant="secondary">Montserrat</Badge>
              </div>
              <h3 className="text-5xl font-black font-heading leading-tight bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent">
                Creative Precision.
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Montserrat is used for all major headings. Its geometric nature provides a modern,
                high-tech aesthetic that aligns with our AI-driven core.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-1">
            <CardContent className="pt-8 space-y-6">
              <div className="flex justify-between items-center">
                <Label className="uppercase text-[10px] tracking-widest font-black opacity-60">
                  Interface Typeface
                </Label>
                <Badge variant="outline">Geist Sans</Badge>
              </div>
              <p className="text-3xl font-sans font-medium leading-tight">
                Crafted for clarity in every pixel.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Geist Sans is our primary interface font. It excels in small sizes and provides the
                technical clarity needed for complex toolbars and data displays.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Heading Scale */}
      <section className="space-y-8 pt-10 border-t border-white/5">
        <h2 className="text-3xl font-bold font-heading">The Scale</h2>
        <div className="space-y-12">
          <div className="space-y-4">
            <Label className="uppercase text-[10px] tracking-[0.2em] font-black opacity-40">
              Display Scale
            </Label>
            <div className="space-y-8">
              <div className="group">
                <span className="text-xs font-mono text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  h1 / 60px / 700
                </span>
                <h1 className="text-6xl font-black font-heading tracking-tighter">
                  Ultimate Enhancement.
                </h1>
              </div>
              <div className="group">
                <span className="text-xs font-mono text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  h2 / 48px / 700
                </span>
                <h2 className="text-5xl font-bold font-heading tracking-tight">
                  System Performance.
                </h2>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-8">
            <Label className="uppercase text-[10px] tracking-[0.2em] font-black opacity-40">
              Section Scale
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <div className="group flex flex-col pt-4 border-t border-white/5">
                  <span className="text-[10px] font-mono text-primary mb-2">
                    h3 / 30px / 600
                  </span>
                  <h3 className="text-3xl font-semibold font-heading">
                    Core Components
                  </h3>
                </div>
                <div className="group flex flex-col pt-4 border-t border-white/5">
                  <span className="text-[10px] font-mono text-primary mb-2">
                    h4 / 24px / 600
                  </span>
                  <h4 className="text-2xl font-semibold font-heading">
                    Interactive Elements
                  </h4>
                </div>
              </div>
              <div className="space-y-4">
                <div className="group flex flex-col pt-4 border-t border-white/5">
                  <span className="text-[10px] font-mono text-primary mb-2">
                    h5 / 20px / 500
                  </span>
                  <h5 className="text-xl font-medium font-heading">
                    Status Indicators
                  </h5>
                </div>
                <div className="group flex flex-col pt-4 border-t border-white/5">
                  <span className="text-[10px] font-mono text-primary mb-2">
                    h6 / 16px / 500
                  </span>
                  <h6 className="text-base font-medium font-heading">
                    Inline Meta Data
                  </h6>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Semantic Colors */}
      <section className="space-y-8 pt-10 border-t border-white/5">
        <h2 className="text-3xl font-bold font-heading">Semantic Hierarchy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <ComponentSample
            title="Content Colors"
            description="Using opacity and hues to denote importance."
          >
            <div className="space-y-4">
              <p className="text-xl font-bold">Primary Foreground</p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Secondary Foreground (Muted) - Used for descriptions and supporting text to reduce
                visual noise.
              </p>
              <p className="text-sm font-mono text-primary">
                Accent Class - Used for actionable links or key highlights.
              </p>
            </div>
          </ComponentSample>

          <ComponentSample
            title="State Colors"
            description="WCAG AA compliant semantic messaging."
          >
            <div className="space-y-2">
              <p className="text-success font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success inline-block" />{" "}
                System ready for deployment.
              </p>
              <p className="text-warning font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning inline-block" /> Token balance low.
              </p>
              <p className="text-destructive font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive inline-block" />{" "}
                Critical engine failure.
              </p>
            </div>
          </ComponentSample>
        </div>
      </section>

      <AccessibilityPanel
        notes={[
          "All headings strictly follow a descending scale (h1 -> h6).",
          "Line heights (leading) are optimized for each font size for readability.",
          "Foreground and Primary text colors pass 4.5:1 contrast ratio against the background.",
          "Destructive text colors pass 4.5:1 contrast against both light and dark backgrounds.",
          "Letter spacing (tracking) adjusted for better legibility at different weights.",
        ]}
      />
    </div>
  );
}
