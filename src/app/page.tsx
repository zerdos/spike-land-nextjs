import { CTASection } from "@/components/landing/CTASection";
import {
  FeaturedAppCard,
  PlatformFeatures,
  PlatformHeader,
  PlatformHero,
} from "@/components/platform-landing";
import { Image as ImageIcon } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-grid-pattern">
      {/* Fixed Header */}
      <PlatformHeader />

      {/* Hero Section */}
      <PlatformHero />

      {/* Featured Apps Section */}
      <section id="apps" className="container mx-auto py-16 px-4">
        <div className="mx-auto max-w-4xl text-center mb-12">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Featured Applications
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Discover AI-powered apps built on Spike Land
          </p>
        </div>

        <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-3">
          <FeaturedAppCard
            name="Pixel"
            description="AI-powered image enhancement. Bring old, blurry photos back to life with advanced machine learning that restores details and clarity instantly."
            icon={<ImageIcon className="h-8 w-8" />}
            href="/apps/pixel"
            featured
          />
          {/* More apps coming soon */}
        </div>
      </section>

      {/* Platform Features */}
      <PlatformFeatures />

      {/* Final CTA Section */}
      <CTASection />
    </div>
  );
}
