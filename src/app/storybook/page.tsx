import { storybookIconMap, storybookSections } from "@/components/storybook";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/components/ui/link";

export default function StorybookPage() {
  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="relative py-8 px-6 rounded-2xl overflow-hidden glass-1 border-white/5 shadow-glow-primary/5">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-accent/5 pointer-events-none" />
        <div className="relative z-10 text-center space-y-3">
          <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent">
            spike.land
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-2xl mx-auto opacity-80 leading-snug">
            Design system & component library for AI-powered creative tools.
          </p>
        </div>
      </div>

      {/* Section Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {storybookSections.map((section) => {
          const Icon = storybookIconMap[section.icon as keyof typeof storybookIconMap];

          return (
            <Link key={section.id} href={`/storybook/${section.id}`} className="block group">
              <Card className="h-full border-white/0 hover:border-primary/20 hover:scale-[1.01] shadow-lg transition-all duration-300">
                <CardHeader className="p-5">
                  <div className="flex items-center gap-3">
                    {Icon && (
                      <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 text-primary group-hover:bg-primary group-hover:text-white group-hover:shadow-glow-cyan transition-all duration-300">
                        <Icon className="h-5 w-5" />
                      </div>
                    )}
                    <CardTitle className="text-lg font-bold font-heading">
                      {section.label}
                    </CardTitle>
                  </div>
                  <CardDescription className="mt-2.5 leading-relaxed line-clamp-2 text-xs">
                    {section.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="pt-8 border-t border-white/5 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-3">
          <div className="w-1 h-1 rounded-full bg-success" />
          Stable Version 1.2.0
        </div>
        <p className="text-xs text-muted-foreground/40">
          Built for Spike Land Platform © 2024
        </p>
      </div>
    </div>
  );
}
