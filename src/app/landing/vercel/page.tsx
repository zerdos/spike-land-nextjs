"use client";

import { ComparisonTable } from "@/components/landing-sections/comparison/ComparisonTable";
import { LandingThemeProvider } from "@/components/landing-sections/context/LandingThemeContext";
import { CTAGradientBanner } from "@/components/landing-sections/cta/CTAGradientBanner";
import { FeatureGridCards } from "@/components/landing-sections/features/FeatureGridCards";
import { FooterMinimal } from "@/components/landing-sections/footers/FooterMinimal";
import { HeroBoldDeveloper } from "@/components/landing-sections/heroes/HeroBoldDeveloper";
import { vercelTheme } from "@/components/landing-sections/themes/vercel-theme";

export default function VercelLandingPage() {
  return (
    <LandingThemeProvider theme={vercelTheme}>
      <main className="min-h-screen">
        <HeroBoldDeveloper />
        <FeatureGridCards />
        <ComparisonTable />
        <CTAGradientBanner />
        <FooterMinimal />
      </main>
    </LandingThemeProvider>
  );
}
