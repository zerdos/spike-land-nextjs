import { Badge } from "@/components/ui/badge";
import prisma from "@/lib/prisma";
import { Download, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function getSkills() {
  const skills = await prisma.skill.findMany({
    where: {
      isActive: true,
      status: "PUBLISHED",
    },
    include: {
      features: {
        orderBy: { sortOrder: "asc" },
      },
      _count: {
        select: { installations: true },
      },
    },
    orderBy: [
      { isFeatured: "desc" },
      { sortOrder: "asc" },
      { installCount: "desc" },
    ],
  });

  return skills;
}

function SkillCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 animate-pulse">
      <div className="h-6 w-3/4 bg-white/10 rounded mb-3" />
      <div className="h-4 w-full bg-white/10 rounded mb-2" />
      <div className="h-4 w-2/3 bg-white/10 rounded" />
    </div>
  );
}

function SkillCard({ skill }: {
  skill: {
    slug: string;
    displayName: string;
    description: string;
    category: string;
    color: string | null;
    installCount: number;
    isFeatured: boolean;
    tags: string[];
  };
}) {
  return (
    <Link
      href={`/store/skills/${skill.slug}`}
      className="group rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 block"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${skill.color || "#F59E0B"}20` }}
        >
          <Sparkles
            className="w-5 h-5"
            style={{ color: skill.color || "#F59E0B" }}
          />
        </div>
        {skill.isFeatured && (
          <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">
            Featured
          </Badge>
        )}
      </div>

      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
        {skill.displayName}
      </h3>

      <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
        {skill.description}
      </p>

      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="bg-white/10 text-zinc-300 text-xs">
          {skill.category}
        </Badge>
        <span className="text-xs text-zinc-500 flex items-center gap-1">
          <Download className="w-3 h-3" />
          {skill.installCount}
        </span>
      </div>
    </Link>
  );
}

async function SkillGrid() {
  const skills = await getSkills();
  const featured = skills.filter((s) => s.isFeatured);
  const rest = skills.filter((s) => !s.isFeatured);

  return (
    <>
      {featured.length > 0 && (
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            Featured Skills
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">All Skills</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        </section>
      )}

      {skills.length === 0 && (
        <div className="text-center py-20">
          <p className="text-zinc-500 text-lg">No skills available yet. Check back soon.</p>
        </div>
      )}
    </>
  );
}

export default function SkillStorePage() {
  return (
    <div className="text-white">
      {/* Hero */}
      <section className="py-24 border-b border-white/5">
        <div className="container mx-auto px-6 text-center max-w-3xl">
          <h1 className="text-5xl font-black mb-6 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Skill Store
          </h1>
          <p className="text-xl text-zinc-400 leading-relaxed">
            Browse and install Claude Code skills that enforce quality, automate workflows, and keep AI-generated code production-ready.
          </p>
        </div>
      </section>

      {/* Skills */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <Suspense
            fallback={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkillCardSkeleton key={i} />
                ))}
              </div>
            }
          >
            <SkillGrid />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
