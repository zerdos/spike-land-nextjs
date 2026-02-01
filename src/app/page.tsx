import {
  ABTestingSection,
  AIAutomationSection,
  EcosystemOverview,
  OrbitCTA,
  OrbitHero,
  PlatformConnections,
} from "@/components/orbit-landing";

import {
  AgencyHero,
  CredibilitySection,
  PortfolioSection,
  ServicesSection,
} from "@/components/agency-landing";

/**
 * Spike Land Landing Page
 *
 * Combined landing page showcasing:
 * 1. AI Development Agency services (freelance/consulting)
 * 2. Orbit Social Media Command Center product
 *
 * Using minimalist micro-animations with Framer Motion.
 */

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950">
      {/* ============================================ */}
      {/* AI AGENCY SECTION - Freelance/Consulting    */}
      {/* ============================================ */}

      {/* Agency Hero - "Ship AI-Powered Products. Fast." */}
      <AgencyHero />

      {/* Services - What we build */}
      <ServicesSection />

      {/* Portfolio - Proof of work */}
      <PortfolioSection />

      {/* Credibility - Experience & trust */}
      <CredibilitySection />

      {/* ============================================ */}
      {/* DIVIDER                                     */}
      {/* ============================================ */}
      <div className="relative py-16">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-zinc-950 px-6 text-sm text-zinc-500">Our Flagship Product</span>
        </div>
      </div>

      {/* ============================================ */}
      {/* ORBIT PRODUCT SECTION                       */}
      {/* ============================================ */}

      {/* Hero Section - "Your Social Command Center" */}
      <OrbitHero />

      {/* Platform Connections - Show supported platforms */}
      <PlatformConnections />

      {/* AI Automation - Relay drafts + Allocator autopilot */}
      <AIAutomationSection />

      {/* A/B Testing & Analytics - Pulse monitoring */}
      <ABTestingSection />

      {/* Ecosystem Overview - Bento grid of all features */}
      <EcosystemOverview />

      {/* Final CTA - Sign up prompt */}
      <OrbitCTA />
    </main>
  );
}
