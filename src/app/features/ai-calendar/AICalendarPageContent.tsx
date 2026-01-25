"use client";

import { AICalendarDemo, FeatureCTA, FeatureDetails, FeatureHero } from "@/components/features";
import { LandingThemeProvider } from "@/components/landing-sections/context/LandingThemeContext";
import { FooterMinimal } from "@/components/landing-sections/footers/FooterMinimal";
import { spikeTheme } from "@/components/landing-sections/themes/spike-theme";
import { Bell, CalendarClock, CalendarDays, Clock, Sparkles, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Suggested Times",
    description:
      "Our AI analyzes your audience's behavior patterns to recommend the exact times when your content will get maximum engagement.",
  },
  {
    icon: CalendarDays,
    title: "Visual Content Planning",
    description:
      "See your entire content strategy at a glance. Drag and drop posts, plan campaigns, and maintain a consistent posting schedule.",
  },
  {
    icon: CalendarClock,
    title: "Auto-Scheduling",
    description:
      "Set it and forget it. Let AI automatically schedule your posts at optimal times across all platforms without manual intervention.",
  },
  {
    icon: TrendingUp,
    title: "Performance Heatmaps",
    description:
      "Visualize engagement patterns with color-coded heatmaps. Instantly see which times and days work best for your audience.",
  },
  {
    icon: Clock,
    title: "Time Zone Intelligence",
    description:
      "Reach global audiences at the right time. AI adjusts scheduling based on where your followers are located around the world.",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description:
      "Get notified about optimal posting windows, campaign deadlines, and engagement opportunities you might be missing.",
  },
];

export function AICalendarPageContent() {
  return (
    <LandingThemeProvider theme={spikeTheme}>
      <main className="min-h-screen">
        <FeatureHero
          badge="AI Calendar"
          headline="Never Miss the Perfect Moment"
          description="AI-powered content scheduling that learns when your audience is most active. Post at the perfect time, every time, and watch your engagement soar."
          ctaText="Optimize Your Schedule"
          ctaHref="/auth/signin"
          secondaryCta={{
            text: "See the Heatmap",
            href: "#demo",
          }}
        >
          <div id="demo">
            <AICalendarDemo />
          </div>
        </FeatureHero>

        <FeatureDetails
          title="Post at the Perfect Time"
          subtitle="Everything you need to optimize your posting schedule and maximize reach"
          features={features}
        />

        <FeatureCTA
          headline="Ready to boost your engagement?"
          description="Join marketers using AI to find the perfect posting times and increase their reach by up to 47%."
          primaryCta={{
            text: "Optimize Your Schedule",
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
