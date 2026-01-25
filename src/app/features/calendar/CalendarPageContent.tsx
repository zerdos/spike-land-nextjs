"use client";

import { AICalendarDemo, FeatureCTA, FeatureDetails, FeatureHero } from "@/components/features";
import { LandingThemeProvider } from "@/components/landing-sections/context/LandingThemeContext";
import { FooterMinimal } from "@/components/landing-sections/footers/FooterMinimal";
import { spikeTheme } from "@/components/landing-sections/themes/spike-theme";
import { Calendar, CalendarClock, CalendarSearch, Clock, RefreshCw, Zap } from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "Intelligent Scheduling",
    description:
      "Our AI analyzes your audience behavior and engagement patterns to automatically suggest the optimal times for posting across all your platforms.",
  },
  {
    icon: Calendar,
    title: "Unified Content Queue",
    description:
      "Manage all your social accounts from one calendar. Drag and drop to reschedule, batch edit posts, and maintain a consistent publishing rhythm.",
  },
  {
    icon: RefreshCw,
    title: "Auto-Rescheduling",
    description:
      "When breaking news hits or a viral moment occurs, our AI can automatically reschedule your planned content to take advantage of the moment.",
  },
  {
    icon: CalendarSearch,
    title: "Content Gaps Detection",
    description:
      "Never run out of content. The AI identifies gaps in your schedule and suggests content ideas or reminds you to create new posts.",
  },
  {
    icon: Zap,
    title: "Quick Post Creation",
    description:
      "Create posts directly from the calendar. Our AI helps you write content that's optimized for each platform's best practices.",
  },
  {
    icon: CalendarClock,
    title: "Timezone Intelligence",
    description:
      "Schedule posts to reach audiences in different timezones. The AI handles the complexity of global posting schedules.",
  },
];

export function CalendarPageContent() {
  return (
    <LandingThemeProvider theme={spikeTheme}>
      <main className="min-h-screen">
        <FeatureHero
          badge="AI Calendar"
          headline="Smart Scheduling. Perfect Timing."
          description="Stop guessing when to post. Our AI analyzes your audience and finds the perfect times automatically. Schedule once, reach everyone at their peak engagement times."
          ctaText="Start Scheduling"
          ctaHref="/auth/signin"
          secondaryCta={{
            text: "See It In Action",
            href: "#demo",
          }}
        >
          <div id="demo">
            <AICalendarDemo />
          </div>
        </FeatureHero>

        <FeatureDetails
          title="Your Intelligent Publishing Partner"
          subtitle="Everything you need to maintain a perfect posting schedule"
          features={features}
        />

        <FeatureCTA
          headline="Ready to perfect your posting schedule?"
          description="Join marketers who never miss optimal posting times with AI-powered scheduling."
          primaryCta={{
            text: "Start Scheduling",
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
