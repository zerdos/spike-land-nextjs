"use client";

import { LandingThemeProvider } from "@/components/landing-sections/context/LandingThemeContext";
import { CTAFloatingCard } from "@/components/landing-sections/cta/CTAFloatingCard";
import { FeatureBento } from "@/components/landing-sections/features/FeatureBento";
import { FooterMinimal } from "@/components/landing-sections/footers/FooterMinimal";
import { HeroColorfulPlayful } from "@/components/landing-sections/heroes/HeroColorfulPlayful";
import { TestimonialCards } from "@/components/landing-sections/social-proof/TestimonialCards";
import { figmaTheme } from "@/components/landing-sections/themes/figma-theme";

export default function FigmaLandingPage() {
  return (
    <LandingThemeProvider theme={figmaTheme}>
      <main className="min-h-screen">
        <HeroColorfulPlayful />
        <FeatureBento />
        <TestimonialCards />
        <CTAFloatingCard />
        <FooterMinimal />
      </main>
    </LandingThemeProvider>
  );
}
