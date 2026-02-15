"use client";

import { LandingThemeProvider } from "@/components/landing-sections/context/LandingThemeContext";
import { CTAMinimalDark } from "@/components/landing-sections/cta/CTAMinimalDark";
import { FeatureGridCards } from "@/components/landing-sections/features/FeatureGridCards";
import { FooterMinimal } from "@/components/landing-sections/footers/FooterMinimal";
import { HeroGamingFun } from "@/components/landing-sections/heroes/HeroGamingFun";
import { discordTheme } from "@/components/landing-sections/themes/discord-theme";

export default function DiscordLandingPage() {
  return (
    <LandingThemeProvider theme={discordTheme}>
      <main className="min-h-screen">
        <HeroGamingFun />
        <FeatureGridCards />
        <CTAMinimalDark />
        <FooterMinimal />
      </main>
    </LandingThemeProvider>
  );
}
