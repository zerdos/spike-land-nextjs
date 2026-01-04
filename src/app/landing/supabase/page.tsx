"use client";

import { LandingThemeProvider } from "@/components/landing-sections/context/LandingThemeContext";
import { CTAMinimalDark } from "@/components/landing-sections/cta/CTAMinimalDark";
import { FeatureCodeBlocks } from "@/components/landing-sections/features/FeatureCodeBlocks";
import { FooterMinimal } from "@/components/landing-sections/footers/FooterMinimal";
import { HeroTechnicalGreen } from "@/components/landing-sections/heroes/HeroTechnicalGreen";
import { TestimonialCards } from "@/components/landing-sections/social-proof/TestimonialCards";
import { supabaseTheme } from "@/components/landing-sections/themes/supabase-theme";

export default function SupabaseLandingPage() {
  return (
    <LandingThemeProvider theme={supabaseTheme}>
      <main className="min-h-screen">
        <HeroTechnicalGreen />
        <FeatureCodeBlocks />
        <TestimonialCards />
        <CTAMinimalDark />
        <FooterMinimal />
      </main>
    </LandingThemeProvider>
  );
}
