"use client";

import { LandingThemeProvider } from "@/components/landing-sections/context/LandingThemeContext";
import { CTAGradientBanner } from "@/components/landing-sections/cta/CTAGradientBanner";
import { FeatureBento } from "@/components/landing-sections/features/FeatureBento";
import { FooterMinimal } from "@/components/landing-sections/footers/FooterMinimal";
import { HeroCreativeMotion } from "@/components/landing-sections/heroes/HeroCreativeMotion";
import { framerTheme } from "@/components/landing-sections/themes/framer-theme";

export default function FramerLandingPage() {
  return (
    <LandingThemeProvider theme={framerTheme}>
      <main className="min-h-screen">
        <HeroCreativeMotion />
        <FeatureBento />
        <CTAGradientBanner />
        <FooterMinimal />
      </main>
    </LandingThemeProvider>
  );
}
