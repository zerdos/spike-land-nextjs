import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, BookOpen, Eye } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TopicCardProps {
  title: string;
  description: string;
  slug: string;
  viewCount?: number;
}

const gradients = [
  "from-pink-500/20 to-rose-500/20 text-pink-400 border-pink-500/20",
  "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/20",
  "from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/20",
  "from-violet-500/20 to-purple-500/20 text-violet-400 border-violet-500/20",
  "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/20",
  "from-indigo-500/20 to-blue-500/20 text-indigo-400 border-indigo-500/20",
];

function getGradient(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export function TopicCard({ title, description, slug, viewCount }: TopicCardProps) {
  const gradientClass = getGradient(slug);

  return (
    <Link href={`/learnit/${slug}`} className="group block h-full">
      <Card variant="ghost" className="h-full bg-zinc-900/50 backdrop-blur-sm border border-white/5 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-900/20 hover:-translate-y-1 overflow-hidden relative">
        <div className={cn(
          "absolute top-0 right-0 w-32 h-32 bg-gradient-to-br rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl pointer-events-none",
          gradientClass.split(" ").slice(0, 2).join(" ") // Extract just the gradient colors
        )} />

        <CardContent className="p-6 flex flex-col h-full relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className={cn("p-3 rounded-xl bg-gradient-to-br border", gradientClass)}>
              <BookOpen className="w-6 h-6" />
            </div>
            {viewCount !== undefined && (
              <div className="flex items-center gap-1 text-xs font-medium text-zinc-500 bg-white/5 px-2 py-1 rounded-full">
                <Eye className="w-3 h-3" />
                <span>{Intl.NumberFormat('en-US', { notation: "compact" }).format(viewCount)}</span>
              </div>
            )}
          </div>

          <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-emerald-400 transition-colors">
            {title}
          </h3>

          <p className="text-sm text-zinc-400 line-clamp-2 mb-6 flex-grow">
            {description}
          </p>

          <div className="flex items-center text-sm font-medium text-emerald-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
            <span>Start learning</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
