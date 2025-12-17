/**
 * Marketing Personas Page
 *
 * Displays all 10 customer personas for Pixel AI Photo Enhancement.
 * Each persona has a deep link for easy sharing.
 */

import { getPrimaryPersonas, getSecondaryPersonas } from "@/lib/marketing/personas";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Customer Personas | Spike Land",
  description:
    "Marketing personas for Pixel AI Photo Enhancement - understand our target customers",
};

function PersonaCard({
  slug,
  name,
  tagline,
  emoji,
  platform,
  age,
  priority,
}: {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  platform: string;
  age: string;
  priority: "primary" | "secondary";
}) {
  return (
    <Link href={`/personas/${slug}`} className="block group">
      <div
        className={`
        relative overflow-hidden rounded-xl border p-6 transition-all duration-300
        hover:shadow-lg hover:scale-[1.02] hover:border-primary/50
        ${priority === "primary" ? "bg-primary/5 border-primary/20" : "bg-card border-border"}
      `}
      >
        {priority === "primary" && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
            Priority
          </div>
        )}

        <div className="flex items-start gap-4">
          <div className="text-4xl">{emoji}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
              &ldquo;{tagline}&rdquo;
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                {age}
              </span>
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                {platform}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function PersonasPage() {
  const primaryPersonas = getPrimaryPersonas();
  const secondaryPersonas = getSecondaryPersonas();

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Customer Personas</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Meet our 10 target customer personas for Pixel AI Photo Enhancement. Click any persona to
          see detailed insights.
        </p>
      </div>

      {/* Priority Personas */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-2">Priority Personas</h2>
        <p className="text-muted-foreground mb-6">
          These 3 personas should be targeted first due to higher social media engagement and viral
          potential.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {primaryPersonas.map((persona) => (
            <PersonaCard
              key={persona.id}
              slug={persona.slug}
              name={persona.name}
              tagline={persona.primaryHook}
              emoji={persona.emoji}
              platform={persona.demographics.platform}
              age={persona.demographics.age}
              priority={persona.priority}
            />
          ))}
        </div>
      </section>

      {/* Secondary Personas */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">Secondary Personas</h2>
        <p className="text-muted-foreground mb-6">
          Phase 2 expansion targets - great opportunities for broader reach.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {secondaryPersonas.map((persona) => (
            <PersonaCard
              key={persona.id}
              slug={persona.slug}
              name={persona.name}
              tagline={persona.primaryHook}
              emoji={persona.emoji}
              platform={persona.demographics.platform}
              age={persona.demographics.age}
              priority={persona.priority}
            />
          ))}
        </div>
      </section>

      {/* Share CTA */}
      <div className="mt-16 text-center p-8 bg-muted/50 rounded-xl">
        <h3 className="text-xl font-semibold mb-2">Share with your team</h3>
        <p className="text-muted-foreground mb-4">
          Each persona has a unique shareable link. Click on any persona to get its deep link.
        </p>
        <code className="text-sm bg-background px-4 py-2 rounded border">
          spike.land/personas/[persona-slug]
        </code>
      </div>
    </div>
  );
}
