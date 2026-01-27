import {
  ABTestingSection,
  AIAutomationSection,
  EcosystemOverview,
  OrbitCTA,
  OrbitHero,
  PlatformConnections,
} from "@/components/orbit-landing";

/**
 * Spike Land Landing Page - Orbit Social Media Command Center
 *
 * Redesigned landing page showcasing the Orbit ecosystem
 * with minimalist micro-animations using Framer Motion.
 */

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950">
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
