"use client";

import { LandingThemeProvider } from "@/components/landing-sections/context/LandingThemeContext";
import { CTAGradientBanner } from "@/components/landing-sections/cta/CTAGradientBanner";
import { FeatureGridCards } from "@/components/landing-sections/features/FeatureGridCards";
import { FooterMinimal } from "@/components/landing-sections/footers/FooterMinimal";
import { HeroGradientWave } from "@/components/landing-sections/heroes/HeroGradientWave";
import { TestimonialCards } from "@/components/landing-sections/social-proof/TestimonialCards";
import { stripeTheme } from "@/components/landing-sections/themes/stripe-theme";

export default function StripeLandingPage() {
  return (
    <LandingThemeProvider theme={stripeTheme}>
      <main className="min-h-screen">
        <HeroGradientWave />
        <FeatureGridCards />
        <TestimonialCards />
        <CTAGradientBanner />
        <FooterMinimal />
      </main>
    </LandingThemeProvider>
  );
}
