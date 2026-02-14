import { GlassCard } from "@/components/infographic/shared/GlassCard";
import { ScrollReveal } from "@/components/infographic/shared/ScrollReveal";
import type { LucideIcon } from "lucide-react";

interface Principle {
  id: number;
  title: string;
  oneLiner: string;
  color: string;
  icon: LucideIcon;
}

interface PrincipleCardProps {
  principle: Principle;
  index: number;
}

export function PrincipleCard({ principle, index }: PrincipleCardProps) {
  const Icon = principle.icon;

  return (
    <ScrollReveal delay={index * 0.1}>
      <GlassCard
        className="h-full p-6 flex flex-col gap-4 relative overflow-hidden group"
        hoverEffect
      >
        <div 
          className="absolute -right-4 -top-4 w-24 h-24 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"
          style={{ backgroundColor: principle.color }}
        />
        
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white shrink-0 shadow-lg"
            style={{ backgroundColor: principle.color }}
          >
            <Icon size={24} />
          </div>
          <div className="text-4xl font-black opacity-10 leading-none">
            {String(principle.id).padStart(2, '0')}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
            {principle.title}
          </h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            {principle.oneLiner}
          </p>
        </div>
      </GlassCard>
    </ScrollReveal>
  );
}
