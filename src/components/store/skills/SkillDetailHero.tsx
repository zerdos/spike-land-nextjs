import { Badge } from "@/components/ui/badge";
import { Download, Tag, User } from "lucide-react";

interface SkillDetailHeroProps {
  skill: {
    displayName: string;
    description: string;
    category: string;
    version: string;
    installCount: number;
    color: string | null;
    authorName: string;
    authorUrl: string | null;
  };
}

export function SkillDetailHero({ skill }: SkillDetailHeroProps) {
  const accentColor = skill.color ?? "#f59e0b";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 md:p-12">
      {/* Gradient background accent */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(ellipse at top left, ${accentColor}, transparent 60%)`,
        }}
      />

      <div className="relative z-10 space-y-6">
        {/* Title */}
        <h1 className="text-5xl font-black tracking-tight text-foreground">
          {skill.displayName}
        </h1>

        {/* Description */}
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          {skill.description}
        </p>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="gap-1">
            <Tag className="h-3 w-3" />
            {skill.category}
          </Badge>

          <Badge variant="secondary" className="gap-1">
            v{skill.version}
          </Badge>

          <Badge variant="default" className="gap-1">
            <Download className="h-3 w-3" />
            {skill.installCount.toLocaleString()} installs
          </Badge>
        </div>

        {/* Author */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>by</span>
          {skill.authorUrl ? (
            <a
              href={skill.authorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 underline underline-offset-4 transition-colors"
            >
              {skill.authorName}
            </a>
          ) : (
            <span className="text-foreground font-medium">{skill.authorName}</span>
          )}
        </div>
      </div>
    </section>
  );
}
