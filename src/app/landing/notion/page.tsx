"use client";

import { ComparisonTable } from "@/components/landing-sections/comparison/ComparisonTable";
import { LandingThemeProvider } from "@/components/landing-sections/context/LandingThemeContext";
import { FeatureListAlternating } from "@/components/landing-sections/features/FeatureListAlternating";
import { FooterMinimal } from "@/components/landing-sections/footers/FooterMinimal";
import { HeroWarmFriendly } from "@/components/landing-sections/heroes/HeroWarmFriendly";
import { notionTheme } from "@/components/landing-sections/themes/notion-theme";

export default function NotionLandingPage() {
  return (
    <LandingThemeProvider theme={notionTheme}>
      <main className="min-h-screen">
        <HeroWarmFriendly />
        <FeatureListAlternating />
        <ComparisonTable />
        <div className="py-24 text-center">
          <h2 className="text-4xl font-bold mb-6">Write, plan, and ship.</h2>
          <button className="bg-[var(--landing-accent)] text-white px-6 py-3 rounded-[var(--landing-radius)] font-bold">
            Get Started
          </button>
        </div>
        <FooterMinimal />
      </main>
    </LandingThemeProvider>
  );
}
