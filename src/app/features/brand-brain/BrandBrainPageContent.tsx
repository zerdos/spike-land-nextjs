"use client";

import { BrandBrainDemo, FeatureCTA, FeatureDetails, FeatureHero } from "@/components/features";
import { LandingThemeProvider } from "@/components/landing-sections/context/LandingThemeContext";
import { FooterMinimal } from "@/components/landing-sections/footers/FooterMinimal";
import { spikeTheme } from "@/components/landing-sections/themes/spike-theme";
import { BookOpen, FileCheck, Layers, RefreshCw, Shield, Sparkles } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Voice Learning Engine",
    description:
      "Feed Brand Brain your existing content and it learns your unique voice. The more it learns, the better it gets at sounding like you.",
  },
  {
    icon: RefreshCw,
    title: "Instant Tone Adjustment",
    description:
      "Fine-tune your brand voice with intuitive sliders. Adjust formality, friendliness, wit, and boldness to match any context.",
  },
  {
    icon: FileCheck,
    title: "Content Review & Rewrite",
    description:
      "Paste any content and Brand Brain analyzes it against your brand guidelines, suggesting improvements or rewriting to match your voice.",
  },
  {
    icon: Shield,
    title: "Brand Guardrails",
    description:
      "Set up content guardrails to prevent off-brand messaging. Define topics to avoid, competitor mentions, and compliance requirements.",
  },
  {
    icon: Layers,
    title: "Multi-Platform Adaptation",
    description:
      "Automatically adapt tone for different platforms while maintaining brand consistency - professional for LinkedIn, casual for Twitter.",
  },
  {
    icon: BookOpen,
    title: "Style Guide Integration",
    description:
      "Upload your brand guidelines and style guide. Brand Brain learns your specific rules, terminology, and do's and don'ts.",
  },
];

export function BrandBrainPageContent() {
  return (
    <LandingThemeProvider theme={spikeTheme}>
      <main className="min-h-screen">
        <FeatureHero
          badge="Brand Voice AI"
          headline="AI That Speaks Your Brand"
          description="Train AI to understand your unique brand voice. Every piece of content matches your tone, style, and personality - automatically. Never sound off-brand again."
          ctaText="Train Your Brand Brain"
          ctaHref="/auth/signin"
          secondaryCta={{
            text: "See It In Action",
            href: "#demo",
          }}
        >
          <div id="demo">
            <BrandBrainDemo />
          </div>
        </FeatureHero>

        <FeatureDetails
          title="Your Brand, Amplified"
          subtitle="Everything you need to maintain consistent, on-brand communication at scale"
          features={features}
        />

        <FeatureCTA
          headline="Ready to scale your brand voice?"
          description="Join brands using AI to maintain perfect consistency across every piece of content, on every platform."
          primaryCta={{
            text: "Train Your Brand Brain",
            href: "/auth/signin",
          }}
          secondaryCta={{
            text: "View Pricing",
            href: "/tokens",
          }}
        />

        <FooterMinimal />
      </main>
    </LandingThemeProvider>
  );
}
