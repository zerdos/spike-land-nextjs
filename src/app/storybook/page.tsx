import { storybookIconMap, storybookSections } from "@/components/storybook";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/components/ui/link";

export default function StorybookPage() {
  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="relative py-12 px-6 rounded-3xl overflow-hidden glass-1 border-white/5 shadow-glow-primary/5">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-accent/5 pointer-events-none" />
        <div className="relative z-10 text-center space-y-4">
          <h1 className="text-6xl md:text-8xl font-black font-heading mb-3 tracking-tighter bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent">
            System
          </h1>
          <p className="text-muted-foreground text-xl md:text-2xl font-medium max-w-2xl mx-auto leading-relaxed">
            spike.land design system & component library. <br />
            <span className="opacity-60 text-base font-normal">
              Building the future of AI-powered creative tools.
            </span>
          </p>
        </div>
      </div>

      {/* Section Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {storybookSections.map((section) => {
          const Icon = storybookIconMap[section.icon as keyof typeof storybookIconMap];

          return (
            <Link key={section.id} href={`/storybook/${section.id}`} className="block h-full group">
              <Card className="h-full border-white/0 hover:border-primary/20 hover:scale-[1.02] shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    {Icon && (
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-primary group-hover:bg-primary group-hover:text-white group-hover:shadow-glow-cyan transition-all duration-300">
                        <Icon className="h-6 w-6" />
                      </div>
                    )}
                    <CardTitle className="text-xl font-bold font-heading">
                      {section.label}
                    </CardTitle>
                  </div>
                  <CardDescription className="mt-4 leading-relaxed line-clamp-2">
                    {section.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="pt-12 border-t border-white/5 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-success" />
          Stable Version 1.2.0
        </div>
        <p className="text-sm text-muted-foreground/60">
          Built with precision for the Spike Land Platform © 2024
        </p>
      </div>
    </div>
  );
}
