"use client";

import { LandingThemeProvider } from "@/components/landing-sections/context/LandingThemeContext";
import { CTASplitScreen } from "@/components/landing-sections/cta/CTASplitScreen";
import { FeatureListAlternating } from "@/components/landing-sections/features/FeatureListAlternating";
import { FooterMinimal } from "@/components/landing-sections/footers/FooterMinimal";
import { HeroElegantProduct } from "@/components/landing-sections/heroes/HeroElegantProduct";
import { appleTheme } from "@/components/landing-sections/themes/apple-theme";

export default function AppleLandingPage() {
  return (
    <LandingThemeProvider theme={appleTheme}>
      <main className="min-h-screen">
        <HeroElegantProduct />
        <FeatureListAlternating />
        <CTASplitScreen />
        <FooterMinimal />
      </main>
    </LandingThemeProvider>
  );
}
