import { LearnItSearch } from "@/components/learnit/search";
import { TopicCard } from "@/components/learnit/topic-card";
import type { LearnItContent as LearnItContentType } from "@/generated/prisma";
import { getPopularContent, getRecentContent } from "@/lib/learnit/content-service";

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
    // Proceed with empty lists to show the page shell at least
  }

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          Learn anything. <span className="text-primary">Instantly.</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          An interactive, AI-powered learning wiki that grows with you. Search for any topic to
          generate a comprehensive tutorial.
        </p>
        <div className="pt-4">
          <LearnItSearch />
        </div>
      </section>

      {/* Popular Topics */}
      {popular.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Popular Topics</h2>
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

      {/* Featured Starter Topics (Hardcoded for bootstrapping) */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Start Learning</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {["Programming", "Machine Learning", "History", "Design"].map(tag => (
            <TopicCard
              key={tag}
              title={tag}
              description={`Start your journey into ${tag}`}
              slug={tag.toLowerCase().replace(/\s+/g, "-")}
            />
          ))}
        </div>
      </section>

      {/* Recent Topics */}
      {recent.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Recently Added</h2>
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
  );
}
