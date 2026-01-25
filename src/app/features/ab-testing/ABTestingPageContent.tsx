"use client";

import { ABTestingDemo, FeatureCTA, FeatureDetails, FeatureHero } from "@/components/features";
import { LandingThemeProvider } from "@/components/landing-sections/context/LandingThemeContext";
import { FooterMinimal } from "@/components/landing-sections/footers/FooterMinimal";
import { spikeTheme } from "@/components/landing-sections/themes/spike-theme";
import { BarChart3, GitCompare, LineChart, Percent, Target, TrendingUp } from "lucide-react";

const features = [
  {
    icon: GitCompare,
    title: "AI Variation Generation",
    description:
      "Automatically generate multiple variations of your content with different tones, hooks, and CTAs to find what resonates best.",
  },
  {
    icon: Percent,
    title: "Statistical Significance",
    description:
      "Know exactly when you have a winner. Our engine calculates confidence intervals so you never make decisions on noise.",
  },
  {
    icon: Target,
    title: "Smart Traffic Allocation",
    description:
      "Automatically distribute audience between variants with multi-armed bandit algorithms that maximize engagement while testing.",
  },
  {
    icon: LineChart,
    title: "Real-Time Results",
    description:
      "Watch engagement metrics update live as your audience interacts. See likes, comments, shares, and click-through rates in real-time.",
  },
  {
    icon: TrendingUp,
    title: "Winner Auto-Scale",
    description:
      "Once a winner is found, automatically apply the winning variation to all future posts and platforms with one click.",
  },
  {
    icon: BarChart3,
    title: "Cross-Platform Testing",
    description:
      "Run the same test across Instagram, Twitter, LinkedIn, and TikTok simultaneously to find platform-specific winners.",
  },
];

export function ABTestingPageContent() {
  return (
    <LandingThemeProvider theme={spikeTheme}>
      <main className="min-h-screen">
        <FeatureHero
          badge="A/B Testing"
          headline="Test Everything. Know What Works."
          description="Stop guessing what content performs best. Run scientific experiments on your social media posts and let the data decide. Find winning variations with statistical confidence."
          ctaText="Start A/B Testing"
          ctaHref="/auth/signin"
          secondaryCta={{
            text: "See How It Works",
            href: "#demo",
          }}
        >
          <div id="demo">
            <ABTestingDemo />
          </div>
        </FeatureHero>

        <FeatureDetails
          title="Experiment with Confidence"
          subtitle="Everything you need to run data-driven social media experiments"
          features={features}
        />

        <FeatureCTA
          headline="Ready to find your winning content?"
          description="Use AI-powered A/B testing to maximize your social media ROI."
          primaryCta={{
            text: "Start A/B Testing",
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
