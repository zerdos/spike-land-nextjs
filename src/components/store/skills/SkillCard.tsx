import { Badge } from "@/components/ui/badge";
import { Download, Star } from "lucide-react";
import Link from "next/link";

interface SkillCardProps {
  skill: {
    id: string;
    slug: string;
    displayName: string;
    description: string;
    category: string;
    color: string | null;
    installCount: number;
    isFeatured: boolean;
    tags: string[];
  };
}

export function SkillCard({ skill }: SkillCardProps) {
  const accentColor = skill.color ?? "#f59e0b";

  return (
    <Link href={`/store/skills/${skill.slug}`} className="group block">
      <div
        className="relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1"
      >
        {/* Color accent top border */}
        <div
          className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
          style={{ backgroundColor: accentColor }}
        />

        {/* Featured badge */}
        {skill.isFeatured && (
          <div className="absolute top-3 right-3">
            <Badge variant="warning" className="gap-1">
              <Star className="h-3 w-3" />
              Featured
            </Badge>
          </div>
        )}

        {/* Content */}
        <div className="mt-2 space-y-3">
          <h3 className="text-lg font-bold text-foreground group-hover:text-amber-400 transition-colors duration-300">
            {skill.displayName}
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {skill.description}
          </p>

          {/* Category + Stats */}
          <div className="flex items-center justify-between pt-2">
            <Badge variant="outline" className="text-xs">
              {skill.category}
            </Badge>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Download className="h-3 w-3" />
              <span>{skill.installCount.toLocaleString()}</span>
            </div>
          </div>

          {/* Tags */}
          {skill.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {skill.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-muted-foreground/60 bg-white/5 rounded-full px-2 py-0.5"
                >
                  {tag}
                </span>
              ))}
              {skill.tags.length > 3 && (
                <span className="text-xs text-muted-foreground/40">
                  +{skill.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
