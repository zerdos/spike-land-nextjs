import {
  BookOpen,
  CheckSquare,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import type { ComponentType } from "react";

interface SkillFeature {
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
}

interface SkillFeaturesProps {
  features: SkillFeature[];
}

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  MessageSquare,
  CheckSquare,
  Timer,
  ShieldCheck,
  BookOpen,
  Sparkles,
};

function getIcon(iconName: string): ComponentType<{ className?: string }> {
  return ICON_MAP[iconName] ?? Sparkles;
}

export function SkillFeatures({ features }: SkillFeaturesProps) {
  const sortedFeatures = [...features].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Features</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedFeatures.map((feature) => {
          const Icon = getIcon(feature.icon);

          return (
            <div
              key={feature.title}
              className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 rounded-lg bg-amber-500/10 p-2.5">
                  <Icon className="h-5 w-5 text-amber-400" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
