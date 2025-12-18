import { storybookIconMap, storybookSections } from "@/components/storybook";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { Separator } from "@/components/ui/separator";

export default function StorybookPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-5xl md:text-6xl font-bold font-heading mb-3 tracking-tight">
          Design System
        </h1>
        <p className="text-muted-foreground text-xl md:text-2xl">
          Pixel Brand Guidelines & Component Library
        </p>
      </div>

      <Separator />

      {/* Section Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {storybookSections.map((section) => {
          const Icon = storybookIconMap[section.icon as keyof typeof storybookIconMap];

          return (
            <Link key={section.id} href={`/storybook/${section.id}`}>
              <Card className="h-full transition-all duration-200 hover:border-primary hover:shadow-glow-cyan cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {Icon && (
                      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                    )}
                    <CardTitle className="text-lg">{section.label}</CardTitle>
                  </div>
                  <CardDescription className="mt-2">{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
        <p>Pixel Design System v1.0</p>
        <p className="mt-1">Part of the Spike Land Platform</p>
      </div>
    </div>
  );
}
