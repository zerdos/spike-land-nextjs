"use client";

import { ComparisonTable } from "@/components/landing-sections/comparison/ComparisonTable";
import { LandingThemeProvider } from "@/components/landing-sections/context/LandingThemeContext";
import { FeatureGridCards } from "@/components/landing-sections/features/FeatureGridCards";
import { FooterMinimal } from "@/components/landing-sections/footers/FooterMinimal";
import { HeroBrutalistRaw } from "@/components/landing-sections/heroes/HeroBrutalistRaw";
import { SectionWrapper } from "@/components/landing-sections/shared/SectionWrapper";
import { brutalistTheme } from "@/components/landing-sections/themes/brutalist-theme";

export default function BrutalistLandingPage() {
  return (
    <LandingThemeProvider theme={brutalistTheme}>
      <main className="min-h-screen">
        <HeroBrutalistRaw />
        {/* Customized Brutalist Sections could go here, reusing generic ones for now */}
        <div className="border-b-4 border-black">
          <FeatureGridCards />
        </div>
        <div className="border-b-4 border-black bg-[var(--landing-secondary)]">
          <ComparisonTable />
        </div>

        <SectionWrapper className="bg-[var(--landing-primary)] text-white text-center py-24">
          <h2 className="text-6xl font-[var(--landing-heading-weight)] uppercase mb-8">
            JUST SHIP IT.
          </h2>
          <button className="bg-black text-white text-2xl font-bold px-12 py-6 border-4 border-white hover:bg-white hover:text-black transition-colors uppercase">
            Start Now
          </button>
        </SectionWrapper>

        <FooterMinimal />
      </main>
    </LandingThemeProvider>
  );
}
