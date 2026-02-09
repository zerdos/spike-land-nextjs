import {
  ABTestingSection,
  AIAutomationSection,
  BlogPreviewSection,
  EcosystemOverview,
  OrbitCTA,
  OrbitHero,
  PlatformConnections,
} from "@/components/orbit-landing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orbit - AI-Powered Social Media Command Center | Spike Land",
  description:
    "Orbit is your AI-powered social media command center. Schedule posts, run A/B tests, automate workflows, and track analytics across Instagram, Facebook, X, LinkedIn, and TikTok.",
  openGraph: {
    title: "Orbit - AI-Powered Social Media Command Center | Spike Land",
    description:
      "Orbit is your AI-powered social media command center. Schedule posts, run A/B tests, automate workflows, and track analytics.",
    type: "website",
  },
};

export default function OrbitLandingPage() {
  return (
    <main className="min-h-screen">
      <OrbitHero />
      <EcosystemOverview />
      <PlatformConnections />
      <AIAutomationSection />
      <ABTestingSection />
      <BlogPreviewSection />
      <OrbitCTA />
    </main>
  );
}
