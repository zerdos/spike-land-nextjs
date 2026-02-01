import type { Metadata } from "next";
import {
  ABTestingSection,
  AIAutomationSection,
  BlogPreviewSection,
  EcosystemOverview,
  OrbitCTA,
  OrbitHero,
  PlatformConnections,
} from "@/components/orbit-landing";
import { LandingPageStructuredData } from "@/components/seo/LandingPageStructuredData";

/**
 * Spike Land Landing Page - Orbit Social Media Command Center
 *
 * Redesigned landing page showcasing the Orbit ecosystem
 * with minimalist micro-animations using Framer Motion.
 */

export const metadata: Metadata = {
  title: "Spike Land - The #1 AI Agency & Automation Platform",
  description:
    "Scale your business with Spike Land's AI Agency solutions. Automate social media, streamline workflows, and deploy intelligent AI agents to grow your brand 24/7.",
  keywords: [
    "AI Agency",
    "AI Automation Agency",
    "Social Media Automation",
    "AI Agents",
    "Marketing Automation",
    "Business Scaling",
    "Workflow Automation",
    "Spike Land",
  ],
  openGraph: {
    title: "Spike Land - The #1 AI Agency & Automation Platform",
    description:
      "Scale your business with Spike Land's AI Agency solutions. Automate social media, streamline workflows, and deploy intelligent AI agents to grow your brand 24/7.",
    type: "website",
    siteName: "Spike Land",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spike Land - The #1 AI Agency & Automation Platform",
    description:
      "Scale your business with Spike Land's AI Agency solutions. Automate social media, streamline workflows, and deploy intelligent AI agents to grow your brand 24/7.",
  },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950">
      <LandingPageStructuredData />

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

      {/* Blog Preview - Latest updates */}
      <BlogPreviewSection />

      {/* Final CTA - Sign up prompt */}
      <OrbitCTA />
    </main>
  );
}
