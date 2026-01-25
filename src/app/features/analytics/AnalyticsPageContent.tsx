"use client";

import { AnalyticsDemo, FeatureCTA, FeatureDetails, FeatureHero } from "@/components/features";
import { LandingThemeProvider } from "@/components/landing-sections/context/LandingThemeContext";
import { FooterMinimal } from "@/components/landing-sections/footers/FooterMinimal";
import { spikeTheme } from "@/components/landing-sections/themes/spike-theme";
import { BarChart3, FileText, Globe, Lightbulb, Target, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Unified Dashboard",
    description:
      "See all your social media performance in one place. Compare metrics across platforms, identify trends, and spot growth opportunities.",
  },
  {
    icon: Lightbulb,
    title: "AI-Powered Insights",
    description:
      "Get actionable recommendations powered by AI. Understand why certain posts perform better and receive suggestions to improve.",
  },
  {
    icon: TrendingUp,
    title: "Growth Tracking",
    description:
      "Track follower growth, engagement trends, and reach over time. Set goals and monitor progress with visual progress indicators.",
  },
  {
    icon: Target,
    title: "Competitor Benchmarking",
    description:
      "Track how you stack up against competitors. Monitor their posting frequency, engagement rates, and content strategies.",
  },
  {
    icon: FileText,
    title: "Custom Reports",
    description:
      "Generate beautiful, shareable reports for stakeholders. Schedule automated weekly or monthly reports delivered to your inbox.",
  },
  {
    icon: BarChart3,
    title: "Content Performance Analysis",
    description:
      "Drill down into individual post performance. See what content types, topics, and formats drive the most engagement.",
  },
];

export function AnalyticsPageContent() {
  return (
    <LandingThemeProvider theme={spikeTheme}>
      <main className="min-h-screen">
        <FeatureHero
          badge="Analytics"
          headline="Insights That Drive Growth"
          description="Stop flying blind. Get deep performance insights across all your social platforms with AI-powered recommendations that actually move the needle."
          ctaText="See Your Analytics"
          ctaHref="/auth/signin"
          secondaryCta={{
            text: "Explore the Dashboard",
            href: "#demo",
          }}
        >
          <div id="demo">
            <AnalyticsDemo />
          </div>
        </FeatureHero>

        <FeatureDetails
          title="Data-Driven Decisions"
          subtitle="Everything you need to understand and optimize your social media performance"
          features={features}
        />

        <FeatureCTA
          headline="Ready to unlock your growth potential?"
          description="Join marketers using AI-powered analytics to make smarter decisions and grow faster than ever."
          primaryCta={{
            text: "See Your Analytics",
            href: "/auth/signin",
          }}
          secondaryCta={{
            text: "View Pricing",
            href: "/tokens",
          }}
        />

        <FooterMinimal />
      </main>
    </LandingThemeProvider>
  );
}
