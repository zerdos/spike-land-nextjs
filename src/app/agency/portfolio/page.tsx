import { PortfolioCard } from "@/components/agency/portfolio-card";
import { getPortfolioItemsByCategory } from "@/lib/agency/portfolio-service";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio | SPIKE LAND AI Agency",
  description:
    "Explore our portfolio of AI-powered applications, rapid prototypes, and web development projects.",
};

const categoryInfo: Record<string, { title: string; description: string; }> = {
  AI_INTEGRATION: {
    title: "AI Integrations",
    description:
      "Applications enhanced with artificial intelligence and machine learning capabilities.",
  },
  PROTOTYPE: {
    title: "Rapid Prototypes",
    description:
      "Ideas brought to life in days, not months. Vibe-coded MVPs and proof-of-concepts.",
  },
  WEB_APP: {
    title: "Web Applications",
    description: "Full-stack web applications built with modern technologies.",
  },
  MOBILE_APP: {
    title: "Mobile Applications",
    description: "Native and cross-platform mobile apps for iOS and Android.",
  },
  OPEN_SOURCE: {
    title: "Open Source",
    description: "Community contributions and open-source tools.",
  },
};

export default async function PortfolioPage() {
  const itemsByCategory = await getPortfolioItemsByCategory();

  // Filter out empty categories and maintain order
  const orderedCategories = [
    "AI_INTEGRATION",
    "PROTOTYPE",
    "WEB_APP",
    "MOBILE_APP",
    "OPEN_SOURCE",
  ].filter(
    (cat) => itemsByCategory[cat as keyof typeof itemsByCategory]?.length > 0,
  );

  const hasItems = orderedCategories.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-16 md:py-24 border-b">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
            Our Work
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From AI-powered applications to rapid prototypes, explore what we've built for clients
            and as experiments.
          </p>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="py-16">
        <div className="container max-w-6xl mx-auto px-4">
          {hasItems
            ? (
              <div className="space-y-20">
                {orderedCategories.map((category) => {
                  const items = itemsByCategory[category as keyof typeof itemsByCategory];
                  const info = categoryInfo[category];

                  return (
                    <div key={category}>
                      <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-2">{info?.title ?? category}</h2>
                        <p className="text-muted-foreground">{info?.description}</p>
                      </div>

                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((item) => <PortfolioCard key={item.id} item={item} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
            : (
              <div className="text-center py-20">
                <p className="text-muted-foreground mb-4">
                  Portfolio items coming soon.
                </p>
                <p className="text-sm text-muted-foreground">
                  We're currently adding our best work. Check back soon!
                </p>
              </div>
            )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t bg-muted/30">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to build something amazing?</h2>
          <p className="text-muted-foreground mb-8">
            Let's discuss how we can help bring your vision to life.
          </p>
          <a
            href="/agency"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Get in Touch
          </a>
        </div>
      </section>
    </div>
  );
}
