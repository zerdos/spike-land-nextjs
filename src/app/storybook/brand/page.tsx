import { PixelLogo, SpikeLandLogo } from "@/components/brand";
import { logoSizes } from "@/components/storybook/constants";
import {
  AccessibilityPanel,
  ComponentSample,
  PageHeader,
  UsageGuide,
} from "@/components/storybook/Docs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function BrandPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader
        title="Brand Identity"
        description="The visual core of the spike.land design system, built on a foundation of digital precision and collaborative energy."
        usage="Built for spike.land • Version 1.2.0"
      />

      <UsageGuide
        dos={[
          "The AI Spark logo represents transformation and digital intelligence.",
          "Maintain clear space around the logo equivalent to the center spark size.",
          "Use the horizontal variant for navigation bars and wide headers.",
          "The stacked variant is optimized for centered hero sections.",
          "Use icon-only variants for avatars and mobile app splash screens.",
        ]}
      />

      <div className="grid grid-cols-1 gap-12 pt-8">
        {/* AI Spark Logo Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-heading tracking-tight flex items-center gap-2">
              <span className="w-2 h-6 bg-primary rounded-full" />
              AI Spark Logo
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              The primary symbol of our creative tools. A 3x3 grid representing pixel arrays, with a
              glowing core symbolizing the AI enhancement layer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ComponentSample
              title="Sizes & Scale"
              description="Universal logo sizes for varying contexts."
            >
              <div className="flex flex-wrap items-end gap-x-8 gap-y-6 p-4">
                {logoSizes.map((size) => (
                  <div key={size} className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-xl glass-1 glass-edge min-w-[80px] flex items-center justify-center">
                      <PixelLogo size={size} />
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] opacity-60">
                      {size}
                    </Badge>
                  </div>
                ))}
              </div>
            </ComponentSample>

            <ComponentSample
              title="Structural Variants"
              description="Layout options for different spatial requirements."
            >
              <div className="flex flex-col gap-4 w-full">
                <div className="flex items-center gap-6 p-4 rounded-xl glass-1 glass-edge">
                  <PixelLogo size="md" variant="horizontal" />
                  <Badge variant="secondary" className="ml-auto text-[10px]">HORIZONTAL</Badge>
                </div>
                <div className="flex items-center gap-6 p-4 rounded-xl glass-1 glass-edge">
                  <div className="h-12 w-12 flex items-center justify-center">
                    <PixelLogo size="lg" variant="icon" />
                  </div>
                  <Badge variant="secondary" className="ml-auto text-[10px]">ICON ONLY</Badge>
                </div>
                <div className="flex flex-col items-center gap-4 p-4 rounded-xl glass-1 glass-edge bg-gradient-to-br from-primary/5 to-accent/5">
                  <PixelLogo size="lg" variant="stacked" />
                  <Badge variant="secondary" className="text-[10px]">STACKED MARK</Badge>
                </div>
              </div>
            </ComponentSample>
          </div>
        </div>

        {/* Spike Land Logo Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-heading tracking-tight flex items-center gap-2">
              <span className="w-2 h-6 bg-warning rounded-full" />
              spike.land Platform Logo
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              The parent platform identity. Featuring a lightning bolt icon that represents the
              speed and energy of the underlying infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ComponentSample
              title="Platform Scale"
              description="Consistent sizing with the tool identity."
            >
              <div className="flex flex-wrap items-end gap-x-8 gap-y-6 p-4">
                {logoSizes.map((size) => (
                  <div key={size} className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-xl glass-1 glass-edge min-w-[80px] flex items-center justify-center">
                      <SpikeLandLogo size={size} />
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] opacity-60">
                      {size}
                    </Badge>
                  </div>
                ))}
              </div>
            </ComponentSample>

            <ComponentSample
              title="Platform Layouts"
              description="Optimized for different headers and banners."
            >
              <div className="flex flex-col gap-4 w-full">
                <div className="flex items-center gap-6 p-4 rounded-xl glass-1 glass-edge">
                  <SpikeLandLogo size="md" variant="horizontal" />
                  <Badge variant="secondary" className="ml-auto text-[10px]">HORIZONTAL</Badge>
                </div>
                <div className="flex items-center gap-6 p-4 rounded-xl glass-1 glass-edge bg-warning/5">
                  <SpikeLandLogo size="lg" variant="stacked" />
                  <Badge variant="secondary" className="ml-auto text-[10px]">STACKED</Badge>
                </div>
              </div>
            </ComponentSample>
          </div>
        </div>

        {/* User Identity - Avatars */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-heading tracking-tight flex items-center gap-2">
              <span className="w-2 h-6 bg-accent rounded-full" />
              User Identity
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Avatar systems for representing users and automated agents across the platform
              interface.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ComponentSample
              title="Dynamic Sizing"
              description="Scale from small indicators to large headers."
            >
              <div className="flex flex-wrap items-center gap-6 p-4">
                {[8, 10, 12, 16, 20].map((size) => (
                  <div key={size} className="flex flex-col items-center gap-2">
                    <Avatar className={`h-${size} w-${size} border-2 border-white/10`}>
                      <AvatarImage src="https://github.com/zerdos.png" alt="Z" />
                      <AvatarFallback>ZE</AvatarFallback>
                    </Avatar>
                    <span className="font-mono text-[9px] opacity-50 uppercase tracking-tighter">
                      H-{size}
                    </span>
                  </div>
                ))}
              </div>
            </ComponentSample>

            <ComponentSample
              title="Fallback States"
              description="Graceful degradation when images are unavailable."
            >
              <div className="flex flex-wrap items-center gap-6 p-4">
                <Avatar className="h-12 w-12 border-2 border-white/10">
                  <AvatarFallback className="bg-primary text-white text-xs">ZE</AvatarFallback>
                </Avatar>
                <Avatar className="h-12 w-12 border-2 border-white/10">
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-white text-xs font-bold">
                    SP
                  </AvatarFallback>
                </Avatar>
                <Avatar className="h-12 w-12 border-2 border-white/10">
                  <div className="h-full w-full flex items-center justify-center bg-secondary text-secondary-foreground">
                    <span className="text-[10px] font-bold">?</span>
                  </div>
                </Avatar>
                <div className="flex -space-x-4 items-center">
                  {[1, 2, 3].map((i) => (
                    <Avatar
                      key={i}
                      className="h-10 w-10 border-2 border-background ring-2 ring-white/5"
                    >
                      <AvatarFallback
                        className={`bg-secondary text-secondary-foreground text-[10px]`}
                      >
                        U{i}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  <div className="h-10 w-10 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 text-[10px] font-bold z-10 transition-transform hover:-translate-y-1">
                    +12
                  </div>
                </div>
              </div>
            </ComponentSample>
          </div>
        </div>
      </div>

      <AccessibilityPanel
        notes={[
          "All logos must maintain a contrast ratio of at least 3:1 against their backgrounds.",
          "Alt text for logos should be clear: 'spike.land AI Spark Logo' or 'spike.land Platform Identity'.",
          "Avatars should have descriptive alt text: 'User Profile - [Username]'.",
          "Initials fallbacks are generated with high-contrast color pairings for legibility.",
          "Interactive avatars include a 2-pixel focus ring for keyboard navigation.",
        ]}
      />
    </div>
  );
}
