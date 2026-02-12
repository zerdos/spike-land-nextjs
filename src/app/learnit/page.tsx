import { LearnItSearch } from "@/components/learnit/search";
import { TopicCard } from "@/components/learnit/topic-card";
import type { LearnItContent as LearnItContentType } from "@/generated/prisma";
import { getPopularContent, getRecentContent } from "@/lib/learnit/content-service";
import { Sparkles, TrendingUp, Clock, Star } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LearnItLanding() {
  let popular: LearnItContentType[] = [];
  let recent: LearnItContentType[] = [];

  try {
    [popular, recent] = await Promise.all([
      getPopularContent(6),
      getRecentContent(6),
    ]);
  } catch (error) {
    console.error("Failed to load LearnIt content:", error);
  }

  return (
    <div className="space-y-24 py-12 relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none -z-10 mix-blend-screen opacity-50" />
      <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none -z-10 mix-blend-screen opacity-30" />

      {/* Hero Section */}
      <section className="text-center space-y-8 relative z-10 max-w-5xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-emerald-400 backdrop-blur-md shadow-lg shadow-emerald-500/10 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Sparkles className="w-4 h-4" />
          <span className="font-semibold tracking-widest uppercase text-[10px]">AI-Powered Knowledge Base</span>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-white tracking-tighter leading-[0.95] animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
          Learn <span className="text-zinc-600">anything.</span>
          <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Instantly.
          </span>
        </h1>

        <p className="text-lg md:text-2xl text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          The wiki that writes itself. Search for any topic to generate a comprehensive, interactive tutorial in seconds.
        </p>

        <div className="pt-8 pb-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
          <LearnItSearch />

          {/* Trending Chips */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8 text-sm text-zinc-500">
            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Trending:</span>
            {["React", "Next.js", "TypeScript", "Machine Learning", "Python", "History", "Quantum Physics"].map(tag => (
              <Link
                key={tag}
                href={`/learnit/${tag.toLowerCase().replace(/\s+/g, '-')}`}
                className="px-3 py-1 rounded-full bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20 transition-all border border-white/5"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-20 container mx-auto px-4">
        {/* Popular Topics */}
        {popular.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
            <div className="flex items-center gap-2 mb-8">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <Star className="w-5 h-5" />
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Popular Topics</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popular.map((topic) => (
                <TopicCard
                  key={topic.id}
                  title={topic.title}
                  description={topic.description}
                  slug={topic.slug}
                  viewCount={topic.viewCount}
                />
              ))}
            </div>
          </section>
        )}

        {/* Featured Starter Topics */}
        <section>
          <div className="flex items-center gap-2 mb-8">
             <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Sparkles className="w-5 h-5" />
              </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Start Learning</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Programming", desc: "Master the art of code" },
              { title: "Machine Learning", desc: "Understand AI & Neural Networks" },
              { title: "World History", desc: "Explore the past" },
              { title: "Digital Design", desc: "Create beautiful interfaces" }
            ].map(item => (
              <TopicCard
                key={item.title}
                title={item.title}
                description={item.desc}
                slug={item.title.toLowerCase().replace(/\s+/g, "-")}
              />
            ))}
          </div>
        </section>

        {/* Recent Topics */}
        {recent.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-8">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Recently Added</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recent.map((topic) => (
                <TopicCard
                  key={topic.id}
                  title={topic.title}
                  description={topic.description}
                  slug={topic.slug}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
