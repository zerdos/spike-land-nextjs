import { BeforeAfterGallery } from "@/components/landing/BeforeAfterGallery";
import { CTASection } from "@/components/landing/CTASection";
import { FAQ } from "@/components/landing/FAQ";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { HeroSectionWithData } from "@/components/landing/HeroSectionWithData";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pixel - AI Image Enhancement | Spike Land",
  description:
    "Enhance your photos in seconds with AI. Transform low-resolution images into stunning high-quality photos with Pixel's advanced AI enhancement technology.",
  openGraph: {
    title: "Pixel - AI Image Enhancement | Spike Land",
    description:
      "Enhance your photos in seconds with AI. Transform low-resolution images into stunning high-quality photos.",
    type: "website",
  },
};

export default function PixelLandingPage() {
  return (
    <main className="min-h-screen bg-grid-pattern">
      <HeroSectionWithData />
      <BeforeAfterGallery />
      <FeatureShowcase />
      <FAQ />
      <CTASection />
    </main>
  );
}
