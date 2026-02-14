import { Badge } from "@/components/ui/badge";
import prisma from "@/lib/prisma";
import {
  BookOpen,
  CheckSquare,
  Download,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Timer,
  User,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { InstallButton } from "./install-button";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getSkill(slug: string) {
  return prisma.skill.findFirst({
    where: {
      slug,
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
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const skill = await getSkill(slug);

  if (!skill) {
    return { title: "Skill Not Found | Spike Land" };
  }

  return {
    title: `${skill.displayName} | Skill Store | Spike Land`,
    description: skill.description,
  };
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  CheckSquare,
  Timer,
  ShieldCheck,
  BookOpen,
};

function FeatureIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICON_MAP[name]) || Sparkles;
  return <Icon className={className} />;
}

export default async function SkillDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const skill = await getSkill(slug);

  if (!skill) {
    notFound();
  }

  const installCommand = `claude skill add spike-land/${skill.slug}`;

  return (
    <div className="text-white">
      {/* Breadcrumb */}
      <div className="container mx-auto px-6 pt-8">
        <nav className="text-sm text-zinc-500">
          <Link href="/store/skills" className="hover:text-white transition-colors">
            Skill Store
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">{skill.displayName}</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="py-16 border-b border-white/5">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="flex items-start gap-6 mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${skill.color || "#F59E0B"}20` }}
            >
              <Sparkles
                className="w-8 h-8"
                style={{ color: skill.color || "#F59E0B" }}
              />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black mb-3">
                {skill.displayName}
              </h1>
              <p className="text-xl text-zinc-400 leading-relaxed">
                {skill.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Badge variant="secondary" className="bg-white/10 text-zinc-300">
              {skill.category}
            </Badge>
            <Badge variant="outline" className="border-white/20 text-zinc-400">
              v{skill.version}
            </Badge>
            <span className="text-sm text-zinc-500 flex items-center gap-1">
              <Download className="w-4 h-4" />
              {skill.installCount} installs
            </span>
            <span className="text-sm text-zinc-500 flex items-center gap-1">
              <User className="w-4 h-4" />
              {skill.authorUrl
                ? (
                  <a
                    href={skill.authorUrl}
                    className="hover:text-white transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {skill.author}
                  </a>
                )
                : skill.author}
            </span>
            {skill.repoUrl && (
              <a
                href={skill.repoUrl}
                className="text-sm text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
                Source
              </a>
            )}
          </div>

          {skill.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skill.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      {skill.features.length > 0 && (
        <section className="py-16 border-b border-white/5">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl font-bold mb-8">What you get</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {skill.features.map((feature) => (
                <div
                  key={feature.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-6"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${skill.color || "#F59E0B"}15` }}
                  >
                    <FeatureIcon
                      name={feature.icon}
                      className="w-5 h-5"
                    />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-zinc-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Installation */}
      <section className="py-16 border-b border-white/5">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="text-2xl font-bold mb-8">Installation</h2>

          {/* Terminal mockup */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 shadow-2xl font-mono text-sm text-slate-300 mb-8">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/50 border-b border-slate-800">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="ml-2 text-xs text-slate-500">Terminal</div>
            </div>
            <div className="p-4">
              <div className="flex gap-2">
                <span className="text-emerald-500">$</span>
                <span className="text-white">{installCommand}</span>
              </div>
            </div>
          </div>

          <InstallButton skillId={skill.id} skillSlug={skill.slug} />
        </div>
      </section>

      {/* Long description */}
      {skill.longDescription && (
        <section className="py-16 border-b border-white/5">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl font-bold mb-8">About</h2>
            <div className="prose prose-invert prose-zinc max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {skill.longDescription}
              </ReactMarkdown>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-6 text-center max-w-2xl">
          <div className="bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-white/10 rounded-3xl p-12 backdrop-blur-xl">
            <h2 className="text-3xl font-black mb-4">Ready to ship with confidence?</h2>
            <p className="text-lg text-zinc-400 mb-8">
              Install {skill.displayName} and enforce quality gates in your AI-assisted workflow.
            </p>
            <InstallButton skillId={skill.id} skillSlug={skill.slug} />
          </div>
        </div>
      </section>
    </div>
  );
}
