"use client";

import { ComparisonTable } from "@/components/landing-sections/comparison/ComparisonTable";
import { LandingThemeProvider } from "@/components/landing-sections/context/LandingThemeContext";
import { CTAMinimalDark } from "@/components/landing-sections/cta/CTAMinimalDark";
import { FeatureCodeBlocks } from "@/components/landing-sections/features/FeatureCodeBlocks";
import { FooterMinimal } from "@/components/landing-sections/footers/FooterMinimal";
import { HeroPrecisionDark } from "@/components/landing-sections/heroes/HeroPrecisionDark";
import { linearTheme } from "@/components/landing-sections/themes/linear-theme";

export default function LinearLandingPage() {
  return (
    <LandingThemeProvider theme={linearTheme}>
      <main className="min-h-screen">
        <HeroPrecisionDark />
        <FeatureCodeBlocks />
        <ComparisonTable />
        <CTAMinimalDark />
        <FooterMinimal />
      </main>
    </LandingThemeProvider>
  );
}
